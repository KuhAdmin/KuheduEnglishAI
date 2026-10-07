import { Link } from 'react-router'
import { useT } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { Button } from '@/shared/ui/Button'
import type { AuthMode } from '../types'
import { GoogleLogo } from './GoogleLogo'

export type AuthAlternativesProps = {
  mode: AuthMode
  onGoogle: () => void
  /** Called as the visitor moves to the other half of the screen. */
  onSwitchMode: () => void
}

/** The ways in other than email and password: Google, guest, or the other half of the screen. */
export function AuthAlternatives({ mode, onGoogle, onSwitchMode }: AuthAlternativesProps) {
  const t = useT()
  const signingUp = mode === 'signUp'

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-3 text-sm font-bold text-fg-subtle">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        {t('auth.or')}
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </p>

      <div className="flex flex-col gap-3">
        <Button variant="outline" size="lg" fullWidth onClick={onGoogle}>
          <GoogleLogo className="size-5" />
          {t('auth.google')}
        </Button>
        <Button asChild variant="secondary" size="lg" fullWidth>
          <Link to={paths.onboarding}>{t('auth.guest')}</Link>
        </Button>
      </div>

      <p className="flex flex-wrap items-center justify-center gap-x-1 text-fg-muted">
        {t(signingUp ? 'auth.haveAccount' : 'auth.noAccount')}
        <Link
          to={signingUp ? paths.signIn : paths.signUp}
          replace
          onClick={onSwitchMode}
          className="inline-flex touch-target items-center px-1 font-bold text-primary underline underline-offset-4 active:opacity-70"
        >
          {t(signingUp ? 'auth.signInTab' : 'auth.signUpTab')}
        </Link>
      </p>
      {/* TODO(legal): "By continuing, you agree to our Terms & Privacy Policy", once those exist. */}
    </div>
  )
}
