import { z } from 'zod';

export const dtiClassificationSchema = z.enum(['sustainable', 'alert', 'high-risk', 'critical']);

export const diagnosisSchema = z.object({
  householdId: z.string().min(1),
  householdName: z.string().min(1),
  monthlyIncome: z.number().nonnegative(),
  monthlyDebtPayments: z.number().nonnegative(),
  dtiPercent: z.number().nonnegative(),
  classification: dtiClassificationSchema,
  debtCount: z.number().int().nonnegative(),
  totalDebtBalance: z.number().nonnegative(),
  budgetRemaining: z.number()
});

export type DtiClassification = z.infer<typeof dtiClassificationSchema>;
export type FinancialDiagnosis = z.infer<typeof diagnosisSchema>;