import { Check } from 'lucide-react'
import { useState } from 'react'
import type { To } from 'react-router'
import { challengeText } from '@/shared/lib/curriculum/weekChallenges'
import {
  CHALLENGE_LEVELS,
  type ChallengeLevel,
  type WeekScenarios,
} from '@/shared/lib/curriculum/weekScenarios'
import { useLanguage, useT, type TranslationKey } from '@/shared/lib/i18n'
import { ChoiceChips } from '@/shared/ui/ChoiceChips'
import { ScenePicture } from '@/shared/ui/ScenePicture'
import { StepScreen } from '@/shared/ui/StepScreen'
import { LessonTopBar } from './LessonTopBar'
import { OptionalDayActions } from './OptionalDayActions'

const levelTexts: Record<ChallengeLevel, { name: TranslationKey; about: TranslationKey }> = {
  easier: { name: 'lessonDay.extend.easier', about: 'lessonDay.extend.easierAbout' },
  standard: { name: 'lessonDay.extend.standard', about: 'lessonDay.extend.standardAbout' },
  harder: { name: 'lessonDay.extend.harder', about: 'lessonDay.extend.harderAbout' },
}

export type ScenarioPickerProps = {
  /** The week's scenarios, in the order to offer them. Never empty. */
  scenarios: WeekScenarios
  /** Places (from 0) of the scenarios the learner has taken to the end. */
  done: readonly number[]
  level: ChallengeLevel
  onLevelChange: (level: ChallengeLevel) => void
  /** Where a scenario opens at a level. */
  hrefOf: (scenario: number, level: ChallengeLevel) => To
  /** The picture of the week's situation, if an admin uploaded one. */
  picture: string | null
  /** This day's place in the week, e.g. 7 of 7. */
  day: number
  dayCount: number
  /** Where the back arrow leads: the week's overview. */
  backTo: string
  /** Finish the day. Skipping it does the same: the day is optional. */
  onNext: () => void
}

/**
 * Day 7, the real-world challenge, before it starts: which situation to try, and with how much
 * help. The first scenario not taken yet is chosen to begin with, so "Start challenge" always
 * leads somewhere new; one taken to its end is ticked.
 */
export function ScenarioPicker({
  scenarios,
  done,
  level,
  onLevelChange,
  hrefOf,
  picture,
  day,
  dayCount,
  backTo,
  onNext,
}: ScenarioPickerProps) {
  const t = useT()
  const language = useLanguage()
  const list = scenarios.scenarios
  const [chosen, setChosen] = useState<number | null>(null)

  const firstLeft = list.findIndex((_, index) => !done.includes(index))
  // An admin may shorten the list while it is open; fall back to what is still there.
  const selected = chosen !== null && chosen < list.length ? chosen : Math.max(firstLeft, 0)

  return (
    <StepScreen
      // Lower than the usual 16:9, so the choices start higher up the screen.
      media={<ScenePicture src={picture} className="aspect-5/2" />}
      eyebrow={t('lessonDay.optional')}
      title={t('lessonDay.extend.title')}
      subtitle={t('lessonDay.extend.subtitle')}
      topBar={<LessonTopBar backTo={backTo} day={day} dayCount={dayCount} />}
      footer={
        <OptionalDayActions
          practise={{ label: t('lessonDay.extend.start'), to: hrefOf(selected, level) }}
          started={list.some((_, index) => done.includes(index))}
          onNext={onNext}
        />
      }
    >
      <div className="flex animate-rise-in flex-col gap-6">
        <ChoiceChips
          legend={t('lessonDay.extend.scenario')}
          value={String(selected)}
          onChange={(value) => setChosen(Number(value))}
          options={list.map((scenario, index) => {
            const name = challengeText(scenario.name, language)
            return {
              value: String(index),
              label: name.text,
              lang: name.lang,
              // A tick once taken to its end: what is left never rests on colour.
              mark: done.includes(index) && (
                <>
                  <span
                    aria-hidden="true"
                    className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"
                  >
                    <Check className="size-3" strokeWidth={3} />
                  </span>{' '}
                  <span className="sr-only">{t('lessonDay.done')}</span>
                </>
              ),
            }
          })}
        />
        <ChoiceChips<ChallengeLevel>
          layout="equal"
          legend={t('lessonDay.extend.level')}
          value={level}
          onChange={onLevelChange}
          options={CHALLENGE_LEVELS.map((value) => ({
            value,
            label: t(levelTexts[value].name),
            description: t(levelTexts[value].about),
          }))}
        />
      </div>
    </StepScreen>
  )
}
