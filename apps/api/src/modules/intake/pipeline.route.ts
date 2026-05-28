import { z } from 'zod';
import {
  reviewItemInputSchema
} from '@controle-financeiro/shared-contracts';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuthContext } from '../auth/auth.service.js';
import { AccountScopeError, resolveHouseholdId } from '../households/household.repository.js';
import { queryDatabase } from '../../infra/db/database.js';
import {
  orchestrateDocumentProcessing,
  getExtractedItemsByDocument,
  updateExtractedItem,
  getPipelineStatus
} from './document.pipeline.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff'
]);

const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const documentPipelineParamsSchema = z.object({ documentId: z.string().uuid() }).strict();
const itemParamsSchema = z.object({ documentId: z.string().uuid(), itemId: z.string().uuid() }).strict();

const processBodySchema = z.object({
  householdId: z.string().min(1).optional(),
  mimeType: z.string().min(1).max(100),
  filename: z.string().min(1).max(255),
  // Base64-encoded file content (max 10 MB decoded)
  fileBase64: z
    .string()
    .min(1)
    .refine((val) => {
      const decoded = Buffer.from(val, 'base64');
      return decoded.length <= MAX_PAYLOAD_BYTES;
    }, `O arquivo não pode ultrapassar ${MAX_PAYLOAD_BYTES / 1024 / 1024} MB.`)
}).strict();

interface ExtractedItemRow {
  id: string;
  item_type: string;
  description: string;
  amount: string | number;
  occurred_at: string | null;
  creditor: string | null;
  ai_confidence: string | number;
  ai_category: string | null;
  review_status: string;
}

interface DocumentRow {
  id: string;
  household_id: string;
  account_id: string;
}

export const pipelineRoute: FastifyPluginAsync = async (app) => {
  // POST /documents/:documentId/process — inicia o pipeline de parsing e classificação
  app.post<{ Body: unknown; Params: unknown }>('/documents/:documentId/process', async (request, reply) => {
    const authContext = requireAuthContext(request);
    const params = documentPipelineParamsSchema.parse(request.params);
    const body = processBodySchema.parse(request.body);

    if (!ALLOWED_MIME_TYPES.has(body.mimeType)) {
      return reply.code(400).send({
        message: `Tipo de arquivo não permitido. Use: ${[...ALLOWED_MIME_TYPES].join(', ')}`
      });
    }

    // Verifica acesso ao documento
    const docResult = await queryDatabase<DocumentRow>(
      'SELECT id, household_id, account_id FROM documents WHERE id = $1 AND account_id = $2',
      [params.documentId, authContext.accountId]
    );

    const doc = docResult.rows[0];

    if (!doc) {
      return reply.code(404).send({ message: 'Documento não encontrado.' });
    }

    let resolvedHouseholdId: string;

    try {
      resolvedHouseholdId = await resolveHouseholdId(authContext.accountId, body.householdId ?? doc.household_id);
    } catch (error) {
      if (error instanceof AccountScopeError) {
        return reply.code(403).send({ message: error.message });
      }
      throw error;
    }

    const fileBuffer = Buffer.from(body.fileBase64, 'base64');

    // Dispara assincronamente — retorna 202 imediatamente
    orchestrateDocumentProcessing(
      params.documentId,
      resolvedHouseholdId,
      fileBuffer,
      body.mimeType,
      body.filename
    ).catch(() => {
      // Falhas são registradas pelo próprio pipeline via recordPipelineEvent
    });

    return reply.code(202).send({
      documentId: params.documentId,
      message: 'Processamento iniciado. Consulte o status em /documents/:documentId/pipeline-status.'
    });
  });

  // GET /documents/:documentId/pipeline-status — status atual do pipeline
  app.get<{ Params: unknown }>('/documents/:documentId/pipeline-status', async (request, reply) => {
    const authContext = requireAuthContext(request);
    const params = documentPipelineParamsSchema.parse(request.params);

    const docResult = await queryDatabase<DocumentRow>(
      'SELECT id FROM documents WHERE id = $1 AND account_id = $2',
      [params.documentId, authContext.accountId]
    );

    if (!docResult.rows[0]) {
      return reply.code(404).send({ message: 'Documento não encontrado.' });
    }

    const status = await getPipelineStatus(params.documentId);

    if (!status) {
      return reply.code(404).send({ message: 'Nenhum evento de pipeline encontrado para este documento.' });
    }

    return status;
  });

  // GET /documents/:documentId/items — itens extraídos agrupados por tipo
  app.get<{ Params: unknown }>('/documents/:documentId/items', async (request, reply) => {
    const authContext = requireAuthContext(request);
    const params = documentPipelineParamsSchema.parse(request.params);

    const docResult = await queryDatabase<DocumentRow>(
      'SELECT id FROM documents WHERE id = $1 AND account_id = $2',
      [params.documentId, authContext.accountId]
    );

    if (!docResult.rows[0]) {
      return reply.code(404).send({ message: 'Documento não encontrado.' });
    }

    const items = await getExtractedItemsByDocument(params.documentId);

    // Agrupa por item_type
    const grouped: Record<string, ExtractedItemRow[]> = {};

    for (const item of items) {
      const key = item.item_type;

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(item);
    }

    return {
      documentId: params.documentId,
      totalItems: items.length,
      pendingReview: items.filter((i) => i.review_status === 'pending').length,
      groups: grouped
    };
  });

  // PATCH /documents/:documentId/items/:itemId — revisa um item extraído
  app.patch<{ Body: unknown; Params: unknown }>('/documents/:documentId/items/:itemId', async (request, reply) => {
    const authContext = requireAuthContext(request);
    const params = itemParamsSchema.parse(request.params);
    const payload = reviewItemInputSchema.parse(request.body);

    const docResult = await queryDatabase<DocumentRow>(
      'SELECT id FROM documents WHERE id = $1 AND account_id = $2',
      [params.documentId, authContext.accountId]
    );

    if (!docResult.rows[0]) {
      return reply.code(404).send({ message: 'Documento não encontrado.' });
    }

    const itemResult = await queryDatabase<{ id: string }>(
      'SELECT id FROM extracted_items WHERE id = $1 AND document_id = $2',
      [params.itemId, params.documentId]
    );

    if (!itemResult.rows[0]) {
      return reply.code(404).send({ message: 'Item não encontrado.' });
    }

    await updateExtractedItem(params.itemId, authContext.accountId, payload.decision, {
      description: payload.correctedDescription,
      amount: payload.correctedAmount,
      itemType: payload.correctedItemType,
      category: payload.correctedCategory
    });

    // Verifica se ainda há itens pendentes no documento
    const pendingResult = await queryDatabase<{ count: string }>(
      "SELECT COUNT(*) AS count FROM extracted_items WHERE document_id = $1 AND review_status = 'pending'",
      [params.documentId]
    );

    const pendingCount = Number(pendingResult.rows[0]?.count ?? 0);

    if (pendingCount === 0) {
      await queryDatabase(
        "UPDATE documents SET pipeline_status = 'consolidated', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [params.documentId]
      );
    } else {
      await queryDatabase(
        "UPDATE documents SET pipeline_status = 'review-partial', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [params.documentId]
      );
    }

    return reply.code(200).send({
      itemId: params.itemId,
      decision: payload.decision,
      pendingItemsRemaining: pendingCount
    });
  });
};
