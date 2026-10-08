import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { StepScreen } from '@/shared/ui/StepScreen'

export type LessonNoticeProps = {
  /** Which day this is about, when the title does not say. */
  eyebrow?: string
  title: string
  subtitle: string
  /** The week's overview. */
  backTo: string
}

/** A screen of a day that has nothing to do yet: it says so, and leads back to the week. */
export function LessonNotice({ eyebrow, title, subtitle, backTo }: LessonNoticeProps) {
  const t = useT()

  return (
    <StepScreen
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      footer={
        <Button asChild size="lg" fullWidth>
          <Link to={backTo}>
            <ArrowLeft aria-hidden="true" className="size-5" />
            {t('lessonDay.back')}
          </Link>
        </Button>
      }
    >
      {null}
    </StepScreen>
  )
}
