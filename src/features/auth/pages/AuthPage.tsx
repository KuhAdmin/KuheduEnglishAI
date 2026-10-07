import { ArrowLeft } from 'lucide-react'
import { Link, Navigate, useMatch, useNavigate } from 'react-router'
import { useLandingConfig } from '@/shared/lib/appConfig/useLandingConfig'
import { useT } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { BrandLockup } from '@/shared/ui/BrandLockup'
import { IconButton } from '@/shared/ui/IconButton'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { AuthAlternatives } from '../components/AuthAlternatives'
import { AuthLanguageSelect } from '../components/AuthLanguageSelect'
import { CredentialsForm } from '../components/CredentialsForm'
import { useCredentialsForm } from '../hooks/useCredentialsForm'
import { useSessionStore } from '../store/useSessionStore'
import type { AuthMode } from '../types'

const modePaths = { signIn: paths.signIn, signUp: paths.signUp } satisfies Record<AuthMode, string>

/**
 * Sign in / sign up, between the landing page and onboarding. One screen serves both paths, so
 * what was typed survives switching halves. See useCredentialsForm for what works today.
 */
export function AuthPage() {
  const t = useT()
  const navigate = useNavigate()
  const mode: AuthMode = useMatch(paths.signUp) ? 'signUp' : 'signIn'
  const { brand } = useLandingConfig()
  const role = useSessionStore((state) => state.role)
  const form = useCredentialsForm(mode)

  // Only on the sign-in half, so an admin can still walk the newcomer's path in this browser.
  if (mode === 'signIn' && role === 'admin') return <Navigate to={paths.admin} replace />

  const handleModeChange = (next: AuthMode) => {
    form.clearMessages()
    // Replaced, so Back leaves the screen instead of flipping between its halves.
    navigate(modePaths[next], { replace: true })
  }

  const [beforeBrand, afterBrand] = t('auth.title').split('{brand}')

  return (
    <div className="flex flex-col gap-5 pt-2 pb-6">
      {/* Two rows: the brand name and the language do not both fit beside Back on a small phone. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <IconButton asChild label={t('auth.back')} className="-ms-2">
            <Link to={paths.landing}>
              <ArrowLeft aria-hidden="true" className="size-6" />
            </Link>
          </IconButton>
          <AuthLanguageSelect />
        </div>
        <BrandLockup {...brand} />
      </div>

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-balance">
          {beforeBrand}
          {afterBrand !== undefined && <span className="text-primary">{brand.name}</span>}
          {afterBrand}
        </h1>
        <p className="text-fg-muted">
          {t(mode === 'signUp' ? 'auth.signUpSubtitle' : 'auth.signInSubtitle')}
        </p>
      </header>

      <SegmentedControl
        fullWidth
        legend={t('auth.modeLegend')}
        value={mode}
        onChange={handleModeChange}
        options={[
          { value: 'signIn', label: t('auth.signInTab') },
          { value: 'signUp', label: t('auth.signUpTab') },
        ]}
      />

      <CredentialsForm mode={mode} form={form} />

      <AuthAlternatives
        mode={mode}
        onGoogle={form.showUnavailable}
        onSwitchMode={form.clearMessages}
      />
    </div>
  )
}
