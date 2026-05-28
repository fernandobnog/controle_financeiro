import type { Pool } from 'pg';

import { createPasswordHash } from '../../modules/auth/auth.service.js';

const defaultAccountId = 'account-1';
const householdId = 'household-1';
const secondaryAccountId = 'account-2';
const secondaryHouseholdId = 'household-2';

export const defaultUserEmail = 'owner@familia-souza.local';
export const defaultUserPassword = 'demo12345';
export const secondaryUserEmail = 'owner@familia-lima.local';
export const secondaryUserPassword = 'demo67890';

const upsertUser = async (
  pool: Pool,
  input: {
    id: string;
    accountId: string;
    email: string;
    fullName: string;
    role: 'owner' | 'member';
    password: string;
  }
): Promise<void> => {
  const passwordSalt = `${input.id}-salt`;
  const passwordHash = createPasswordHash(input.password, passwordSalt);

  await pool.query(
    `
      INSERT INTO users (id, account_id, email, full_name, role, password_hash, password_salt)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id)
      DO UPDATE SET
        account_id = EXCLUDED.account_id,
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        password_hash = EXCLUDED.password_hash,
        password_salt = EXCLUDED.password_salt,
        updated_at = CURRENT_TIMESTAMP
    `,
    [input.id, input.accountId, input.email, input.fullName, input.role, passwordHash, passwordSalt]
  );
};

export const seedDatabase = async (pool: Pool): Promise<void> => {
  await pool.query(
    `
      INSERT INTO accounts (id, name)
      VALUES ($1, $2), ($3, $4)
      ON CONFLICT (id)
      DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = CURRENT_TIMESTAMP
    `,
    [defaultAccountId, 'Conta Familia Souza', secondaryAccountId, 'Conta Familia Lima']
  );

  await pool.query(
    `
      UPDATE accounts
      SET onboarding_completed_at = COALESCE(onboarding_completed_at, CURRENT_TIMESTAMP)
      WHERE id IN ($1, $2)
    `,
    [defaultAccountId, secondaryAccountId]
  );

  await upsertUser(pool, {
    id: 'user-1',
    accountId: defaultAccountId,
    email: defaultUserEmail,
    fullName: 'Responsavel Familia Souza',
    role: 'owner',
    password: defaultUserPassword
  });

  await upsertUser(pool, {
    id: 'user-2',
    accountId: secondaryAccountId,
    email: secondaryUserEmail,
    fullName: 'Responsavel Familia Lima',
    role: 'owner',
    password: secondaryUserPassword
  });

  await pool.query(
    `
      INSERT INTO households (id, account_id, name)
      VALUES ($1, $2, $3), ($4, $5, $6)
      ON CONFLICT (id)
      DO UPDATE SET
        account_id = EXCLUDED.account_id,
        name = EXCLUDED.name,
        updated_at = CURRENT_TIMESTAMP
    `,
    [householdId, defaultAccountId, 'Familia Souza', secondaryHouseholdId, secondaryAccountId, 'Familia Lima']
  );

  await pool.query(
    `
      INSERT INTO incomes (id, household_id, label, amount, recurring)
      VALUES
        ('income-1', $1, 'Salario principal', 4200, TRUE),
        ('income-2', $1, 'Renda extra', 600, FALSE)
      ON CONFLICT (id)
      DO UPDATE SET
        label = EXCLUDED.label,
        amount = EXCLUDED.amount,
        recurring = EXCLUDED.recurring,
        updated_at = CURRENT_TIMESTAMP
    `,
    [householdId]
  );

  await pool.query(
    `
      INSERT INTO debts (id, household_id, creditor, balance, monthly_payment, interest_rate, overdue_months)
      VALUES
        ('debt-1', $1, 'Banco A', 9000, 450, 4.2, 1),
        ('debt-2', $1, 'Cartao B', 2400, 180, 9.8, 0),
        ('debt-3', $1, 'Loja C', 1200, 120, 2.1, 2)
      ON CONFLICT (id)
      DO UPDATE SET
        creditor = EXCLUDED.creditor,
        balance = EXCLUDED.balance,
        monthly_payment = EXCLUDED.monthly_payment,
        interest_rate = EXCLUDED.interest_rate,
        overdue_months = EXCLUDED.overdue_months,
        updated_at = CURRENT_TIMESTAMP
    `,
    [householdId]
  );

  await pool.query(
    `
      INSERT INTO budget_envelopes (id, household_id, category, planned_amount, actual_amount)
      VALUES
        ('envelope-1', $1, 'Moradia', 1200, 1200),
        ('envelope-2', $1, 'Alimentacao', 800, 760),
        ('envelope-3', $1, 'Transporte', 280, 310),
        ('envelope-4', $1, 'Saude', 220, 210)
      ON CONFLICT (id)
      DO UPDATE SET
        category = EXCLUDED.category,
        planned_amount = EXCLUDED.planned_amount,
        actual_amount = EXCLUDED.actual_amount,
        updated_at = CURRENT_TIMESTAMP
    `,
    [householdId]
  );
};

export const defaultHouseholdId = householdId;
export { defaultAccountId, householdId as primaryHouseholdId, secondaryAccountId, secondaryHouseholdId };