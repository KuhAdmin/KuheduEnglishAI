import { useState } from 'react'
import { WEEK_COUNT, weekKey } from '@/shared/lib/curriculum/curriculum'
import { curriculumText } from '@/shared/lib/curriculum/useCurriculum'
import { DEFAULT_LANGUAGE, isEnglish } from '@/shared/lib/i18n'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { SelectField } from '@/shared/ui/SelectField'
import { adminText } from '../adminText'
import { AdminPage } from '../components/AdminPage'
import { ChallengeEditor } from '../components/ChallengeEditor'
import { DialogueEditor } from '../components/DialogueEditor'
import { ReviewEditor } from '../components/ReviewEditor'
import { RoleplayEditor } from '../components/RoleplayEditor'
import { ScenariosEditor } from '../components/ScenariosEditor'
import { SentencesEditor } from '../components/SentencesEditor'
import { VocabularyEditor } from '../components/VocabularyEditor'
import { useEditLanguage } from '../hooks/useEditLanguage'
import { lessonDays, useLessonContent, type LessonDay } from '../hooks/useLessonContent'

const text = adminText.lessons

const weeks = Array.from({ length: WEEK_COUNT }, (_, index) => index + 1)
const english = (week: number, part: 'goal' | 'context') =>
  curriculumText(DEFAULT_LANGUAGE, weekKey(week, part))

/**
 * Fill each lesson day with a week's content. Every day is one screen shared by all weeks, so
 * this is content only: a week, a day, and what that day shows for that week.
 */
export function LessonsPage() {
  const [week, setWeek] = useState(1)
  const [day, setDay] = useState<LessonDay>('1')
  const content = useLessonContent(week)
  const { drafts } = content

  // Unfinished content that is not on screen also keeps the page from saving; say where it is.
  const unfinishedElsewhere = weeks.flatMap((other) =>
    lessonDays
      .filter(({ value }) => !(other === week && value === day) && content.unfinished[value](other))
      .map(({ value }) => `${text.week} ${other}, ${text.day} ${value}`),
  )

  // Translations are written for one learner language at a time; English is the content itself.
  const translationLanguages = useEditLanguage().options.filter(({ code }) => !isEnglish(code))
  const [chosenLanguage, setChosenLanguage] = useState('')
  const translateTo =
    translationLanguages.find(({ code }) => code === chosenLanguage) ?? translationLanguages[0]

  const weekOptions = weeks.map((number) => ({
    value: String(number),
    label: `${text.week} ${number} · ${english(number, 'goal')} — ${content.filled[day](number)}`,
  }))

  return (
    <AdminPage
      heading={text.heading}
      intro={text.intro}
      isDirty={drafts.isDirty}
      canSave={content.valid && unfinishedElsewhere.length === 0}
      isCustomised={drafts.isCustomised}
      status={drafts.status}
      onSave={drafts.save}
      onDiscard={drafts.discard}
      onResetToDefaults={drafts.resetToDefaults}
    >
      <div className="flex flex-col gap-4">
        <SelectField
          label={text.weekPicker}
          options={weekOptions}
          value={String(week)}
          onChange={(event) => setWeek(Number(event.target.value))}
        />
        <SegmentedControl<LessonDay>
          legend={text.dayLegend}
          value={day}
          onChange={setDay}
          options={lessonDays}
        />
        {translationLanguages.length > 1 && translateTo && (
          <SegmentedControl
            legend={text.translationLegend}
            value={translateTo.code}
            onChange={setChosenLanguage}
            options={translationLanguages.map(({ code, name }) => ({
              value: code,
              label: name,
              lang: code,
            }))}
          />
        )}
      </div>

      {unfinishedElsewhere.length > 0 && (
        <p role="alert" className="text-sm font-bold text-danger">
          {text.errorElsewhere} {unfinishedElsewhere.join('; ')}
        </p>
      )}

      {day === '1' && (
        <DialogueEditor
          {...content.dialogue}
          situation={english(week, 'context')}
          translateTo={translateTo}
        />
      )}
      {day === '2' && <VocabularyEditor {...content.vocabulary} translateTo={translateTo} />}
      {day === '3' && <SentencesEditor {...content.sentences} translateTo={translateTo} />}
      {day === '4' && <RoleplayEditor {...content.roleplay} translateTo={translateTo} />}
      {day === '5' && <ChallengeEditor {...content.challenge} translateTo={translateTo} />}
      {day === '6' && (
        <ReviewEditor
          review={content.review}
          situation={english(week, 'context')}
          translateTo={translateTo}
        />
      )}
      {day === '7' && (
        // A fresh editor for each week: it opens on that week's first scenario.
        <ScenariosEditor key={week} {...content.scenarios} translateTo={translateTo} />
      )}
    </AdminPage>
  )
}
