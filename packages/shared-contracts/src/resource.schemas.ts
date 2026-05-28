import { z } from 'zod';

export const resourceIdentifierSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9-]+$/);

export const householdScopeQuerySchema = z
  .object({
    householdId: resourceIdentifierSchema.optional()
  })
  .strict();

export type ResourceIdentifier = z.infer<typeof resourceIdentifierSchema>;
export type HouseholdScopeQuery = z.infer<typeof householdScopeQuerySchema>;
