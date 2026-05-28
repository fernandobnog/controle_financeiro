import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

import type {
  AccountRole,
  AuthMessage,
  AuthenticatedUser,
  PasswordRecoveryRequestResult,
  RegisterInput,
  Session
} from '@controle-financeiro/shared-contracts';
import { authMessageSchema, passwordRecoveryRequestResultSchema, sessionSchema } from '@controle-financeiro/shared-contracts';
import type { FastifyRequest } from 'fastify';

import { getDatabasePool, queryDatabase } from '../../infra/db/database.js';

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 12;
const PASSWORD_RESET_TTL_MINUTES = 30;
const DEFAULT_AUTH_SECRET = 'controle-financeiro-dev-secret';

interface UserRow {
  id: string;
  account_id: string;
  email: string;
  full_name: string;
  role: AccountRole;
  password_hash: string;
  password_salt: string;
}

interface PasswordResetTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string | Date;
  used_at: string | Date | null;
}

export class DuplicateEmailError extends Error {}
export class InvalidCurrentPasswordError extends Error {}
export class InvalidPasswordRecoveryTokenError extends Error {}

interface AccessTokenPayload {
  sub: string;
  accountId: string;
  email: string;
  fullName: string;
  role: AccountRole;
  exp: number;
}

export interface AuthContext {
  userId: string;
  accountId: string;
  email: string;
  fullName: string;
  role: AccountRole;
}

type RequestWithAuth = FastifyRequest & {
  authContext?: AuthContext;
};

const getAuthSecret = (): string => {
  if (process.env.APP_AUTH_SECRET) {
    return process.env.APP_AUTH_SECRET;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('APP_AUTH_SECRET deve ser configurado em producao.');
  }

  return DEFAULT_AUTH_SECRET;
};

const buildAccessTokenPayload = (user: AuthenticatedUser, expiresAt: Date): AccessTokenPayload => ({
  sub: user.id,
  accountId: user.accountId,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  exp: Math.floor(expiresAt.getTime() / 1000)
});

const parseAuthenticatedUser = (row: UserRow): AuthenticatedUser => ({
  id: row.id,
  accountId: row.account_id,
  email: row.email,
  fullName: row.full_name,
  role: row.role
});

const createPasswordSalt = (userId: string): string => `${userId}-${randomBytes(8).toString('hex')}`;

const hashPasswordRecoveryToken = (token: string): string =>
  createHmac('sha256', getAuthSecret()).update(token).digest('hex');

const buildAuthMessage = (message: string): AuthMessage => authMessageSchema.parse({ message });

const findUserByEmail = async (email: string): Promise<UserRow | null> => {
  const result = await queryDatabase<UserRow>(
    `
      SELECT id, account_id, email, full_name, role, password_hash, password_salt
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email.trim().toLowerCase()]
  );

  return result.rows[0] ?? null;
};

const findUserById = async (userId: string): Promise<UserRow | null> => {
  const result = await queryDatabase<UserRow>(
    `
      SELECT id, account_id, email, full_name, role, password_hash, password_salt
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] ?? null;
};

const updateUserPassword = async (userId: string, newPassword: string): Promise<void> => {
  const passwordSalt = createPasswordSalt(userId);
  const passwordHash = createPasswordHash(newPassword, passwordSalt);

  await queryDatabase(
    `
      UPDATE users
      SET password_hash = $1, password_salt = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `,
    [passwordHash, passwordSalt, userId]
  );
};

export const createPasswordHash = (password: string, salt: string): string =>
  scryptSync(password, salt, 64).toString('hex');

