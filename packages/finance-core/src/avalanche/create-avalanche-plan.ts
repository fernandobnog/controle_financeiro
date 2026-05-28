import type { ActionPlan, DebtInput, IncomeInput } from '@controle-financeiro/shared-contracts';

import { calculateDti } from '../dti/calculate-dti.js';
import { sumMoney, toMoney } from '../currency/decimal-utils.js';

export interface CreatePlanInput {
  incomes: IncomeInput[];
  debts: DebtInput[];
  extraPayment?: number;
}

const sortByAvalanche = (debts: DebtInput[]): DebtInput[] =>
  [...debts].sort((left, right) => {
    if (right.interestRate !== left.interestRate) {
      return right.interestRate - left.interestRate;
    }

    return right.balance - left.balance;
  });

export const createAvalanchePlan = ({ incomes, debts, extraPayment = 0 }: CreatePlanInput): ActionPlan => {
  const diagnosis = calculateDti({ incomes, debts });
  const sortedDebts = sortByAvalanche(debts);
  const totalDebtBalance = toMoney(sumMoney(sortedDebts.map((item) => item.balance)));

  return {
    strategy: 'avalanche',
    totalDebtBalance,
    monthlyIncome: diagnosis.monthlyIncome,
    monthlyDebtPayments: diagnosis.monthlyDebtPayments,
    recommendedExtraPayment: toMoney(extraPayment),
    projectedBudgetGap: toMoney(diagnosis.monthlyIncome - diagnosis.monthlyDebtPayments - extraPayment),
    installments: sortedDebts.map((item, index) => ({
      debtId: item.id,
      creditor: item.creditor,
      recommendedPayment: toMoney(item.monthlyPayment + (index === 0 ? extraPayment : 0)),
      priority: index + 1
    }))
  };
};