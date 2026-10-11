import { ApiError } from '@/shared/lib/api/client'
import { isTranslationKey, type TranslationKey } from '@/shared/lib/i18n'
import type { AuthFeedback } from '../types'

export type AuthFailure<TField extends string> = {
  /** The fields the server found fault with, each with the screen text that says why. */
  fields: Partial<Record<TField, TranslationKey>>
  /** What to say when no field is at fault. */
  feedback: AuthFeedback | null
}

/**
 * What a call that did not succeed should show on a form with these fields. The server names
 * fields and screen texts; anything it says that this form or this build does not know is
 * treated as the call simply having failed.
 */
export function readFailure<TField extends string>(
  error: unknown,
  formFields: readonly TField[],
): AuthFailure<TField> {
  if (!(error instanceof ApiError)) return { fields: {}, feedback: 'failed' }
  if (error.code === 'unauthenticated') return { fields: {}, feedback: 'rejected' }
  if (error.code === 'rate_limited') return { fields: {}, feedback: 'tooMany' }

  const fields: Partial<Record<TField, TranslationKey>> = {}
  for (const field of formFields) {
    const key = error.fields[field]
    if (key && isTranslationKey(key)) fields[field] = key
  }
  return { fields, feedback: Object.keys(fields).length > 0 ? null : 'failed' }
}
