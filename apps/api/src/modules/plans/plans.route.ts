import { createAvalanchePlan, createSnowballPlan } from '@controle-financeiro/finance-core';
import { householdScopeQuerySchema, planComparisonSchema } from '@controle-financeiro/shared-contracts';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuthContext } from '../auth/auth.service.js';
import { AccountScopeError, getHouseholdSnapshot } from '../households/household.repository.js';

export const plansRoute: FastifyPluginAsync = async (app) => {
  app.get('/plans/comparison', async (request, reply) => {
    const authContext = requireAuthContext(request);
    const query = householdScopeQuerySchema.parse(request.query);

    try {
      const household = await getHouseholdSnapshot(authContext.accountId, query.householdId);
      const extraPayment = 300;
      const avalanchePlan = createAvalanchePlan({
        incomes: household.incomes,
        debts: household.debts,
        extraPayment
      });
      const snowballPlan = createSnowballPlan({
        incomes: household.incomes,
        debts: household.debts,
        extraPayment
      });

      return planComparisonSchema.parse({
        avalanche: {
          installments: avalanchePlan.installments.map((item) => ({
            creditor: item.creditor,
            recommendedPayment: item.recommendedPayment
          }))
        },
        snowball: {
          installments: snowballPlan.installments.map((item) => ({
            creditor: item.creditor,
            recommendedPayment: item.recommendedPayment
          }))
        }
      });
    } catch (error) {
      if (error instanceof AccountScopeError) {
        return reply.code(403).send({ message: error.message });
      }

      throw error;
    }
  });
};