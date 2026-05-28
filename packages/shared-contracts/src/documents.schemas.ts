import { z } from 'zod';

export const documentStatusSchema = z.enum(['received', 'processing', 'review', 'approved', 'rejected']);

export const ocrEntrySchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  amount: z.number(),
  occurredAt: z.string().min(1),
  category: z.string().min(1),
  reviewed: z.boolean().default(false)
});

export const documentSchema = z.object({
  id: z.string().min(1),
  householdId: z.string().min(1),
  fileServerDocumentId: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeInBytes: z.number().int().positive(),
  status: documentStatusSchema,
  signedDownloadUrl: z.string().nullable(),
  ocrEntries: z.array(ocrEntrySchema).default([])
});

export const registerDocumentInputSchema = z.object({
  householdId: z.string().min(1),
  fileServerDocumentId: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeInBytes: z.number().int().positive(),
  signedDownloadUrl: z.string().nullable().default(null)
});

export const fileServerDocumentSchema = z.object({
  id: z.string().min(1),
  householdId: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeInBytes: z.number().int().positive(),
  status: documentStatusSchema,
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
export type DocumentRecord = z.infer<typeof documentSchema>;
export type RegisterDocumentInput = z.infer<typeof registerDocumentInputSchema>;
export type FileServerDocument = z.infer<typeof fileServerDocumentSchema>;
export type UpdateOcrEntryInput = z.infer<typeof updateOcrEntryInputSchema>;