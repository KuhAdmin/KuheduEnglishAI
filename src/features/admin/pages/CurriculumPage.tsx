import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  curriculumKeys,
  SECTION_COUNT,
  sectionKey,
  sectionTextKeys,
  sectionWeeks,
  type CurriculumKey,
} from '@/shared/lib/curriculum/curriculum'
import {
  CURRICULUM_CONFIG_NAME,
  curriculumOverridesSchema,
  defaultCurriculumOverrides,
  withCurriculumText,
  type CurriculumOverrides,
} from '@/shared/lib/curriculum/curriculumOverrides'
import { builtInCurriculum, curriculumText } from '@/shared/lib/curriculum/useCurriculum'
import {
  defaultWeekPictures,
  WEEK_PICTURES_CONFIG_NAME,
  weekPicturesSchema,
  type WeekPictures,
} from '@/shared/lib/curriculum/weekPictures'
import { DEFAULT_LANGUAGE } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { SelectField } from '@/shared/ui/SelectField'
import { adminText } from '../adminText'
import { AdminPage } from '../components/AdminPage'
import { AdminSection } from '../components/AdminSection'
import { CurriculumTextField } from '../components/CurriculumTextField'
import { CurriculumWeekSection } from '../components/CurriculumWeekSection'
import { EditLanguagePicker } from '../components/EditLanguagePicker'
import { combineDrafts } from '../hooks/combineDrafts'
import { useEditLanguage } from '../hooks/useEditLanguage'
import { useSettingsDraft } from '../hooks/useSettingsDraft'

const text = adminText.curriculum

/** Edit the 50-week course: its wording per language and its pictures, one section at a time. */
export function CurriculumPage() {
  const { options: languageOptions, language, setLanguage } = useEditLanguage()
  // Two settings objects behind one Save bar: the wording (per language) and the pictures.
  const wording = useSettingsDraft<CurriculumOverrides>({
    name: CURRICULUM_CONFIG_NAME,
    schema: curriculumOverridesSchema,
    defaults: defaultCurriculumOverrides,
  })
  const pictures = useSettingsDraft<WeekPictures>({
    name: WEEK_PICTURES_CONFIG_NAME,
    schema: weekPicturesSchema,
    defaults: defaultWeekPictures,
  })
  const drafts = combineDrafts(wording, pictures)
  const overrides = wording.value

  const [section, setSection] = useState(1)
  const sectionPicker = useRef<HTMLSelectElement>(null)
  const weeks = sectionWeeks(section)

  const hasText = (code: string, key: CurriculumKey) =>
    Boolean(overrides[code]?.[key]?.trim() || builtInCurriculum(code)?.[key])

  const sectionOptions = Array.from({ length: SECTION_COUNT }, (_, index) => {
    const number = index + 1
    const name = curriculumText(DEFAULT_LANGUAGE, sectionKey(number), overrides)
    const missing = sectionTextKeys(number).filter((key) => !hasText(language, key)).length
    return {
      value: String(number),
      label: `${text.section} ${number} · ${name}${missing ? ` — ${missing} ${text.missing}` : ''}`,
    }
  })

  const setText = (key: CurriculumKey, value: string | undefined) =>
    wording.update((current) =>
      // Typing the built-in text back in is the same as not overriding it.
      withCurriculumText(
        current,
        language,
        key,
        value === builtInCurriculum(language)?.[key] ? undefined : value,
      ),
    )

  const setPicture = (week: number, picture: string | null) =>
    pictures.update((current) => {
      const others = Object.fromEntries(
        Object.entries(current).filter(([other]) => Number(other) !== week),
      )
      return picture === null ? others : { ...others, [week]: picture }
    })

  const openSection = (number: number) => {
    setSection(number)
    // The buttons sit below the weeks; this brings the new section's top back into view.
    sectionPicker.current?.focus()
  }

  return (
    <AdminPage
      heading={text.heading}
      intro={text.intro}
      isDirty={drafts.isDirty}
      isCustomised={drafts.isCustomised}
      status={drafts.status}
      onSave={drafts.save}
      onDiscard={drafts.discard}
      onResetToDefaults={drafts.resetToDefaults}
    >
      <div className="flex flex-col gap-4">
        <EditLanguagePicker
          options={languageOptions}
          value={language}
          onChange={setLanguage}
          countFilled={(code) => curriculumKeys.filter((key) => hasText(code, key)).length}
          total={curriculumKeys.length}
        />
        <SelectField
          ref={sectionPicker}
          label={text.sectionPicker}
          options={sectionOptions}
          value={String(section)}
          onChange={(event) => setSection(Number(event.target.value))}
        />
      </div>

      <AdminSection
        title={`${text.section} ${section}`}
        description={`${text.weeks} ${weeks[0]}–${weeks.at(-1)}`}
      >
        <CurriculumTextField
          key={`${language}:${sectionKey(section)}`}
          textKey={sectionKey(section)}
          language={language}
          overrides={overrides}
          label={text.sectionName}
          onChange={(value) => setText(sectionKey(section), value)}
        />
      </AdminSection>

      {weeks.map((week) => (
        <CurriculumWeekSection
          key={week}
          week={week}
          language={language}
          overrides={overrides}
          onTextChange={setText}
          picture={pictures.value[week] ?? null}
          onPictureChange={(picture) => setPicture(week, picture)}
        />
      ))}

      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="outline" disabled={section === 1} onClick={() => openSection(section - 1)}>
          <ArrowLeft aria-hidden="true" className="size-5" />
          {text.previous}
        </Button>
        <Button
          variant="outline"
          className="ml-auto"
          disabled={section === SECTION_COUNT}
          onClick={() => openSection(section + 1)}
        >
          {text.next}
          <ArrowRight aria-hidden="true" className="size-5" />
        </Button>
      </div>
    </AdminPage>
  )
}
