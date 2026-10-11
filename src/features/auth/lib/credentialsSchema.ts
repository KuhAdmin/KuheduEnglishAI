import { signInRequestSchema, signUpRequestSchema } from '@kuhedu/contracts'
import type { z } from 'zod'
import type { AuthMode } from '../types'

export type Credentials = { email: string; password: string }

/**
 * The rules of the two halves of the account screen. They are the server's own (it checks every
 * request with the same schemas), and their messages are screen-text keys, which the form
 * translates while rendering.
 */
export const credentialsSchemas: Record<AuthMode, z.ZodType<Credentials, Credentials>> = {
  signIn: signInRequestSchema,
  signUp: signUpRequestSchema,
}
