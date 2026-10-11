import { z } from 'zod'

/**
 * Accounts: what `/api/auth/*` takes and answers. The same schemas check the app's forms and
 * the server's requests, so a refusal names a field the form has and says why with a
 * screen-text key (the messages below), never with wording of its own.
 */

/** Admins are made by a server command, never by signing up. */
export const USER_ROLES = ['learner', 'admin'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const MIN_PASSWORD_LENGTH = 8
/** Far more than anyone types; it bounds the work of hashing one. */
export const MAX_PASSWORD_LENGTH = 200
export const EMAIL_CODE_LENGTH = 6

/** An address as the server keeps it: no spaces around it, all in lower case. */
const emailAddress = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'auth.emailRequired')
  .max(254, 'auth.emailInvalid')
  .pipe(z.email('auth.emailInvalid'))

const newPassword = z
  .string()
  .min(1, 'auth.passwordRequired')
  .min(MIN_PASSWORD_LENGTH, 'auth.passwordTooShort')
  .max(MAX_PASSWORD_LENGTH, 'auth.passwordTooLong')

/** The digits of an emailed code; spaces typed between or around them are dropped. */
const emailCode = z
  .string()
  .transform((value) => value.replace(/\s+/g, ''))
  .pipe(z.string().regex(new RegExp(`^\\d{${EMAIL_CODE_LENGTH}}$`), 'auth.codeInvalid'))

export const signUpRequestSchema = z.object({ email: emailAddress, password: newPassword })

/**
 * Signing in only needs something to check: a wrong address and a wrong password get the same
 * answer, so neither is judged here beyond being there.
 */
export const signInRequestSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'auth.emailRequired').max(254, 'auth.emailInvalid'),
  password: z.string().min(1, 'auth.passwordRequired').max(MAX_PASSWORD_LENGTH, 'auth.invalid'),
})

export const verifyEmailRequestSchema = z.object({ code: emailCode })

export const forgotPasswordRequestSchema = z.object({ email: emailAddress })

export const resetPasswordRequestSchema = z.object({
  email: emailAddress,
  code: emailCode,
  password: newPassword,
})

/** `credential` is the ID token Google hands the browser. */
export const googleSignInRequestSchema = z.object({ credential: z.string().min(1).max(4096) })

/** Who is signed in, as far as a screen needs to know. */
export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  role: z.enum(USER_ROLES),
  displayName: z.string().nullable(),
})

export type SessionUser = z.infer<typeof sessionUserSchema>

/** `GET /api/auth/session`, and what signing in or up answers: `null` for a guest. */
export const authSessionSchema = z.object({ user: sessionUserSchema.nullable() })

export type AuthSession = z.infer<typeof authSessionSchema>

export type SignUpRequest = z.infer<typeof signUpRequestSchema>
export type SignInRequest = z.infer<typeof signInRequestSchema>
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>
