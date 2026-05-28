import { z } from 'zod';

export const dtiClassificationSchema = z.enum(['sustainable', 'alert', 'high-risk', 'critical']);

export const diagnosisSummarySchema = z.object({
  monthlyIncome: z.number().nonnegative(),
  monthlyDebtPayments: z.number().nonnegative(),
  dtiPercent: z.number().nonnegative(),
  classification: dtiClassificationSchema,
  totalDebtBalance: z.number().nonnegative()
});

export const diagnosisSchema = diagnosisSummarySchema;

export type DtiClassification = z.infer<typeof dtiClassificationSchema>;
export type FinancialDiagnosisSummary = z.infer<typeof diagnosisSummarySchema>;
export type FinancialDiagnosis = FinancialDiagnosisSummary;