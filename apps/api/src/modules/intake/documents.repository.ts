import { randomUUID } from 'node:crypto';

import type {
  DocumentRecord,
  OcrEntry,
  RegisterDocumentInput,
  UpdateOcrEntryInput
} from '@controle-financeiro/shared-contracts';

import { getDatabasePool, queryDatabase } from '../../infra/db/database.js';
import { getPrimaryHouseholdId } from '../households/household.repository.js';

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

const mapDocument = (row: DocumentRow, ocrEntries: OcrEntry[]): DocumentRecord => ({
  id: row.id,
  householdId: row.household_id,
  fileServerDocumentId: row.file_server_document_id,
  filename: row.filename,
  mimeType: row.mime_type,
  sizeInBytes: row.size_in_bytes,
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

export const listDocuments = async (householdId?: string): Promise<DocumentRecord[]> => {
  const resolvedHouseholdId = householdId ?? (await getPrimaryHouseholdId());
  const result = await queryDatabase<DocumentRow>(
    `
      SELECT id, household_id, file_server_document_id, filename, mime_type, size_in_bytes, status, signed_download_url
      FROM documents
      WHERE household_id = $1
      ORDER BY created_at DESC
    `,
    [resolvedHouseholdId]
  );

  return result.rows.map((row) => mapDocument(row, []));
};

export const getDocumentReview = async (documentId: string): Promise<DocumentRecord | null> => {
  const [documentResult, ocrResult] = await Promise.all([
    queryDatabase<DocumentRow>(
      `
        SELECT id, household_id, file_server_document_id, filename, mime_type, size_in_bytes, status, signed_download_url
        FROM documents
        WHERE id = $1
      `,
      [documentId]
    ),
    queryDatabase<OcrEntryRow>(
      `
        SELECT id, document_id, description, amount, occurred_at, category, reviewed
        FROM ocr_entries
        WHERE document_id = $1
        ORDER BY created_at ASC
      `,
      [documentId]
    )
  ]);

  const document = documentResult.rows[0];

  if (!document) {
    return null;
  }

  return mapDocument(document, ocrResult.rows.map(mapOcrEntry));
};

export const registerDocument = async (input: RegisterDocumentInput): Promise<DocumentRecord> => {
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
          household_id,
          file_server_document_id,
          filename,
          mime_type,
          size_in_bytes,
          status,
          signed_download_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (file_server_document_id)
        DO UPDATE SET
          filename = EXCLUDED.filename,
          mime_type = EXCLUDED.mime_type,
          size_in_bytes = EXCLUDED.size_in_bytes,
          signed_download_url = EXCLUDED.signed_download_url,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        documentId,
        input.householdId,
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
        SELECT id, household_id, file_server_document_id, filename, mime_type, size_in_bytes, status, signed_download_url
        FROM documents
        WHERE file_server_document_id = $1
      `,
      [input.fileServerDocumentId]
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
    const persisted = await getDocumentReview(existingDocument.id);

    if (!persisted) {
      throw new Error('Documento nao encontrado apos persistencia.');
    }

    return persisted;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateOcrEntry = async (
  documentId: string,
  entryId: string,
  payload: UpdateOcrEntryInput
): Promise<DocumentRecord | null> => {
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
    return getDocumentReview(documentId);
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

  return getDocumentReview(documentId);
};