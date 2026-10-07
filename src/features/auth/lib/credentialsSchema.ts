import { z } from 'zod'
import type { TranslationKey } from '@/shared/lib/i18n'
import type { AuthMode } from '../types'

export type Credentials = { email: string; password: string }

export const MIN_PASSWORD_LENGTH = 8

// Messages are screen-text keys; the form translates them while rendering.
const message = (key: TranslationKey) => key

/**
 * Signing in only needs something to check: whoever holds the accounts decides what matches,
 * and the local admin's name (lib/localAdmin) is not an email address.
 */
const signInSchema = z.object({
  email: z.string().trim().min(1, message('auth.emailRequired')),
  password: z.string().min(1, message('auth.passwordRequired')),
})

const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, message('auth.emailRequired'))
    .pipe(z.email(message('auth.emailInvalid'))),
  password: z
    .string()
    .min(1, message('auth.passwordRequired'))
    .min(MIN_PASSWORD_LENGTH, message('auth.passwordTooShort')),
})

export const credentialsSchemas: Record<AuthMode, z.ZodType<Credentials, Credentials>> = {
  signIn: signInSchema,
  signUp: signUpSchema,
}
