import { z } from 'zod';

export const incomeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  amount: z.number().nonnegative(),
  recurring: z.boolean().default(true)
});

export const debtSchema = z.object({
  id: z.string().min(1),
  creditor: z.string().min(1),
  balance: z.number().nonnegative(),
  monthlyPayment: z.number().nonnegative(),
  interestRate: z.number().nonnegative(),
  overdueMonths: z.number().int().nonnegative().default(0)
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

export type IncomeInput = z.infer<typeof incomeSchema>;
export type DebtInput = z.infer<typeof debtSchema>;
export type BudgetEnvelopeInput = z.infer<typeof budgetEnvelopeSchema>;
export type FinancialCase = z.infer<typeof financialCaseSchema>;