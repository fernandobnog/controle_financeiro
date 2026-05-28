import type { BudgetEnvelopeInput, DebtInput, DocumentRecord, IncomeInput } from '@controle-financeiro/shared-contracts';

import { queryDatabase } from '../../infra/db/database.js';

interface HouseholdRow {
  id: string;
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

interface DocumentRow {
  id: string;
  household_id: string;
  file_server_document_id: string;
  filename: string;
  mime_type: string;
  size_in_bytes: number;
  status: DocumentRecord['status'];
  signed_download_url: string | null;
}

export interface HouseholdSnapshot {
  householdId: string;
  householdName: string;
  incomes: IncomeInput[];
  debts: DebtInput[];
  envelopes: BudgetEnvelopeInput[];
  documents: DocumentRecord[];
}

const toNumber = (value: string | number | null): number => Number(value ?? 0);

export const getPrimaryHouseholdId = async (): Promise<string> => {
  const result = await queryDatabase<Pick<HouseholdRow, 'id'>>(
    'SELECT id FROM households ORDER BY created_at ASC LIMIT 1'
  );

  const household = result.rows[0];

  if (!household) {
    throw new Error('Nenhum caso familiar cadastrado.');
  }

  return household.id;
};

export const getHouseholdSnapshot = async (householdId?: string): Promise<HouseholdSnapshot> => {
  const resolvedHouseholdId = householdId ?? (await getPrimaryHouseholdId());

  const householdResult = await queryDatabase<HouseholdRow>('SELECT id, name FROM households WHERE id = $1', [
    resolvedHouseholdId
  ]);
  const household = householdResult.rows[0];

  if (!household) {
    throw new Error('Caso familiar nao encontrado.');
  }

  const [incomeResult, debtResult, envelopeResult, documentResult] = await Promise.all([
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
    ),
    queryDatabase<DocumentRow>(
      `
        SELECT id, household_id, file_server_document_id, filename, mime_type, size_in_bytes, status, signed_download_url
        FROM documents
        WHERE household_id = $1
        ORDER BY created_at DESC
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
    })),
    documents: documentResult.rows.map((row) => ({
      id: row.id,
      householdId: row.household_id,
      fileServerDocumentId: row.file_server_document_id,
      filename: row.filename,
      mimeType: row.mime_type,
      sizeInBytes: row.size_in_bytes,
      status: row.status,
      signedDownloadUrl: row.signed_download_url,
      ocrEntries: []
    }))
  };
};