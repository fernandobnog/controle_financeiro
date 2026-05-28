import type { DebtInput, DtiClassification, IncomeInput } from '@controle-financeiro/shared-contracts';

import { toDecimal, toMoney } from '../currency/decimal-utils.js';

export interface CalculateDtiInput {
  incomes: IncomeInput[];
  debts: DebtInput[];
}

export interface DtiResult {
  monthlyIncome: number;
  monthlyDebtPayments: number;
  dtiPercent: number;
  classification: DtiClassification;
}

const classifyDti = (dtiPercent: number): DtiClassification => {
  if (dtiPercent <= 20) {
    return 'sustainable';
  }

  if (dtiPercent <= 35) {
    return 'alert';
  }

  if (dtiPercent <= 50) {
    return 'high-risk';
  }

  return 'critical';
};

export const calculateDti = ({ incomes, debts }: CalculateDtiInput): DtiResult => {
  const monthlyIncome = incomes.reduce((carry, item) => carry.plus(toDecimal(item.amount)), toDecimal(0));
  const monthlyDebtPayments = debts.reduce(
    (carry, item) => carry.plus(toDecimal(item.monthlyPayment)),
    toDecimal(0)
  );

  const dtiPercent = monthlyIncome.isZero()
    ? monthlyDebtPayments.isZero()
      ? 0
      : 100
    : Number(monthlyDebtPayments.dividedBy(monthlyIncome).mul(100).toDecimalPlaces(2).toString());

  return {
    monthlyIncome: toMoney(monthlyIncome),
    monthlyDebtPayments: toMoney(monthlyDebtPayments),
    dtiPercent,
    classification: classifyDti(dtiPercent)
  };
};