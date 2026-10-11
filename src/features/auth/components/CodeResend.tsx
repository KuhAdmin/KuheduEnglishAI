import { useT } from '@/shared/lib/i18n'

export type CodeResendProps = {
  onResend: () => void
  /** What asking came to, said under the button; `null` before anyone asked. */
  message: string | null
}

/** "Send a new code", for a code that did not arrive or has run out, and what came of asking. */
export function CodeResend({ onResend, message }: CodeResendProps) {
  const t = useT()

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onResend}
        className="touch-target px-1 font-bold text-primary underline underline-offset-4 active:opacity-70"
      >
        {t('auth.resend')}
      </button>
      {/* Always there, so that what appears in it is announced. */}
      <p role="status" className="px-1 text-sm text-fg-muted">
        {message}
      </p>
    </div>
  )
}
