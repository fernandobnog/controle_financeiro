import {
  documentSchema,
  registerDocumentInputSchema,
  updateOcrEntryInputSchema
} from '@controle-financeiro/shared-contracts';
import type { FastifyPluginAsync } from 'fastify';

import {
  getDocumentReview,
  listDocuments,
  registerDocument,
  updateOcrEntry
} from './documents.repository.js';

export const documentsRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { householdId?: string } }>('/documents', async (request) => {
    const documents = await listDocuments(request.query.householdId);

    return documents.map((item) => documentSchema.parse(item));
  });

  app.post<{ Body: unknown }>('/documents', async (request, reply) => {
    const payload = registerDocumentInputSchema.parse(request.body);
    const document = await registerDocument(payload);

    return reply.code(201).send(documentSchema.parse(document));
  });

  app.get<{ Params: { documentId: string } }>('/documents/:documentId/review', async (request, reply) => {
    const document = await getDocumentReview(request.params.documentId);

    if (!document) {
      return reply.code(404).send({ message: 'Documento nao encontrado.' });
    }

    return documentSchema.parse(document);
  });

  app.patch<{ Params: { documentId: string; entryId: string }; Body: unknown }>(
    '/documents/:documentId/ocr-entries/:entryId',
    async (request, reply) => {
      const payload = updateOcrEntryInputSchema.parse(request.body);
      const document = await updateOcrEntry(request.params.documentId, request.params.entryId, payload);

      if (!document) {
        return reply.code(404).send({ message: 'Documento nao encontrado.' });
      }

      return documentSchema.parse(document);
    }
  );
};