import { cn } from '@/shared/lib/cn'
import { useT, type TranslationKey } from '@/shared/lib/i18n'
import type { AuthFeedback } from '../types'

const messages = {
  rejected: 'auth.invalid',
  tooMany: 'auth.tooMany',
  failed: 'auth.failed',
  unavailable: 'auth.unavailable',
} satisfies Record<AuthFeedback, TranslationKey>

export type AuthFeedbackMessageProps = { feedback: AuthFeedback | null }

/** What the last attempt came to, said once to everyone, when no one field is at fault. */
export function AuthFeedbackMessage({ feedback }: AuthFeedbackMessageProps) {
  const t = useT()
  if (!feedback) return null

  return (
    <p
      role="alert"
      className={cn(
        'rounded-md px-4 py-3 font-bold',
        // Something not offered here is news, not a mistake.
        feedback === 'unavailable'
          ? 'bg-primary-soft text-on-primary-soft'
          : 'bg-danger-soft text-danger',
      )}
    >
      {t(messages[feedback])}
    </p>
  )
}
