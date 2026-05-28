import { calculateDti, explainDiagnosis } from '@controle-financeiro/finance-core';
import { diagnosisSummarySchema, diagnosisExplainedSchema, householdScopeQuerySchema } from '@controle-financeiro/shared-contracts';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuthContext } from '../auth/auth.service.js';
import { AccountScopeError, getHouseholdSnapshot } from '../households/household.repository.js';

export const diagnosisRoute: FastifyPluginAsync = async (app) => {
  app.get('/diagnosis/summary', async (request, reply) => {
    const authContext = requireAuthContext(request);
    const query = householdScopeQuerySchema.parse(request.query);

    try {
      const household = await getHouseholdSnapshot(authContext.accountId, query.householdId);
      const diagnosis = calculateDti({
        incomes: household.incomes,
        debts: household.debts
      });

      return diagnosisSummarySchema.parse({
        monthlyIncome: diagnosis.monthlyIncome,
        monthlyDebtPayments: diagnosis.monthlyDebtPayments,
        dtiPercent: diagnosis.dtiPercent,
        classification: diagnosis.classification,
        totalDebtBalance: household.debts.reduce((carry, item) => carry + item.balance, 0)
      });
    } catch (error) {
      if (error instanceof AccountScopeError) {
        return reply.code(403).send({ message: error.message });
      }

      throw error;
    }
  });

  app.get('/diagnosis/explained', async (request, reply) => {
    const authContext = requireAuthContext(request);
    const query = householdScopeQuerySchema.parse(request.query);

    try {
      const household = await getHouseholdSnapshot(authContext.accountId, query.householdId);
      const explained = explainDiagnosis({
        incomes: household.incomes,
        debts: household.debts,
        envelopes: household.envelopes
      });

      return diagnosisExplainedSchema.parse(explained);
    } catch (error) {
      if (error instanceof AccountScopeError) {
        return reply.code(403).send({ message: error.message });
      }

      throw error;
    }
  });
};