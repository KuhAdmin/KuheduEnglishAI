import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useT } from '@/shared/lib/i18n'
import { IconButton } from '@/shared/ui/IconButton'
import { StepScreen } from '@/shared/ui/StepScreen'
import { usePlacementStore } from '../store/usePlacementStore'
import { StageProgress } from './StageProgress'

export type TestFrameProps = {
  title: string
  subtitle?: string
  /** Leave the test for now; answers so far are already saved. */
  onPause: () => void
  children: ReactNode
  footer: ReactNode
}

/**
 * Frame of every screen inside the test: pause, the three-part progress, the step itself.
 * Each screen is mounted afresh, and focus moves to its heading so it is announced.
 */
export function TestFrame({ title, subtitle, onPause, children, footer }: TestFrameProps) {
  const t = useT()
  const session = usePlacementStore((state) => state.session)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [])

  return (
    <StepScreen
      title={title}
      subtitle={subtitle}
      headingRef={heading}
      footer={footer}
      topBar={
        <div className="flex items-center gap-2">
          <IconButton label={t('placementTest.pause')} onClick={onPause} className="-ms-2">
            <X aria-hidden="true" className="size-6" />
          </IconButton>
          {session && <StageProgress session={session} />}
        </div>
      }
    >
      {children}
    </StepScreen>
  )
}
