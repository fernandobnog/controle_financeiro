import { z } from 'zod';

export const planStrategySchema = z.enum(['avalanche', 'snowball']);

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

export type PlanStrategy = z.infer<typeof planStrategySchema>;
export type PlanInstallment = z.infer<typeof planInstallmentSchema>;
export type ActionPlan = z.infer<typeof actionPlanSchema>;