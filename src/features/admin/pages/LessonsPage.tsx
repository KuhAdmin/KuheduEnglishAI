import { Plus } from 'lucide-react'
import { useState } from 'react'
import { WEEK_COUNT, weekKey } from '@/shared/lib/curriculum/curriculum'
import { curriculumText } from '@/shared/lib/curriculum/useCurriculum'
import {
  builtInWeekDialogues,
  defaultWeekDialogues,
  MAX_DIALOGUE_LINES,
  WEEK_DIALOGUES_CONFIG_NAME,
  weekDialogue,
  weekDialoguesSchema,
  type DialogueLine,
  type WeekDialogue,
  type WeekDialogues,
} from '@/shared/lib/curriculum/weekDialogues'
import { DEFAULT_LANGUAGE, isEnglish } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { SelectField } from '@/shared/ui/SelectField'
import { TextField } from '@/shared/ui/TextField'
import { adminText } from '../adminText'
import { AdminPage } from '../components/AdminPage'
import { AdminSection } from '../components/AdminSection'
import { DialogueLineFields } from '../components/DialogueLineFields'
import { useEditLanguage } from '../hooks/useEditLanguage'
import { useSettingsDraft } from '../hooks/useSettingsDraft'
import { validateDialogue } from '../lib/validateDialogue'

const text = adminText.lessons

const noDialogue: WeekDialogue = { videoUrl: null, lines: [] }
const weeks = Array.from({ length: WEEK_COUNT }, (_, index) => index + 1)
const english = (week: number, part: 'goal' | 'context') =>
  curriculumText(DEFAULT_LANGUAGE, weekKey(week, part))

/** Write the conversation each week opens with (Day 1, "Watch and listen"), week by week. */
export function LessonsPage() {
  const draft = useSettingsDraft<WeekDialogues>({
    name: WEEK_DIALOGUES_CONFIG_NAME,
    schema: weekDialoguesSchema,
    defaults: defaultWeekDialogues,
  })
  const overrides = draft.value

  const [week, setWeek] = useState(1)
  const builtIn = builtInWeekDialogues[week]
  const dialogue = weekDialogue(week, overrides) ?? noDialogue
  const validation = validateDialogue(dialogue)
  // A conversation left unfinished in another week also keeps the page from saving.
  const unfinishedWeeks = weeks.filter((other) => {
    const written = overrides[other]
    return other !== week && written !== undefined && !validateDialogue(written).valid
  })

  // Translations are written for one learner language at a time; English is the conversation.
  const translationLanguages = useEditLanguage().options.filter(({ code }) => !isEnglish(code))
  const [chosenLanguage, setChosenLanguage] = useState('')
  const translateTo =
    translationLanguages.find(({ code }) => code === chosenLanguage) ?? translationLanguages[0]

  const setDialogue = (next: WeekDialogue) =>
    draft.update((current) => {
      const others = Object.fromEntries(
        Object.entries(current).filter(([other]) => Number(other) !== week),
      )
      // Back on the built-in conversation (or on none) is the same as not having written one.
      const unchanged = builtIn
        ? JSON.stringify(next) === JSON.stringify(builtIn)
        : next.lines.length === 0 && !next.videoUrl
      return unchanged ? others : { ...others, [week]: next }
    })

  const setLines = (change: (lines: DialogueLine[]) => DialogueLine[]) =>
    setDialogue({ ...dialogue, lines: change([...dialogue.lines]) })

  const addLine = () =>
    setLines((lines) => [
      ...lines,
      // Two people take turns, so a new line is most likely the speaker before the last one.
      { speaker: lines.at(-2)?.speaker ?? '', text: '', translations: {} },
    ])

  const moveLine = (index: number, offset: -1 | 1) =>
    setLines((lines) => {
      const [moved] = lines.splice(index, 1)
      if (moved) lines.splice(index + offset, 0, moved)
      return lines
    })

  const weekOptions = weeks.map((number) => {
    const count = weekDialogue(number, overrides)?.lines.length ?? 0
    const status = count ? `${count} ${text.lines}` : text.noConversation
    return {
      value: String(number),
      label: `${text.week} ${number} · ${english(number, 'goal')} — ${status}`,
    }
  })

  return (
    <AdminPage
      heading={text.heading}
      intro={text.intro}
      isDirty={draft.isDirty}
      canSave={validation.valid && unfinishedWeeks.length === 0}
      isCustomised={draft.isCustomised}
      status={draft.status}
      onSave={draft.save}
      onDiscard={draft.discard}
      onResetToDefaults={draft.resetToDefaults}
    >
      <div className="flex flex-col gap-4">
        <SelectField
          label={text.weekPicker}
          options={weekOptions}
          value={String(week)}
          onChange={(event) => setWeek(Number(event.target.value))}
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

      {unfinishedWeeks.length > 0 && (
        <p role="alert" className="text-sm font-bold text-danger">
          {text.errorOtherWeeks} {unfinishedWeeks.join(', ')}
        </p>
      )}

      <AdminSection
        title={text.conversation}
        description={`${text.conversationIntro} ${text.situation}: ${english(week, 'context')}.`}
        actions={
          overrides[week] && (
            <Button
              variant="ghost"
              className="shrink-0"
              onClick={() =>
                draft.update((current) =>
                  Object.fromEntries(
                    Object.entries(current).filter(([other]) => Number(other) !== week),
                  ),
                )
              }
            >
              {builtIn ? text.useBuiltIn : text.removeConversation}
            </Button>
          )
        }
      >
        {dialogue.lines.length === 0 && <p className="text-fg-muted">{text.empty}</p>}

        <ol className="flex flex-col gap-3">
          {dialogue.lines.map((line, index) => (
            <DialogueLineFields
              key={index}
              index={index}
              count={dialogue.lines.length}
              line={line}
              errors={validation.lines[index]}
              translateTo={translateTo}
              onChange={(changed) =>
                setLines((lines) => lines.map((other, i) => (i === index ? changed : other)))
              }
              onMove={(offset) => moveLine(index, offset)}
              onRemove={() => setLines((lines) => lines.filter((_, i) => i !== index))}
            />
          ))}
        </ol>

        {validation.list && (
          <p role="alert" className="text-sm font-bold text-danger">
            {validation.list}
          </p>
        )}

        <Button
          variant="secondary"
          className="self-start"
          disabled={dialogue.lines.length >= MAX_DIALOGUE_LINES}
          onClick={addLine}
        >
          <Plus aria-hidden="true" className="size-5" />
          {text.addLine}
        </Button>
      </AdminSection>

      <AdminSection title={text.video} description={text.videoIntro}>
        <TextField
          type="url"
          inputMode="url"
          label={text.videoUrl}
          hint={text.videoHint}
          placeholder="https://"
          value={dialogue.videoUrl ?? ''}
          error={validation.video}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => setDialogue({ ...dialogue, videoUrl: event.target.value || null })}
        />
      </AdminSection>
    </AdminPage>
  )
}
