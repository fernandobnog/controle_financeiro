import type { BudgetEnvelopeInput, DebtInput, IncomeInput } from '@controle-financeiro/shared-contracts';

import { sumMoney, toMoney } from '../currency/decimal-utils.js';

export interface BudgetAllocationResult {
  monthlyIncome: number;
  allocatedAmount: number;
  remainingAmount: number;
  envelopes: Array<BudgetEnvelopeInput & { variance: number }>;
}

export interface AllocateBudgetZeroInput {
  incomes: IncomeInput[];
  envelopes: BudgetEnvelopeInput[];
  debts: DebtInput[];
}

export const allocateBudgetZero = ({ incomes, envelopes, debts }: AllocateBudgetZeroInput): BudgetAllocationResult => {
  const monthlyIncome = sumMoney(incomes.map((item) => item.amount));
  const debtPayments = sumMoney(debts.map((item) => item.monthlyPayment));
  const envelopeTotal = sumMoney(envelopes.map((item) => item.plannedAmount));
  const allocatedAmount = debtPayments.plus(envelopeTotal);

  return {
    monthlyIncome: toMoney(monthlyIncome),
    allocatedAmount: toMoney(allocatedAmount),
    remainingAmount: toMoney(monthlyIncome.minus(allocatedAmount)),
    envelopes: envelopes.map((item) => ({
      ...item,
      variance: toMoney((item.actualAmount ?? item.plannedAmount) - item.plannedAmount)
    }))
  };
};