import {
  documentsListQuerySchema,
  documentCreatedSchema,
  documentReviewParamsSchema,
  documentListItemSchema,
  documentReviewSchema,
  registerDocumentInputSchema,
  updateOcrEntryParamsSchema,
  updateOcrEntryInputSchema
} from '@controle-financeiro/shared-contracts';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuthContext } from '../auth/auth.service.js';
import { AccountScopeError } from '../households/household.repository.js';
import {
  getDocumentReview,
  listDocuments,
  registerDocument,
  updateOcrEntry
} from './documents.repository.js';

export const documentsRoute: FastifyPluginAsync = async (app) => {
  app.get('/documents', async (request, reply) => {
    const authContext = requireAuthContext(request);
    const query = documentsListQuerySchema.parse(request.query);

    try {
      const documents = await listDocuments(authContext.accountId, query.householdId);

      return documents.map((item) => documentListItemSchema.parse(item));
    } catch (error) {
      if (error instanceof AccountScopeError) {
        return reply.code(403).send({ message: error.message });
      }

      throw error;
    }
  });

  app.post<{ Body: unknown }>('/documents', async (request, reply) => {
    const authContext = requireAuthContext(request);
    const payload = registerDocumentInputSchema.parse(request.body);

    try {
      const document = await registerDocument(authContext.accountId, payload);

      return reply.code(201).send(documentCreatedSchema.parse(document));
    } catch (error) {
      if (error instanceof AccountScopeError) {
        return reply.code(403).send({ message: error.message });
      }

      throw error;
    }
  });

  app.get('/documents/:documentId/review', async (request, reply) => {
    const authContext = requireAuthContext(request);
    const params = documentReviewParamsSchema.parse(request.params);

    try {
      const document = await getDocumentReview(authContext.accountId, params.documentId);

      if (!document) {
        return reply.code(404).send({ message: 'Documento nao encontrado.' });
      }

      return documentReviewSchema.parse(document);
    } catch (error) {
      if (error instanceof AccountScopeError) {
        return reply.code(403).send({ message: error.message });
      }

      throw error;
    }
  });

  app.patch<{ Body: unknown }>('/documents/:documentId/ocr-entries/:entryId', async (request, reply) => {
      const authContext = requireAuthContext(request);
      const params = updateOcrEntryParamsSchema.parse(request.params);
      const payload = updateOcrEntryInputSchema.parse(request.body);

      try {
        const document = await updateOcrEntry(authContext.accountId, params.documentId, params.entryId, payload);

        if (!document) {
          return reply.code(404).send({ message: 'Documento nao encontrado.' });
        }

        return documentReviewSchema.parse(document);
      } catch (error) {
        if (error instanceof AccountScopeError) {
          return reply.code(403).send({ message: error.message });
        }

        throw error;
      }
    }
  );
};