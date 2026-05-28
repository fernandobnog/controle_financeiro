import test from 'node:test';
import assert from 'node:assert/strict';

import { createAvalanchePlan } from './avalanche/create-avalanche-plan.js';
import { calculateDti } from './dti/calculate-dti.js';
import { createSnowballPlan } from './snowball/create-snowball-plan.js';

const incomes = [
  { id: 'income-1', label: 'Salario principal', amount: 4200, recurring: true }
];

const debts = [
  { id: 'debt-1', creditor: 'Banco A', balance: 9000, monthlyPayment: 450, interestRate: 4.2, overdueMonths: 1 },
  { id: 'debt-2', creditor: 'Cartao B', balance: 2400, monthlyPayment: 180, interestRate: 9.8, overdueMonths: 0 },
  { id: 'debt-3', creditor: 'Loja C', balance: 1200, monthlyPayment: 120, interestRate: 2.1, overdueMonths: 2 }
];

test('calculateDti returns a rounded percentage and classification', () => {
  const result = calculateDti({ incomes, debts });

  assert.equal(result.monthlyIncome, 4200);
  assert.equal(result.monthlyDebtPayments, 750);
  assert.equal(result.dtiPercent, 17.86);
  assert.equal(result.classification, 'sustainable');
});

test('createAvalanchePlan prioritizes highest interest first', () => {
  const plan = createAvalanchePlan({ incomes, debts, extraPayment: 300 });

  assert.equal(plan.strategy, 'avalanche');
  assert.equal(plan.installments[0]?.debtId, 'debt-2');
  assert.equal(plan.installments[0]?.recommendedPayment, 480);
});

test('createSnowballPlan prioritizes lowest balance first', () => {
  const plan = createSnowballPlan({ incomes, debts, extraPayment: 300 });

  assert.equal(plan.strategy, 'snowball');
  assert.equal(plan.installments[0]?.debtId, 'debt-3');
  assert.equal(plan.installments[0]?.recommendedPayment, 420);
});