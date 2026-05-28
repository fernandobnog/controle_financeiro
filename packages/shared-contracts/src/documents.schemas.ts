import { z } from 'zod';

import { householdScopeQuerySchema, resourceIdentifierSchema } from './resource.schemas.js';

export const documentStatusSchema = z.enum(['received', 'processing', 'review', 'approved', 'rejected']);

export const ocrEntrySchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  amount: z.number(),
  occurredAt: z.string().min(1),
  category: z.string().min(1),
  reviewed: z.boolean().default(false)
});

export const documentListItemSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1)
});

export const documentCreatedSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  status: documentStatusSchema
});

export const documentReviewSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  status: documentStatusSchema,
  signedDownloadUrl: z.string().nullable(),
  ocrEntries: z.array(ocrEntrySchema).default([])
});

export const documentsListQuerySchema = householdScopeQuerySchema;

export const documentReviewParamsSchema = z
  .object({
    documentId: resourceIdentifierSchema
  })
  .strict();

export const updateOcrEntryParamsSchema = z
  .object({
    documentId: resourceIdentifierSchema,
    entryId: resourceIdentifierSchema
  })
  .strict();

export const registerDocumentInputSchema = z.object({
  householdId: z.string().min(1),
  fileServerDocumentId: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeInBytes: z.number().int().positive(),
  signedDownloadUrl: z.string().nullable().default(null)
});

export const fileServerUploadReceiptSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeInBytes: z.number().int().positive(),
  signedDownloadUrl: z.string().nullable()
});

export const updateOcrEntryInputSchema = z
  .object({
    description: z.string().min(1).optional(),
    amount: z.number().finite().optional(),
    occurredAt: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    reviewed: z.boolean().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'Informe ao menos um campo para atualizacao.'
  });

export type DocumentStatus = z.infer<typeof documentStatusSchema>;
export type OcrEntry = z.infer<typeof ocrEntrySchema>;
export type DocumentListItem = z.infer<typeof documentListItemSchema>;
export type DocumentCreated = z.infer<typeof documentCreatedSchema>;
export type DocumentReview = z.infer<typeof documentReviewSchema>;
export type DocumentsListQuery = z.infer<typeof documentsListQuerySchema>;
export type DocumentReviewParams = z.infer<typeof documentReviewParamsSchema>;
export type RegisterDocumentInput = z.infer<typeof registerDocumentInputSchema>;
export type FileServerUploadReceipt = z.infer<typeof fileServerUploadReceiptSchema>;
export type UpdateOcrEntryInput = z.infer<typeof updateOcrEntryInputSchema>;
export type UpdateOcrEntryParams = z.infer<typeof updateOcrEntryParamsSchema>;

export const documentSchema = documentReviewSchema;
export const fileServerDocumentSchema = fileServerUploadReceiptSchema;

export type DocumentRecord = DocumentReview;
export type FileServerDocument = FileServerUploadReceipt;