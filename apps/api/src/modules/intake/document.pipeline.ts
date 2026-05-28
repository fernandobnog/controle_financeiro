import { randomUUID } from 'node:crypto';

import { queryDatabase, getDatabasePool } from '../../infra/db/database.js';
import { env } from '../../infra/env.js';
import * as llamaparse from '../../infra/clients/llamaparse.js';
import * as openrouter from '../../infra/clients/openrouter.js';

export type PipelineStatus =
  | 'received'
  | 'stored'
  | 'parse-submitted'
  | 'parse-completed'
  | 'classification-completed'
  | 'review-pending'
  | 'review-partial'
  | 'consolidated'
  | 'rejected';

interface ExtractedItemRow {
  id: string;
  document_id: string;
  household_id: string;
  item_type: string;
  description: string;
  amount: string | number;
  occurred_at: string | null;
  recurrence: string | null;
  creditor: string | null;
  ai_confidence: string | number;
  ai_category: string | null;
  review_status: string;
}

const CLASSIFICATION_PROMPT = `
Você é um assistente financeiro especialista. Analise o conteúdo extraído de um documento financeiro e classifique cada item.

Para cada linha de transação ou informação relevante, retorne um objeto JSON com:
- description: descrição limpa da transação (máx. 100 caracteres)
- amount: valor numérico positivo em reais (sem R$)
- occurred_at: data em formato YYYY-MM-DD ou null se não identificada
- item_type: um dos tipos: "income", "fixed-expense", "variable-expense", "debt-installment", "future-installment", "overdue-debt", "loan-contract", "credit-card-purchase", "dda-obligation", "ignored", "ambiguous"
- creditor: nome do credor se for dívida ou parcela, null caso contrário
- ai_confidence: número entre 0 e 1 representando a confiança na classificação
- ai_category: categoria sugerida (ex: "salário", "aluguel", "cartão de crédito", "empréstimo")

Retorne um array JSON válido. Não inclua explicações fora do JSON.
Ignore cabeçalhos, rodapés, saldos totais e linhas sem valor monetário.
Se não houver dados relevantes, retorne um array vazio [].
`;

