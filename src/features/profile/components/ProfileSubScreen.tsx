import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useT } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { IconButton } from '@/shared/ui/IconButton'
import { StepScreen } from '@/shared/ui/StepScreen'

export type ProfileSubScreenProps = {
  title: string
  subtitle?: string
  children: ReactNode
  /** A pinned action, for a setting that is saved by a button and not on the tap. */
  footer?: ReactNode
}

/** One setting opened from Profile: its own full screen, with the way back at the top. */
export function ProfileSubScreen({ title, subtitle, children, footer }: ProfileSubScreenProps) {
  const t = useT()

  return (
    <StepScreen
      title={title}
      subtitle={subtitle}
      footer={footer}
      topBar={
        <div className="flex">
          <IconButton asChild label={t('profile.back')} className="-ms-2">
            <Link to={paths.profile}>
              <ArrowLeft aria-hidden="true" className="size-6" />
            </Link>
          </IconButton>
        </div>
      }
    >
      {children}
    </StepScreen>
  )
}
