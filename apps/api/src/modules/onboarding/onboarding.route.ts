import { financialCaseSchema, onboardingProfileInputSchema } from '@controle-financeiro/shared-contracts';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuthContext } from '../auth/auth.service.js';
import { AccountScopeError, getOnboardingProfile, saveOnboardingProfile } from '../households/household.repository.js';

export const onboardingRoute: FastifyPluginAsync = async (app) => {
  app.get('/onboarding/profile', async (request, reply) => {
    const authContext = requireAuthContext(request);

    try {
      const profile = await getOnboardingProfile(authContext.accountId);

      return financialCaseSchema.parse(profile);
    } catch (error) {
      if (error instanceof AccountScopeError) {
        return reply.code(403).send({ message: error.message });
      }

      throw error;
    }
  });

  app.put<{ Body: unknown }>('/onboarding/profile', async (request, reply) => {
    const authContext = requireAuthContext(request);
    const payload = onboardingProfileInputSchema.parse(request.body);

    try {
      const profile = await saveOnboardingProfile(authContext.accountId, payload);

      return reply.send(financialCaseSchema.parse(profile));
    } catch (error) {
      if (error instanceof AccountScopeError) {
        return reply.code(403).send({ message: error.message });
      }

      throw error;
    }
  });
};