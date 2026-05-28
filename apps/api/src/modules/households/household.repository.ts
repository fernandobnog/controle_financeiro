import { randomUUID } from 'node:crypto';

import type { BudgetEnvelopeInput, DebtInput, IncomeInput } from '@controle-financeiro/shared-contracts';
import type { FinancialCase, OnboardingProfileInput } from '@controle-financeiro/shared-contracts';

import { getDatabasePool, queryDatabase } from '../../infra/db/database.js';

interface HouseholdRow {
  id: string;
  account_id: string;
  name: string;
}

interface IncomeRow {
  id: string;
  label: string;
  amount: string | number;
  recurring: boolean;
}

interface DebtRow {
  id: string;
  creditor: string;
  balance: string | number;
  monthly_payment: string | number;
  interest_rate: string | number;
  overdue_months: number;
}

interface EnvelopeRow {
  category: string;
  planned_amount: string | number;
  actual_amount: string | number | null;
}

export interface HouseholdSnapshot {
  householdId: string;
  householdName: string;
  incomes: IncomeInput[];
  debts: DebtInput[];
  envelopes: BudgetEnvelopeInput[];
}

export class AccountScopeError extends Error {}

const toNumber = (value: string | number | null): number => Number(value ?? 0);

export const getPrimaryHouseholdId = async (accountId: string): Promise<string> => {
  const result = await queryDatabase<Pick<HouseholdRow, 'id'>>(
    'SELECT id FROM households WHERE account_id = $1 ORDER BY created_at ASC LIMIT 1',
    [accountId]
  );

  const household = result.rows[0];

  if (!household) {
    throw new AccountScopeError('Nenhum caso familiar autorizado para a conta informada.');
  }

  return household.id;
};

export const resolveHouseholdId = async (accountId: string, householdId?: string): Promise<string> => {
  if (!householdId) {
    return getPrimaryHouseholdId(accountId);
  }

  const result = await queryDatabase<Pick<HouseholdRow, 'id'>>(
    'SELECT id FROM households WHERE id = $1 AND account_id = $2',
    [householdId, accountId]
  );

  if (!result.rows[0]) {
    throw new AccountScopeError('Conta sem acesso ao caso familiar solicitado.');
  }

  return householdId;
};

export const getHouseholdSnapshot = async (accountId: string, householdId?: string): Promise<HouseholdSnapshot> => {
  const resolvedHouseholdId = await resolveHouseholdId(accountId, householdId);

  const householdResult = await queryDatabase<HouseholdRow>(
    'SELECT id, account_id, name FROM households WHERE id = $1 AND account_id = $2',
    [resolvedHouseholdId, accountId]
  );
  const household = householdResult.rows[0];

  if (!household) {
    throw new AccountScopeError('Conta sem acesso ao caso familiar solicitado.');
  }

  const [incomeResult, debtResult, envelopeResult] = await Promise.all([
    queryDatabase<IncomeRow>(
      'SELECT id, label, amount, recurring FROM incomes WHERE household_id = $1 ORDER BY created_at ASC',
      [resolvedHouseholdId]
    ),
    queryDatabase<DebtRow>(
      `
        SELECT id, creditor, balance, monthly_payment, interest_rate, overdue_months
        FROM debts
        WHERE household_id = $1
        ORDER BY created_at ASC
      `,
      [resolvedHouseholdId]
    ),
    queryDatabase<EnvelopeRow>(
      `
        SELECT category, planned_amount, actual_amount
        FROM budget_envelopes
        WHERE household_id = $1
        ORDER BY created_at ASC
      `,
      [resolvedHouseholdId]
    )
  ]);

  return {
    householdId: household.id,
    householdName: household.name,
    incomes: incomeResult.rows.map((row) => ({
      id: row.id,
      label: row.label,
      amount: toNumber(row.amount),
      recurring: row.recurring
    })),
    debts: debtResult.rows.map((row) => ({
      id: row.id,
      creditor: row.creditor,
      balance: toNumber(row.balance),
      monthlyPayment: toNumber(row.monthly_payment),
      interestRate: toNumber(row.interest_rate),
      overdueMonths: row.overdue_months
    })),
    envelopes: envelopeResult.rows.map((row) => ({
      category: row.category,
      plannedAmount: toNumber(row.planned_amount),
      actualAmount: row.actual_amount === null ? undefined : toNumber(row.actual_amount)
    }))
  };
};

export const getOnboardingProfile = async (accountId: string): Promise<FinancialCase> => {
  const householdSnapshot = await getHouseholdSnapshot(accountId);

  return {
    householdId: householdSnapshot.householdId,
    householdName: householdSnapshot.householdName,
    incomes: householdSnapshot.incomes,
    debts: householdSnapshot.debts,
    envelopes: householdSnapshot.envelopes
  };
};

export const saveOnboardingProfile = async (accountId: string, input: OnboardingProfileInput): Promise<FinancialCase> => {
  const householdId = await getPrimaryHouseholdId(accountId);
  const normalizedHouseholdName = input.householdName.trim();
  const pool = await getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `
        UPDATE households
        SET name = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND account_id = $3
      `,
      [normalizedHouseholdName, householdId, accountId]
    );
    await client.query('DELETE FROM incomes WHERE household_id = $1', [householdId]);
    await client.query('DELETE FROM debts WHERE household_id = $1', [householdId]);
    await client.query('DELETE FROM budget_envelopes WHERE household_id = $1', [householdId]);

    for (const income of input.incomes) {
      await client.query(
        `
          INSERT INTO incomes (id, household_id, label, amount, recurring)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [randomUUID(), householdId, income.label.trim(), income.amount, income.recurring]
      );
    }

    for (const debt of input.debts) {
      await client.query(
        `
          INSERT INTO debts (id, household_id, creditor, balance, monthly_payment, interest_rate, overdue_months)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          randomUUID(),
          householdId,
          debt.creditor.trim(),
          debt.balance,
          debt.monthlyPayment,
          debt.interestRate,
          debt.overdueMonths
        ]
      );
    }

    for (const envelope of input.envelopes) {
      await client.query(
        `
          INSERT INTO budget_envelopes (id, household_id, category, planned_amount, actual_amount)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [randomUUID(), householdId, envelope.category.trim(), envelope.plannedAmount, envelope.actualAmount ?? null]
      );
    }

    await client.query(
      `
        UPDATE accounts
        SET onboarding_completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [accountId]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return getOnboardingProfile(accountId);
};