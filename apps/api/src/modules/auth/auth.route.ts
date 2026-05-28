import {
  authMessageSchema,
  changePasswordInputSchema,
  loginInputSchema,
  passwordRecoveryRequestInputSchema,
  passwordRecoveryRequestResultSchema,
  passwordResetInputSchema,
  registerInputSchema,
  sessionSchema
} from '@controle-financeiro/shared-contracts';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuthContext } from '../auth/auth.service.js';
import {
  authenticateUser,
  changePassword,
  DuplicateEmailError,
  InvalidCurrentPasswordError,
  InvalidPasswordRecoveryTokenError,
  registerUser,
  requestPasswordRecovery,
  resetPasswordWithToken
} from './auth.service.js';

export const authRoute: FastifyPluginAsync = async (app) => {
  app.post<{ Body: unknown }>('/auth/register', async (request, reply) => {
    const payload = registerInputSchema.parse(request.body);

    try {
      const session = await registerUser(payload);

      return reply.code(201).send(session);
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        return reply.code(409).send({ message: error.message });
      }

      throw error;
    }
  });

  app.post<{ Body: unknown }>('/auth/password-recovery', async (request, reply) => {
    const payload = passwordRecoveryRequestInputSchema.parse(request.body);
    const result = await requestPasswordRecovery(payload.email);

    return reply.send(passwordRecoveryRequestResultSchema.parse(result));
  });

  app.post<{ Body: unknown }>('/auth/password-reset', async (request, reply) => {
    const payload = passwordResetInputSchema.parse(request.body);

    try {
      const session = await resetPasswordWithToken(payload.token, payload.newPassword);

      return reply.send(sessionSchema.parse(session));
    } catch (error) {
      if (error instanceof InvalidPasswordRecoveryTokenError) {
        return reply.code(400).send({ message: error.message });
      }

      throw error;
    }
  });

  app.post<{ Body: unknown }>('/auth/login', async (request, reply) => {
    const payload = loginInputSchema.parse(request.body);
    const session = await authenticateUser(payload.email, payload.password);

    if (!session) {
      return reply.code(401).send({ message: 'Credenciais invalidas.' });
    }

    return reply.send(session);
  });

  app.post<{ Body: unknown }>('/auth/change-password', async (request, reply) => {
    const authContext = requireAuthContext(request);
    const payload = changePasswordInputSchema.parse(request.body);

    try {
      const result = await changePassword(authContext.userId, payload.currentPassword, payload.newPassword);

      return reply.send(authMessageSchema.parse(result));
    } catch (error) {
      if (error instanceof InvalidCurrentPasswordError) {
        return reply.code(400).send({ message: error.message });
      }

      throw error;
    }
  });
};