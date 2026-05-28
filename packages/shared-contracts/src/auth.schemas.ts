import { z } from 'zod';

export const accountRoleSchema = z.enum(['owner', 'member']);

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const registerInputSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  householdName: z.string().min(3),
  password: z.string().min(8)
});

export const passwordRecoveryRequestInputSchema = z.object({
  email: z.string().email()
});

export const passwordRecoveryRequestResultSchema = z.object({
  message: z.string().min(1),
  resetToken: z.string().min(1).nullable().default(null)
});

export const passwordResetInputSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8)
});

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8)
});

export const authMessageSchema = z.object({
  message: z.string().min(1)
});

export const authenticatedUserSchema = z.object({
  id: z.string().min(1),
  accountId: z.string().min(1),
  email: z.string().email(),
  fullName: z.string().min(1),
  role: accountRoleSchema
});

export const sessionUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1)
});

export const sessionSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.string().datetime(),
  user: sessionUserSchema
});

export type AccountRole = z.infer<typeof accountRoleSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
export type PasswordRecoveryRequestInput = z.infer<typeof passwordRecoveryRequestInputSchema>;
export type PasswordRecoveryRequestResult = z.infer<typeof passwordRecoveryRequestResultSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetInputSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
export type AuthMessage = z.infer<typeof authMessageSchema>;
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;