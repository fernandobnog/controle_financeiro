import { z } from 'zod';

export const planStrategySchema = z.enum(['avalanche', 'snowball']);

export const planInstallmentPreviewSchema = z.object({
  creditor: z.string().min(1),
  recommendedPayment: z.number().nonnegative()
});

export const planPreviewSchema = z.object({
  installments: z.array(planInstallmentPreviewSchema)
});

export const planComparisonSchema = z.object({
  avalanche: planPreviewSchema,
  snowball: planPreviewSchema
});

export const planInstallmentSchema = z.object({
  debtId: z.string().min(1),
  creditor: z.string().min(1),
  recommendedPayment: z.number().nonnegative(),
  priority: z.number().int().positive()
});

export const actionPlanSchema = z.object({
  strategy: planStrategySchema,
  totalDebtBalance: z.number().nonnegative(),
  monthlyIncome: z.number().nonnegative(),
  monthlyDebtPayments: z.number().nonnegative(),
  recommendedExtraPayment: z.number().nonnegative(),
  installments: z.array(planInstallmentSchema),
  projectedBudgetGap: z.number()
});

// ─── Comparativo de planos com explicação ─────────────────────────────────────

export const planInstallmentExplainedSchema = z.object({
  creditor: z.string().min(1),
  recommendedPayment: z.number().nonnegative(),
  priority: z.number().int().positive(),
  rationale: z.string()
});

export const planExplanationSchema = z.object({
  strategy: planStrategySchema,
  strategyLabel: z.string(),
  whyThisStrategy: z.string(),
  installments: z.array(planInstallmentExplainedSchema),
  estimatedMonthsToDebtFree: z.number().int().nonnegative().nullable(),
  totalInterestPaid: z.number().nonnegative().nullable(),
  monthlySurplus: z.number(),
  firstActionLabel: z.string()
});

export const planComparisonExplainedSchema = z.object({
  avalanche: planExplanationSchema,
  snowball: planExplanationSchema,
  recommendedStrategy: planStrategySchema,
  recommendationReason: z.string(),
  essentialMonthlyObligations: z.number().nonnegative(),
  surplusAfterEssentials: z.number()
});

export type PlanStrategy = z.infer<typeof planStrategySchema>;
export type PlanInstallmentPreview = z.infer<typeof planInstallmentPreviewSchema>;
export type PlanPreview = z.infer<typeof planPreviewSchema>;
export type PlanComparison = z.infer<typeof planComparisonSchema>;
export type PlanInstallment = z.infer<typeof planInstallmentSchema>;
export type ActionPlan = z.infer<typeof actionPlanSchema>;
export type PlanInstallmentExplained = z.infer<typeof planInstallmentExplainedSchema>;
export type PlanExplanation = z.infer<typeof planExplanationSchema>;
export type PlanComparisonExplained = z.infer<typeof planComparisonExplainedSchema>;