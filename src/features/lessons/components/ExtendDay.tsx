import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { challengeText } from '@/shared/lib/curriculum/weekChallenges'
import {
  DEFAULT_CHALLENGE_LEVEL,
  isChallengeLevel,
  type ChallengeLevel,
  type WeekScenarios,
} from '@/shared/lib/curriculum/weekScenarios'
import { useLanguage, useT, type TranslationKey } from '@/shared/lib/i18n'
import { useLessonProgressStore } from '@/shared/lib/learner/lessonProgress'
import type { RolePlayHelp } from '../hooks/useRolePlay'
import { RolePlayStep } from './RolePlayStep'
import { ScenarioPicker } from './ScenarioPicker'

/** The challenge that is open is kept in the address, so the phone's Back closes it. */
const SCENARIO_PARAM = 'scenario'
const LEVEL_PARAM = 'level'

const nothingDone: readonly number[] = []

/** A level is an amount of help; the conversation itself is the same at every level. */
const helpAt: Record<ChallengeLevel, RolePlayHelp> = {
  easier: 'shown',
  standard: 'asked',
  harder: 'none',
}

const levelNames: Record<ChallengeLevel, TranslationKey> = {
  easier: 'lessonDay.extend.easier',
  standard: 'lessonDay.extend.standard',
  harder: 'lessonDay.extend.harder',
}

export type ExtendDayProps = {
  week: number
  /** The week's scenarios; at least one. */
  scenarios: WeekScenarios
  /** The picture of the week's situation, if an admin uploaded one. */
  picture: string | null
  /** This day's place in the week, e.g. 7 of 7. */
  day: number
  dayCount: number
  /** Where the picker's back arrow leads: the week's overview. */
  backTo: string
  /** Finish the day. */
  onNext: () => void
}

/**
 * Day 7, the real-world challenge: the week's conversation in another place, chosen by the
 * learner and taken with as much help as they like. The challenge itself is Day 4's screen,
 * given the scenario's role-play and the level's amount of help; taking one to its end ticks
 * the scenario and returns to the picker.
 */
export function ExtendDay({
  week,
  scenarios,
  picture,
  day,
  dayCount,
  backTo,
  onNext,
}: ExtendDayProps) {
  const t = useT()
  const language = useLanguage()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const done = useLessonProgressStore((state) => state.scenariosDone[week]) ?? nothingDone
  const markDone = useLessonProgressStore((state) => state.markScenarioDone)
  // Kept here, above the picker, so the level chosen is still chosen after a challenge.
  const [level, setLevel] = useState<ChallengeLevel>(DEFAULT_CHALLENGE_LEVEL)

  // Scenarios are numbered from 1 in the address. One the week does not have is the picker.
  const place = Number(params.get(SCENARIO_PARAM)) - 1
  const open = Number.isInteger(place) ? scenarios.scenarios[place] : undefined

  if (open) {
    const asked = params.get(LEVEL_PARAM)
    const openLevel = isChallengeLevel(asked) ? asked : DEFAULT_CHALLENGE_LEVEL
    return (
      <RolePlayStep
        // Another scenario or level is another conversation, from its first line.
        key={`${place}-${openLevel}`}
        day={day}
        dayCount={dayCount}
        backTo={pathname}
        backLabel={t('lessonDay.extend.back')}
        endNote={t('lessonDay.extend.endChat')}
        eyebrow={`${challengeText(open.name, language).text} · ${t(levelNames[openLevel])}`}
        help={helpAt[openLevel]}
        roleplay={open.roleplay}
        onNext={() => {
          markDone(week, place)
          void navigate(pathname, { replace: true })
        }}
      />
    )
  }

  return (
    <ScenarioPicker
      scenarios={scenarios}
      done={done}
      level={level}
      onLevelChange={setLevel}
      hrefOf={(scenario, at) => ({
        search: `?${SCENARIO_PARAM}=${scenario + 1}&${LEVEL_PARAM}=${at}`,
      })}
      picture={picture}
      day={day}
      dayCount={dayCount}
      backTo={backTo}
      onNext={onNext}
    />
  )
}
