import { createAvalanchePlan, createSnowballPlan } from '@controle-financeiro/finance-core';
import type { FastifyPluginAsync } from 'fastify';

import { getHouseholdSnapshot } from '../households/household.repository.js';

export const plansRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { householdId?: string } }>('/plans/comparison', async (request) => {
    const household = await getHouseholdSnapshot(request.query.householdId);
    const extraPayment = 300;

    return {
      householdId: household.householdId,
      avalanche: createAvalanchePlan({
        incomes: household.incomes,
        debts: household.debts,
        extraPayment
      }),
      snowball: createSnowballPlan({
        incomes: household.incomes,
        debts: household.debts,
        extraPayment
      })
    };
  });
};