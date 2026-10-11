import {
  authSessionSchema,
  noContentSchema,
  type ResetPasswordRequest,
  type SessionUser,
  type SignInRequest,
  type SignUpRequest,
} from '@kuhedu/contracts'
import type { z } from 'zod'
import { useSessionStore } from '@/shared/lib/account'
import { apiRequest } from '@/shared/lib/api/client'

const post = <TSchema extends z.ZodType>(path: string, schema: TSchema, body?: unknown) =>
  apiRequest(`/auth${path}`, { method: 'POST', schema, body })

/** A call that signs the browser in: the server sets its cookie, the store learns who it is. */
async function enter(path: string, body: unknown): Promise<SessionUser> {
  const { user } = await post(path, authSessionSchema, body)
  if (!user) throw new Error(`${path} answered without a user`)
  useSessionStore.getState().setUser(user)
  return user
}

export const signUp = (credentials: SignUpRequest) => enter('/sign-up', credentials)
export const signIn = (credentials: SignInRequest) => enter('/sign-in', credentials)
/** `credential` is the ID token Google handed this browser. */
export const signInWithGoogle = (credential: string) => enter('/google', { credential })

export async function verifyEmail(code: string): Promise<void> {
  await post('/verify-email', noContentSchema, { code })
  const { user, setUser } = useSessionStore.getState()
  if (user) setUser({ ...user, emailVerified: true })
}

export const resendVerificationCode = () => post('/verify-email/resend', noContentSchema)

/** Answers the same whether or not the address has an account. */
export const forgotPassword = (email: string) =>
  post('/password/forgot', noContentSchema, { email })

export const resetPassword = (request: ResetPasswordRequest) =>
  post('/password/reset', noContentSchema, request)
