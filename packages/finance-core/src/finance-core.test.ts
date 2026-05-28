import test from 'node:test';
import assert from 'node:assert/strict';

import { createAvalanchePlan } from './avalanche/create-avalanche-plan.js';
import { allocateBudgetZero } from './budget-zero/allocate-budget-zero.js';
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

const envelopes = [
  { category: 'Essenciais', plannedAmount: 1400, actualAmount: 1380.255 },
  { category: 'Transporte', plannedAmount: 320, actualAmount: 350.125 },
  { category: 'Reserva', plannedAmount: 280 }
];

test('calculateDti returns a rounded percentage and classification', () => {
  const result = calculateDti({ incomes, debts });

  assert.equal(result.monthlyIncome, 4200);
  assert.equal(result.monthlyDebtPayments, 750);
  assert.equal(result.dtiPercent, 17.86);
  assert.equal(result.classification, 'sustainable');
});

test('calculateDti treats an empty financial profile as zero risk until data is entered', () => {
  const result = calculateDti({ incomes: [], debts: [] });

  assert.equal(result.monthlyIncome, 0);
  assert.equal(result.monthlyDebtPayments, 0);
  assert.equal(result.dtiPercent, 0);
  assert.equal(result.classification, 'sustainable');
});

test('calculateDti classifies the documented threshold boundaries consistently', () => {
  const thresholdCases = [
    { monthlyPayment: 200, expectedPercent: 20, expectedClassification: 'sustainable' },
    { monthlyPayment: 350, expectedPercent: 35, expectedClassification: 'alert' },
    { monthlyPayment: 500, expectedPercent: 50, expectedClassification: 'high-risk' },
    { monthlyPayment: 650, expectedPercent: 65, expectedClassification: 'critical' }
  ] as const;

  for (const thresholdCase of thresholdCases) {
    const result = calculateDti({
      incomes: [{ id: 'income-threshold', label: 'Renda base', amount: 1000, recurring: true }],
      debts: [
        {
          id: `debt-${thresholdCase.monthlyPayment}`,
          creditor: 'Credor limite',
          balance: 2000,
          monthlyPayment: thresholdCase.monthlyPayment,
          interestRate: 3.5,
          overdueMonths: 0
        }
      ]
    });

    assert.equal(result.dtiPercent, thresholdCase.expectedPercent);
    assert.equal(result.classification, thresholdCase.expectedClassification);
  }
});

test('calculateDti treats debts without income as maximum risk', () => {
  const result = calculateDti({
    incomes: [],
    debts: [
      {
        id: 'debt-without-income',
        creditor: 'Credor urgente',
        balance: 1500,
        monthlyPayment: 150,
        interestRate: 5.5,
        overdueMonths: 1
      }
    ]
  });

  assert.equal(result.monthlyIncome, 0);
  assert.equal(result.monthlyDebtPayments, 150);
  assert.equal(result.dtiPercent, 100);
  assert.equal(result.classification, 'critical');
});

test('allocateBudgetZero summarizes income, committed budget, and remaining amount', () => {
  const allocation = allocateBudgetZero({ incomes, debts, envelopes });

  assert.equal(allocation.monthlyIncome, 4200);
  assert.equal(allocation.allocatedAmount, 2750);
  assert.equal(allocation.remainingAmount, 1450);
});

test('allocateBudgetZero computes rounded envelope variance and falls back to planned amount', () => {
  const allocation = allocateBudgetZero({ incomes, debts, envelopes });

  assert.deepEqual(allocation.envelopes, [
    {
      category: 'Essenciais',
      plannedAmount: 1400,
      actualAmount: 1380.255,
      variance: -19.75
    },
    {
      category: 'Transporte',
      plannedAmount: 320,
      actualAmount: 350.125,
      variance: 30.13
    },
    {
      category: 'Reserva',
      plannedAmount: 280,
      variance: 0
    }
  ]);
});

test('createAvalanchePlan prioritizes highest interest first', () => {
  const plan = createAvalanchePlan({ incomes, debts, extraPayment: 300 });

  assert.equal(plan.strategy, 'avalanche');
  assert.equal(plan.installments[0]?.debtId, 'debt-2');
  assert.equal(plan.installments[0]?.recommendedPayment, 480);
});

test('createAvalanchePlan breaks ties by higher balance and rounds the budget summary', () => {
  const plan = createAvalanchePlan({
    incomes: [{ id: 'income-2', label: 'Renda familiar', amount: 1500.005, recurring: true }],
    debts: [
      {
        id: 'debt-bigger-balance',
        creditor: 'Banco Maior',
        balance: 3200.105,
        monthlyPayment: 200.005,
        interestRate: 7.2,
        overdueMonths: 0
      },
      {
        id: 'debt-smaller-balance',
        creditor: 'Banco Menor',
        balance: 1800.105,
        monthlyPayment: 180.005,
        interestRate: 7.2,
        overdueMonths: 0
      }
    ],
    extraPayment: 99.995
  });

  assert.equal(plan.installments[0]?.debtId, 'debt-bigger-balance');
  assert.equal(plan.totalDebtBalance, 5000.21);
  assert.equal(plan.recommendedExtraPayment, 100);
  assert.equal(plan.projectedBudgetGap, 1020.01);
});

test('createSnowballPlan prioritizes lowest balance first', () => {
  const plan = createSnowballPlan({ incomes, debts, extraPayment: 300 });

  assert.equal(plan.strategy, 'snowball');
  assert.equal(plan.installments[0]?.debtId, 'debt-3');
  assert.equal(plan.installments[0]?.recommendedPayment, 420);
});

test('createSnowballPlan breaks ties by higher interest rate', () => {
  const plan = createSnowballPlan({
    incomes,
    debts: [
      {
        id: 'debt-high-interest',
        creditor: 'Cartao com empate',
        balance: 1000,
        monthlyPayment: 90,
        interestRate: 11.5,
        overdueMonths: 0
      },
      {
        id: 'debt-low-interest',
        creditor: 'Parcelamento com empate',
        balance: 1000,
        monthlyPayment: 90,
        interestRate: 4.2,
        overdueMonths: 0
      }
    ],
    extraPayment: 50
  });

  assert.equal(plan.installments[0]?.debtId, 'debt-high-interest');
  assert.equal(plan.installments[0]?.recommendedPayment, 140);
  assert.equal(plan.installments[1]?.debtId, 'debt-low-interest');
});