import { randomUUID } from 'node:crypto';

import type {
  DocumentCreated,
  DocumentListItem,
  DocumentReview,
  OcrEntry,
  RegisterDocumentInput,
  UpdateOcrEntryInput
} from '@controle-financeiro/shared-contracts';

import { getDatabasePool, queryDatabase } from '../../infra/db/database.js';
import { AccountScopeError, resolveHouseholdId } from '../households/household.repository.js';

interface DocumentRow {
  id: string;
  account_id: string;
  household_id: string;
  file_server_document_id: string;
  filename: string;
  mime_type: string;
  size_in_bytes: number;
  status: DocumentReview['status'];
  signed_download_url: string | null;
}

interface OcrEntryRow {
  id: string;
  document_id: string;
  description: string;
  amount: string | number;
  occurred_at: string | Date;
  category: string;
  reviewed: boolean;
}

const toNumber = (value: string | number): number => Number(value);

const toDateString = (value: string | Date): string =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value;

const mapOcrEntry = (row: OcrEntryRow): OcrEntry => ({
  id: row.id,
  description: row.description,
  amount: toNumber(row.amount),
  occurredAt: toDateString(row.occurred_at),
  category: row.category,
  reviewed: row.reviewed
});

const mapDocumentListItem = (row: Pick<DocumentRow, 'id' | 'filename'>): DocumentListItem => ({
  id: row.id,
  filename: row.filename
});

const mapCreatedDocument = (row: Pick<DocumentRow, 'id' | 'filename' | 'status'>): DocumentCreated => ({
  id: row.id,
  filename: row.filename,
  status: row.status
});

const mapDocumentReview = (row: DocumentRow, ocrEntries: OcrEntry[]): DocumentReview => ({
  id: row.id,
  filename: row.filename,
  status: row.status,
  signedDownloadUrl: row.signed_download_url,
  ocrEntries
});

const createInitialOcrEntries = (documentId: string, filename: string): OcrEntry[] => {
  const today = new Date().toISOString().slice(0, 10);

  return [
    {
      id: randomUUID(),
      description: `Linha inicial para revisao de ${filename}`,
      amount: 0,
      occurredAt: today,
      category: 'unclassified',
      reviewed: false
    },
    {
      id: randomUUID(),
      description: 'Confirmar se este documento contem renda, despesa ou divida.',
      amount: 0,
      occurredAt: today,
      category: 'review-required',
      reviewed: false
    }
  ];
};

const getScopedDocumentRow = async (accountId: string, documentId: string): Promise<DocumentRow | null> => {
  const scopedResult = await queryDatabase<DocumentRow>(
    `
      SELECT id, account_id, household_id, file_server_document_id, filename, mime_type, size_in_bytes, status, signed_download_url
      FROM documents
      WHERE id = $1 AND account_id = $2
    `,
    [documentId, accountId]
  );
  const scopedRow = scopedResult.rows[0];

  if (scopedRow) {
    return scopedRow;
  }

  const foreignResult = await queryDatabase<Pick<DocumentRow, 'id'>>('SELECT id FROM documents WHERE id = $1', [documentId]);

  if (foreignResult.rows[0]) {
    throw new AccountScopeError('Conta sem acesso ao documento solicitado.');
  }

  return null;
};

export const listDocuments = async (accountId: string, householdId?: string): Promise<DocumentListItem[]> => {
  const resolvedHouseholdId = await resolveHouseholdId(accountId, householdId);
  const result = await queryDatabase<Pick<DocumentRow, 'id' | 'filename'>>(
    `
      SELECT id, filename
      FROM documents
      WHERE account_id = $1 AND household_id = $2
      ORDER BY created_at DESC
    `,
    [accountId, resolvedHouseholdId]
  );

  return result.rows.map((row) => mapDocumentListItem(row));
};

export const getDocumentReview = async (accountId: string, documentId: string): Promise<DocumentReview | null> => {
  const document = await getScopedDocumentRow(accountId, documentId);

  if (!document) {
    return null;
  }

  const ocrResult = await queryDatabase<OcrEntryRow>(
    `
      SELECT id, document_id, description, amount, occurred_at, category, reviewed
      FROM ocr_entries
      WHERE document_id = $1
      ORDER BY created_at ASC
    `,
    [documentId]
  );

  return mapDocumentReview(document, ocrResult.rows.map(mapOcrEntry));
};

