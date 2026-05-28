import { z } from 'zod';

export const dtiClassificationSchema = z.enum(['sustainable', 'alert', 'high-risk', 'critical']);

export const diagnosisSummarySchema = z.object({
  monthlyIncome: z.number().nonnegative(),
  monthlyDebtPayments: z.number().nonnegative(),
  dtiPercent: z.number().nonnegative(),
  classification: dtiClassificationSchema,
  totalDebtBalance: z.number().nonnegative()
});

export const diagnosisExplainedSchema = diagnosisSummarySchema.extend({
  classificationLabel: z.string(),
  classificationSummary: z.string(),
  situationNarrative: z.string(),
  firstRecommendedAction: z.string(),
  overdueDebtsCount: z.number().int().nonnegative(),
  monthlySurplus: z.number(),
  essentialMonthlyObligations: z.number().nonnegative()
});

export const diagnosisSchema = diagnosisSummarySchema;

export type DtiClassification = z.infer<typeof dtiClassificationSchema>;
export type FinancialDiagnosisSummary = z.infer<typeof diagnosisSummarySchema>;
export type FinancialDiagnosis = FinancialDiagnosisSummary;
export type FinancialDiagnosisExplained = z.infer<typeof diagnosisExplainedSchema>;
