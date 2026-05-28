import { allocateBudgetZero, calculateDti } from '@controle-financeiro/finance-core';
import { diagnosisSchema } from '@controle-financeiro/shared-contracts';
import type { FastifyPluginAsync } from 'fastify';

import { getHouseholdSnapshot } from '../households/household.repository.js';

export const diagnosisRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { householdId?: string } }>('/diagnosis/summary', async (request) => {
    const household = await getHouseholdSnapshot(request.query.householdId);
    const diagnosis = calculateDti({
      incomes: household.incomes,
      debts: household.debts
    });
    const budget = allocateBudgetZero({
      incomes: household.incomes,
      debts: household.debts,
      envelopes: household.envelopes
    });

    return diagnosisSchema.parse({
      householdId: household.householdId,
      householdName: household.householdName,
      ...diagnosis,
      debtCount: household.debts.length,
      totalDebtBalance: household.debts.reduce((carry, item) => carry + item.balance, 0),
      budgetRemaining: budget.remainingAmount
    });
  });
};