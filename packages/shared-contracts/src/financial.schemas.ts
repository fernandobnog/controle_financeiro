import { z } from 'zod';

export const incomeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  amount: z.number().nonnegative(),
  recurring: z.boolean().default(true)
});

export const incomeDraftSchema = incomeSchema.omit({
  id: true
});

export const debtSchema = z.object({
  id: z.string().min(1),
  creditor: z.string().min(1),
  balance: z.number().nonnegative(),
  monthlyPayment: z.number().nonnegative(),
  interestRate: z.number().nonnegative(),
  overdueMonths: z.number().int().nonnegative().default(0)
});

export const debtDraftSchema = debtSchema.omit({
  id: true
});

export const budgetEnvelopeSchema = z.object({
  category: z.string().min(1),
  plannedAmount: z.number().nonnegative(),
  actualAmount: z.number().nonnegative().optional()
});

export const financialCaseSchema = z.object({
  householdId: z.string().min(1),
  householdName: z.string().min(1),
  incomes: z.array(incomeSchema).default([]),
  debts: z.array(debtSchema).default([]),
  envelopes: z.array(budgetEnvelopeSchema).default([])
});

export const onboardingProfileInputSchema = z.object({
  householdName: z.string().min(1),
  incomes: z.array(incomeDraftSchema).default([]),
  debts: z.array(debtDraftSchema).default([]),
  envelopes: z.array(budgetEnvelopeSchema).default([])
});

// ─── Tipos de item extraído pelo pipeline de IA ───────────────────────────────

export const extractedItemTypeSchema = z.enum([
  'income',
  'fixed-expense',
  'variable-expense',
  'debt-installment',
  'future-installment',
  'overdue-debt',
  'loan-contract',
  'credit-card-purchase',
  'dda-obligation',
  'ignored',
  'ambiguous'
]);

export const reviewDecisionSchema = z.enum([
  'pending',
  'approved',
  'corrected',
  'discarded',
  'merged'
]);

export const documentTypeSchema = z.enum([
  'bank-statement',
  'credit-card-statement',
  'loan-contract',
  'dda-print',
  'payment-receipt',
  'manual',
  'unknown'
]);

export const extractedItemSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
  itemType: extractedItemTypeSchema,
  description: z.string().min(1),
  amount: z.number(),
  occurredAt: z.string().nullable().optional(),
  recurrence: z.string().nullable().optional(),
  creditor: z.string().nullable().optional(),
  aiConfidence: z.number().min(0).max(1),
  aiCategory: z.string().nullable().optional(),
  reviewStatus: reviewDecisionSchema,
  consolidatedEntityType: z.string().nullable().optional(),
  consolidatedEntityId: z.string().nullable().optional()
});

export const reviewItemInputSchema = z.object({
  decision: reviewDecisionSchema,
  correctedDescription: z.string().min(1).optional(),
  correctedAmount: z.number().optional(),
  correctedItemType: extractedItemTypeSchema.optional(),
  correctedCategory: z.string().optional()
});

export type IncomeInput = z.infer<typeof incomeSchema>;
export type IncomeDraftInput = z.infer<typeof incomeDraftSchema>;
export type DebtInput = z.infer<typeof debtSchema>;
export type DebtDraftInput = z.infer<typeof debtDraftSchema>;
export type BudgetEnvelopeInput = z.infer<typeof budgetEnvelopeSchema>;
export type FinancialCase = z.infer<typeof financialCaseSchema>;
export type OnboardingProfileInput = z.infer<typeof onboardingProfileInputSchema>;
export type ExtractedItemType = z.infer<typeof extractedItemTypeSchema>;
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
export type ExtractedItem = z.infer<typeof extractedItemSchema>;
export type ReviewItemInput = z.infer<typeof reviewItemInputSchema>;
