import { Check, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import type { CurriculumSection } from '@/shared/lib/curriculum/useCurriculum'
import { cn } from '@/shared/lib/cn'
import { fillText, formatNumber, useLanguage, useT } from '@/shared/lib/i18n'
import { sectionPath } from '../lib/journeyProgress'

export type SectionStatus = 'completed' | 'current' | 'upcoming'

export type SectionCardProps = {
  section: CurriculumSection
  status: SectionStatus
}

/**
 * One section of the journey, opening its weeks. Where the learner stands is said in words and
 * shown by a tick or a highlight — never by color alone. No section is locked.
 */
export function SectionCard({ section, status }: SectionCardProps) {
  const t = useT()
  const language = useLanguage()
  const number = (value: number) => formatNumber(language, value)
  const current = status === 'current'
  const completed = status === 'completed'

  return (
    <Link
      to={sectionPath(section.section)}
      aria-current={current ? 'step' : undefined}
      className={cn(
        'flex min-h-18 items-center gap-3 rounded-xl border-2 px-3 py-3',
        'transition-[transform,background-color] duration-(--duration-fast) ease-standard active:scale-98',
        current ? 'border-primary bg-primary-soft shadow-sm' : 'border-transparent bg-surface',
      )}
    >
      {/* The list is numbered already; this repeats the number for the eye. */}
      <span
        aria-hidden="true"
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-full text-lg font-extrabold',
          current && 'bg-primary text-on-primary',
          completed && 'bg-success-soft text-success',
          status === 'upcoming' && 'bg-surface-sunken text-fg-muted',
        )}
      >
        {number(section.section)}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            'font-bold text-balance',
            current ? 'text-lg font-extrabold text-on-primary-soft' : 'text-fg',
          )}
        >
          {section.title}
        </span>
        <span className={cn('text-sm', current ? 'text-on-primary-soft' : 'text-fg-muted')}>
          {fillText(t('journey.weekRange'), {
            from: number(section.firstWeek),
            to: number(section.lastWeek),
          })}
        </span>
        {current && (
          <span className="text-sm font-bold text-on-primary-soft">{t('journey.current')}</span>
        )}
        {completed && (
          <span className="flex items-center gap-1 text-sm font-bold text-success">
            <Check aria-hidden="true" className="size-4" strokeWidth={3} />
            {t('journey.completed')}
          </span>
        )}
      </span>

      <span
        aria-hidden="true"
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          current ? 'bg-primary text-on-primary' : 'text-fg-subtle',
        )}
      >
        <ChevronRight className="size-5" />
      </span>
    </Link>
  )
}