export const recordPipelineEvent = async (
  documentId: string,
  status: PipelineStatus,
  detail?: string
): Promise<void> => {
  await queryDatabase(
    `INSERT INTO document_pipeline_events (id, document_id, event_type, status, detail)
     VALUES ($1, $2, $3, $4, $5)`,
    [randomUUID(), documentId, 'pipeline', status, detail ?? null]
  );

  await queryDatabase(
    `UPDATE documents SET pipeline_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [status, documentId]
  );
};

interface ClassifiedItem {
  description: string;
  amount: number;
  occurred_at: string | null;
  item_type: string;
  creditor: string | null;
  ai_confidence: number;
  ai_category: string | null;
}

const classifyWithOpenRouter = async (markdown: string): Promise<ClassifiedItem[]> => {
  const response = await openrouter.chatCompletion([
    { role: 'system', content: CLASSIFICATION_PROMPT },
    {
      role: 'user',
      content: `Conteúdo extraído do documento:\n\n${markdown.slice(0, 8000)}`
    }
  ]);

  const content = response.choices[0]?.message?.content ?? '[]';
  const jsonMatch = /\[[\s\S]*\]/u.exec(content);

  if (!jsonMatch) {
    return [];
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown[];

    return parsed
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item) => ({
        description: String(item['description'] ?? 'Item sem descrição').slice(0, 200),
        amount: Math.abs(Number(item['amount']) || 0),
        occurred_at: typeof item['occurred_at'] === 'string' ? item['occurred_at'] : null,
        item_type: String(item['item_type'] ?? 'ambiguous'),
        creditor: typeof item['creditor'] === 'string' ? item['creditor'] : null,
        ai_confidence: Math.min(1, Math.max(0, Number(item['ai_confidence']) || 0)),
        ai_category: typeof item['ai_category'] === 'string' ? item['ai_category'] : null
      }));
  } catch {
    return [];
  }
};

const saveExtractedItems = async (
  documentId: string,
  householdId: string,
  items: ClassifiedItem[]
): Promise<void> => {
  const pool = await getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Remove itens anteriores do mesmo documento (reprocessamento)
    await client.query('DELETE FROM extracted_items WHERE document_id = $1', [documentId]);

    for (const item of items) {
      await client.query(
        `INSERT INTO extracted_items (
          id, document_id, household_id, item_type, description,
          amount, occurred_at, creditor, ai_confidence, ai_category, review_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')`,
        [
          randomUUID(),
          documentId,
          householdId,
          item.item_type,
          item.description,
          item.amount,
          item.occurred_at,
          item.creditor,
          item.ai_confidence,
          item.ai_category
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const orchestrateDocumentProcessing = async (
  documentId: string,
  householdId: string,
  fileBuffer: Buffer,
  mimeType: string,
  filename: string
): Promise<void> => {
  await recordPipelineEvent(documentId, 'stored');

  if (env.MOCK_EXTERNAL_SERVICES) {
    // Mock: simula classificação com itens de exemplo
    const mockItems: ClassifiedItem[] = [
      {
        description: `Renda principal — ${filename}`,
        amount: 3500,
        occurred_at: new Date().toISOString().slice(0, 10),
        item_type: 'income',
        creditor: null,
        ai_confidence: 0.9,
        ai_category: 'salário'
      },
      {
        description: 'Parcela de empréstimo',
        amount: 450,
        occurred_at: new Date().toISOString().slice(0, 10),
        item_type: 'debt-installment',
        creditor: 'Banco Exemplo',
        ai_confidence: 0.85,
        ai_category: 'empréstimo'
      },
      {
        description: 'Conta de energia',
        amount: 180,
        occurred_at: new Date().toISOString().slice(0, 10),
        item_type: 'fixed-expense',
        creditor: null,
        ai_confidence: 0.8,
        ai_category: 'utilidades'
      }
    ];

    await saveExtractedItems(documentId, householdId, mockItems);
    await recordPipelineEvent(documentId, 'classification-completed');
    await recordPipelineEvent(documentId, 'review-pending');

    return;
  }

  let markdown: string;

  try {
    await recordPipelineEvent(documentId, 'parse-submitted');
    const jobId = await llamaparse.submitDocument(fileBuffer, mimeType, filename);
    const result = await llamaparse.pollJobResult(jobId);

    markdown = result.markdown;
    await recordPipelineEvent(documentId, 'parse-completed');
  } catch (parseError) {
    const errorMessage = parseError instanceof Error ? parseError.message : 'Erro desconhecido no parsing';

    await recordPipelineEvent(documentId, 'rejected', `Falha no parsing: ${errorMessage.slice(0, 200)}`);

    // Fallback: cria item ambíguo para revisão manual
    const fallbackItems: ClassifiedItem[] = [
      {
        description: `Documento ${filename} — parsing falhou, revisão manual necessária`,
        amount: 0,
        occurred_at: new Date().toISOString().slice(0, 10),
        item_type: 'ambiguous',
        creditor: null,
        ai_confidence: 0,
        ai_category: null
      }
    ];

    await saveExtractedItems(documentId, householdId, fallbackItems);
    await recordPipelineEvent(documentId, 'review-pending');

    return;
  }

  try {
    const classifiedItems = await classifyWithOpenRouter(markdown);
    const validItems = classifiedItems.length > 0 ? classifiedItems : [
      {
        description: `Documento ${filename} — nenhum item identificado automaticamente`,
        amount: 0,
        occurred_at: new Date().toISOString().slice(0, 10),
        item_type: 'ambiguous',
        creditor: null,
        ai_confidence: 0,
        ai_category: null
      }
    ];

    await saveExtractedItems(documentId, householdId, validItems);
    await recordPipelineEvent(documentId, 'classification-completed');
    await recordPipelineEvent(documentId, 'review-pending');
  } catch (classifyError) {
    const errorMessage = classifyError instanceof Error ? classifyError.message : 'Erro na classificação';

    await recordPipelineEvent(documentId, 'review-pending', `Classificação automática falhou: ${errorMessage.slice(0, 200)}`);

    // Fallback: salva o markdown como item único para revisão manual
    const fallbackItems: ClassifiedItem[] = [
      {
        description: `Documento ${filename} — revise os itens manualmente`,
        amount: 0,
        occurred_at: new Date().toISOString().slice(0, 10),
        item_type: 'ambiguous',
        creditor: null,
        ai_confidence: 0,
        ai_category: null
      }
    ];

    await saveExtractedItems(documentId, householdId, fallbackItems);
  }
};

export const getExtractedItemsByDocument = async (documentId: string): Promise<ExtractedItemRow[]> => {
  const result = await queryDatabase<ExtractedItemRow>(
    `SELECT id, document_id, household_id, item_type, description,
            amount, occurred_at, recurrence, creditor, ai_confidence, ai_category, review_status
     FROM extracted_items
     WHERE document_id = $1
     ORDER BY ai_confidence DESC, created_at ASC`,
    [documentId]
  );

  return result.rows;
};

export const updateExtractedItem = async (
  itemId: string,
  accountId: string,
  decision: string,
  correctedFields?: {
    description?: string;
    amount?: number;
    itemType?: string;
    category?: string;
  }
): Promise<void> => {
  const assignments: string[] = ['review_status = $2', 'updated_at = CURRENT_TIMESTAMP'];
  const values: unknown[] = [itemId, decision];

  if (correctedFields?.description) {
    assignments.push(`description = $${values.length + 1}`);
    values.push(correctedFields.description);
  }

  if (correctedFields?.amount !== undefined) {
    assignments.push(`amount = $${values.length + 1}`);
    values.push(correctedFields.amount);
  }

  if (correctedFields?.itemType) {
    assignments.push(`item_type = $${values.length + 1}`);
    values.push(correctedFields.itemType);
  }

  if (correctedFields?.category) {
    assignments.push(`ai_category = $${values.length + 1}`);
    values.push(correctedFields.category);
  }

  // Registra quem revisou
  assignments.push(`reviewed_by = (SELECT id FROM users WHERE EXISTS (SELECT 1 FROM accounts WHERE id = $${values.length + 1}))`);
  values.push(accountId);
  assignments.push(`reviewed_at = CURRENT_TIMESTAMP`);

  await queryDatabase(
    `UPDATE extracted_items SET ${assignments.join(', ')} WHERE id = $1`,
    values
  );
};

export const getPipelineStatus = async (documentId: string): Promise<{ status: PipelineStatus; detail: string | null; timestamp: string } | null> => {
  const result = await queryDatabase<{ status: string; detail: string | null; created_at: Date }>(
    `SELECT status, detail, created_at
     FROM document_pipeline_events
     WHERE document_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [documentId]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    status: row.status as PipelineStatus,
    detail: row.detail,
    timestamp: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
  };
};
