import type { SessionUser } from '@kuhedu/contracts'
import { useState } from 'react'
import { Link } from 'react-router'
import { signOut } from '@/shared/lib/account'
import { fillText, useT } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { Button } from '@/shared/ui/Button'
import { AuthFeedbackMessage } from './AuthFeedbackMessage'

export type SignedInNoticeProps = { user: SessionUser }

/**
 * What the account screen shows a learner who is already signed in: who they are, the way on,
 * and the way out. For an address whose code was never entered the way on is the code step and
 * nothing else: the account is not made until then.
 * TODO(auth): signing out moves to Profile once it has its account rows.
 */
export function SignedInNotice({ user }: SignedInNoticeProps) {
  const t = useT()
  const [failed, setFailed] = useState(false)

  const handleSignOut = async () => {
    setFailed(false)
    try {
      await signOut()
    } catch {
      setFailed(true)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* The address is the learner's own, written as they typed it, in whatever language. */}
      <p className="rounded-md bg-primary-soft px-4 py-3 font-bold break-words text-on-primary-soft">
        {fillText(t('auth.signedInAs'), { email: user.email })}
      </p>

      {!user.emailVerified && <p className="text-fg-muted">{t('auth.unverified')}</p>}

      <AuthFeedbackMessage feedback={failed ? 'failed' : null} />

      <div className="flex flex-col gap-3">
        <Button asChild size="lg" fullWidth>
          {user.emailVerified ? (
            // The front door: it sends a learner on from where they left off.
            <Link to={paths.landing}>{t('auth.continue')}</Link>
          ) : (
            <Link to={paths.verifyEmail}>{t('auth.verify.open')}</Link>
          )}
        </Button>
        <Button variant="outline" size="lg" fullWidth onClick={() => void handleSignOut()}>
          {t('auth.signOut')}
        </Button>
      </div>
    </div>
  )
}