export const verifyPasswordHash = (password: string, salt: string, storedHash: string): boolean => {
  const candidateHash = createPasswordHash(password, salt);
  const candidateBuffer = Buffer.from(candidateHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (candidateBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(candidateBuffer, storedBuffer);
};

export const createAccessToken = (user: AuthenticatedUser, expiresAt: Date): string => {
  const payload = buildAccessTokenPayload(user, expiresAt);
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', getAuthSecret()).update(encodedPayload).digest('base64url');

  return `${encodedPayload}.${signature}`;
};

const createSessionForUser = (user: AuthenticatedUser): Session => {
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000);

  return sessionSchema.parse({
    accessToken: createAccessToken(user, expiresAt),
    expiresAt: expiresAt.toISOString(),
    user
  });
};

export const readBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

const parseTokenPayload = (token: string): AccessTokenPayload | null => {
  const [encodedPayload, receivedSignature] = token.split('.');

  if (!encodedPayload || !receivedSignature) {
    return null;
  }

  const expectedSignature = createHmac('sha256', getAuthSecret()).update(encodedPayload).digest('base64url');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const receivedBuffer = Buffer.from(receivedSignature, 'utf8');

  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as AccessTokenPayload;

    if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

export const verifyAccessToken = (token: string): AuthContext | null => {
  const payload = parseTokenPayload(token);

  if (!payload) {
    return null;
  }

  return {
    userId: payload.sub,
    accountId: payload.accountId,
    email: payload.email,
    fullName: payload.fullName,
    role: payload.role
  };
};

export const authenticateUser = async (email: string, password: string): Promise<Session | null> => {
  const userRow = await findUserByEmail(email);

  if (!userRow || !verifyPasswordHash(password, userRow.password_salt, userRow.password_hash)) {
    return null;
  }

  return createSessionForUser(parseAuthenticatedUser(userRow));
};

export const registerUser = async (input: RegisterInput): Promise<Session> => {
  const email = input.email.trim().toLowerCase();
  const existingUserResult = await queryDatabase<Pick<UserRow, 'id'>>('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);

  if (existingUserResult.rows[0]) {
    throw new DuplicateEmailError('Ja existe um usuario com este e-mail.');
  }

  const pool = await getDatabasePool();
  const client = await pool.connect();
  const accountId = randomUUID();
  const userId = randomUUID();
  const householdId = randomUUID();
  const passwordSalt = createPasswordSalt(userId);
  const passwordHash = createPasswordHash(input.password, passwordSalt);
  const normalizedHouseholdName = input.householdName.trim();
  const normalizedFullName = input.fullName.trim();

  try {
    await client.query('BEGIN');
    await client.query(
      `
        INSERT INTO accounts (id, name)
        VALUES ($1, $2)
      `,
      [accountId, `Conta ${normalizedHouseholdName}`]
    );
    await client.query(
      `
        INSERT INTO households (id, account_id, name)
        VALUES ($1, $2, $3)
      `,
      [householdId, accountId, normalizedHouseholdName]
    );
    await client.query(
      `
        INSERT INTO users (id, account_id, email, full_name, role, password_hash, password_salt)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [userId, accountId, email, normalizedFullName, 'owner', passwordHash, passwordSalt]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return createSessionForUser({
    id: userId,
    accountId,
    email,
    fullName: normalizedFullName,
    role: 'owner'
  });
};

export const requestPasswordRecovery = async (email: string): Promise<PasswordRecoveryRequestResult> => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);
  const genericMessage = 'Se existir uma conta com este e-mail, um token temporario de recuperacao foi emitido.';

  if (!user) {
    return passwordRecoveryRequestResultSchema.parse({
      message: genericMessage,
      resetToken: null
    });
  }

  const pool = await getDatabasePool();
  const client = await pool.connect();
  const resetToken = randomBytes(24).toString('base64url');
  const tokenHash = hashPasswordRecoveryToken(resetToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000).toISOString();

  try {
    await client.query('BEGIN');
    await client.query(
      `
        UPDATE password_reset_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND used_at IS NULL
      `,
      [user.id]
    );
    await client.query(
      `
        INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
        VALUES ($1, $2, $3, $4)
      `,
      [randomUUID(), user.id, tokenHash, expiresAt]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return passwordRecoveryRequestResultSchema.parse({
    message: genericMessage,
    resetToken: process.env.NODE_ENV === 'production' ? null : resetToken
  });
};

export const resetPasswordWithToken = async (token: string, newPassword: string): Promise<Session> => {
  const tokenHash = hashPasswordRecoveryToken(token);
  const result = await queryDatabase<PasswordResetTokenRow & UserRow>(
    `
      SELECT
        password_reset_tokens.id,
        password_reset_tokens.user_id,
        password_reset_tokens.token_hash,
        password_reset_tokens.expires_at,
        password_reset_tokens.used_at,
        users.account_id,
        users.email,
        users.full_name,
        users.role,
        users.password_hash,
        users.password_salt,
        users.id AS id
      FROM password_reset_tokens
      INNER JOIN users ON users.id = password_reset_tokens.user_id
      WHERE password_reset_tokens.token_hash = $1
      LIMIT 1
    `,
    [tokenHash]
  );
  const tokenRow = result.rows[0];

  if (!tokenRow || tokenRow.used_at || new Date(tokenRow.expires_at).getTime() <= Date.now()) {
    throw new InvalidPasswordRecoveryTokenError('Token de recuperacao invalido ou expirado.');
  }

  const pool = await getDatabasePool();
  const client = await pool.connect();
  const passwordSalt = createPasswordSalt(tokenRow.user_id);
  const passwordHash = createPasswordHash(newPassword, passwordSalt);

  try {
    await client.query('BEGIN');
    await client.query(
      `
        UPDATE users
        SET password_hash = $1, password_salt = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
      [passwordHash, passwordSalt, tokenRow.user_id]
    );
    await client.query(
      `
        UPDATE password_reset_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND used_at IS NULL
      `,
      [tokenRow.user_id]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return createSessionForUser(parseAuthenticatedUser(tokenRow));
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<AuthMessage> => {
  const user = await findUserById(userId);

  if (!user || !verifyPasswordHash(currentPassword, user.password_salt, user.password_hash)) {
    throw new InvalidCurrentPasswordError('Senha atual invalida.');
  }

  await updateUserPassword(userId, newPassword);
  await queryDatabase(
    `
      UPDATE password_reset_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND used_at IS NULL
    `,
    [userId]
  );

  return buildAuthMessage('Senha atualizada com sucesso.');
};

export const setRequestAuthContext = (request: FastifyRequest, authContext: AuthContext): void => {
  (request as RequestWithAuth).authContext = authContext;
};

export const getRequestAuthContext = (request: FastifyRequest): AuthContext | null =>
  (request as RequestWithAuth).authContext ?? null;

export const requireAuthContext = (request: FastifyRequest): AuthContext => {
  const authContext = getRequestAuthContext(request);

  if (!authContext) {
    throw new Error('Sessao nao autenticada.');
  }

  return authContext;
};

export const isPublicRoute = (request: FastifyRequest): boolean => {
  const path = request.raw.url?.split('?')[0] ?? '';

  return (
    path === '/api/health' ||
    path === '/api/auth/login' ||
    path === '/api/auth/register' ||
    path === '/api/auth/password-recovery' ||
    path === '/api/auth/password-reset'
  );
};