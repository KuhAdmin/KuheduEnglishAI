import { ChevronRight, MapPin, Target } from 'lucide-react'
import { Link } from 'react-router'
import type { CurriculumWeek } from '@/shared/lib/curriculum/useCurriculum'
import { cn } from '@/shared/lib/cn'
import { fillText, formatNumber, useLanguage, useT } from '@/shared/lib/i18n'
import { weekPath } from '../lib/journeyProgress'

export type WeekCardProps = {
  week: CurriculumWeek
  /** The week the learner is working on. */
  current?: boolean
}

/**
 * One week of the journey: what the learner will be able to do, where, and what they have to
 * manage there. The whole card opens the week's overview; the link itself is the goal, so it
 * is read once, by its heading.
 */
export function WeekCard({ week, current = false }: WeekCardProps) {
  const t = useT()
  const language = useLanguage()

  return (
    <article
      aria-current={current ? 'step' : undefined}
      className={cn(
        'relative flex flex-col gap-3 rounded-xl border-2 bg-surface p-4',
        'transition-transform duration-(--duration-fast) ease-standard active:scale-98',
        current ? 'border-primary shadow-sm' : 'border-transparent',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-extrabold text-primary">
          {fillText(t('journey.week'), { number: formatNumber(language, week.week) })}
        </p>
        {current && (
          <p className="rounded-full bg-primary-soft px-2 text-sm font-bold text-on-primary-soft">
            {t('journey.thisWeek')}
          </p>
        )}
        <ChevronRight aria-hidden="true" className="ms-auto size-5 shrink-0 text-fg-subtle" />
      </div>
      <h2 className="text-lg font-extrabold text-balance">
        <Link to={weekPath(week.week)} className="after:absolute after:inset-0 after:rounded-xl">
          {week.goal}
        </Link>
      </h2>

      <dl className="flex flex-col gap-3">
        <div className="flex gap-3">
          <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-fg-muted" />
          <div className="flex min-w-0 flex-col">
            <dt className="text-sm font-bold text-fg-muted">{t('journey.situation')}</dt>
            <dd>{week.context}</dd>
          </div>
        </div>
        <div className="flex gap-3">
          <Target aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-fg-muted" />
          <div className="flex min-w-0 flex-col">
            <dt className="text-sm font-bold text-fg-muted">{t('journey.challenge')}</dt>
            <dd>{week.challenge}</dd>
          </div>
        </div>
      </dl>
    </article>
  )
}
