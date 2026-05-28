import type { ActionPlan, DebtInput } from '@controle-financeiro/shared-contracts';

import { sumMoney, toMoney } from '../currency/decimal-utils.js';
import { calculateDti } from '../dti/calculate-dti.js';
import type { CreatePlanInput } from '../avalanche/create-avalanche-plan.js';

const sortBySnowball = (debts: DebtInput[]): DebtInput[] =>
  [...debts].sort((left, right) => {
    if (left.balance !== right.balance) {
      return left.balance - right.balance;
    }

    return right.interestRate - left.interestRate;
  });

export const createSnowballPlan = ({ incomes, debts, extraPayment = 0 }: CreatePlanInput): ActionPlan => {
  const diagnosis = calculateDti({ incomes, debts });
  const sortedDebts = sortBySnowball(debts);
  const totalDebtBalance = toMoney(sumMoney(sortedDebts.map((item) => item.balance)));

  return {
    strategy: 'snowball',
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