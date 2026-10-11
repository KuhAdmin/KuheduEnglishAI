import type { FieldError } from 'react-hook-form'
import { isTranslationKey, useT } from '@/shared/lib/i18n'

/**
 * A field's problem in the learner's language. The schemas and the server both report problems
 * as screen-text keys (see `@kuhedu/contracts`), so the form translates while rendering.
 */
export function useFieldError() {
  const t = useT()
  return (error: FieldError | undefined) =>
    error?.message && isTranslationKey(error.message) ? t(error.message) : undefined
}