export const registerDocument = async (accountId: string, input: RegisterDocumentInput): Promise<DocumentCreated> => {
  const resolvedHouseholdId = await resolveHouseholdId(accountId, input.householdId);
  const existingForeignDocument = await queryDatabase<Pick<DocumentRow, 'id' | 'account_id'>>(
    `
      SELECT id, account_id
      FROM documents
      WHERE file_server_document_id = $1
    `,
    [input.fileServerDocumentId]
  );

  const foreignDocument = existingForeignDocument.rows[0];

  if (foreignDocument && foreignDocument.account_id !== accountId) {
    throw new AccountScopeError('Conta sem acesso ao documento de arquivo informado.');
  }
  const pool = await getDatabasePool();
  const client = await pool.connect();
  const documentId = randomUUID();
  const initialEntries = createInitialOcrEntries(documentId, input.filename);

  try {
    await client.query('BEGIN');
    await client.query(
      `
        INSERT INTO documents (
          id,
          account_id,
          household_id,
          file_server_document_id,
          filename,
          mime_type,
          size_in_bytes,
          status,
          signed_download_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (file_server_document_id)
        DO UPDATE SET
          account_id = EXCLUDED.account_id,
          household_id = EXCLUDED.household_id,
          filename = EXCLUDED.filename,
          mime_type = EXCLUDED.mime_type,
          size_in_bytes = EXCLUDED.size_in_bytes,
          signed_download_url = EXCLUDED.signed_download_url,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        documentId,
        accountId,
        resolvedHouseholdId,
        input.fileServerDocumentId,
        input.filename,
        input.mimeType,
        input.sizeInBytes,
        'review',
        input.signedDownloadUrl
      ]
    );

    const existingDocumentResult = await client.query<DocumentRow>(
      `
        SELECT id, account_id, household_id, file_server_document_id, filename, mime_type, size_in_bytes, status, signed_download_url
        FROM documents
        WHERE file_server_document_id = $1 AND account_id = $2
      `,
      [input.fileServerDocumentId, accountId]
    );
    const existingDocument = existingDocumentResult.rows[0];

    if (!existingDocument) {
      throw new Error('Falha ao registrar documento persistido.');
    }

    const ocrCountResult = await client.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM ocr_entries WHERE document_id = $1',
      [existingDocument.id]
    );

    if (Number(ocrCountResult.rows[0]?.count ?? 0) === 0) {
      for (const entry of initialEntries) {
        await client.query(
          `
            INSERT INTO ocr_entries (id, document_id, description, amount, occurred_at, category, reviewed)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [entry.id, existingDocument.id, entry.description, entry.amount, entry.occurredAt, entry.category, entry.reviewed]
        );
      }
    }

    await client.query('COMMIT');

    return mapCreatedDocument(existingDocument);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateOcrEntry = async (
  accountId: string,
  documentId: string,
  entryId: string,
  payload: UpdateOcrEntryInput
): Promise<DocumentReview | null> => {
  const accessibleDocument = await getScopedDocumentRow(accountId, documentId);

  if (!accessibleDocument) {
    return null;
  }

  const assignments: string[] = [];
  const values: unknown[] = [];

  if (payload.description !== undefined) {
    assignments.push(`description = $${values.length + 1}`);
    values.push(payload.description);
  }

  if (payload.amount !== undefined) {
    assignments.push(`amount = $${values.length + 1}`);
    values.push(payload.amount);
  }

  if (payload.occurredAt !== undefined) {
    assignments.push(`occurred_at = $${values.length + 1}`);
    values.push(payload.occurredAt);
  }

  if (payload.category !== undefined) {
    assignments.push(`category = $${values.length + 1}`);
    values.push(payload.category);
  }

  if (payload.reviewed !== undefined) {
    assignments.push(`reviewed = $${values.length + 1}`);
    values.push(payload.reviewed);
  }

  if (assignments.length === 0) {
    return getDocumentReview(accountId, documentId);
  }

  values.push(entryId, documentId);

  await queryDatabase(
    `
      UPDATE ocr_entries
      SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length - 1} AND document_id = $${values.length}
    `,
    values
  );

  return getDocumentReview(accountId, documentId);
};