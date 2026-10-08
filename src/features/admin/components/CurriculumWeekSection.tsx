import {
  outcomeKey,
  OUTCOMES_PER_WEEK,
  WEEK_TEXT_FIELDS,
  weekKey,
  type CurriculumKey,
  type WeekTextField,
} from '@/shared/lib/curriculum/curriculum'
import type { CurriculumOverrides } from '@/shared/lib/curriculum/curriculumOverrides'
import { WEEK_PICTURE_BOUNDS } from '@/shared/lib/curriculum/weekPictures'
import { adminText } from '../adminText'
import { AdminSection } from './AdminSection'
import { CurriculumTextField } from './CurriculumTextField'
import { ImageField } from './ImageField'

const text = adminText.curriculum

// Learners know a week's context as its "situation".
const summaryLabels: Record<WeekTextField, string> = {
  goal: text.goal,
  context: text.situation,
  challenge: text.challenge,
}

export type CurriculumWeekSectionProps = {
  week: number
  /** The language being edited (BCP-47). */
  language: string
  /** The draft of the course's wording, in every language. */
  overrides: CurriculumOverrides
  /** `undefined` puts the text back on the built-in wording. */
  onTextChange: (key: CurriculumKey, value: string | undefined) => void
  /** The week's uploaded picture, or `null` for the drawn stand-in. */
  picture: string | null
  onPictureChange: (picture: string | null) => void
}

/** Everything an admin can change about one week: its summary, and its overview screen. */
export function CurriculumWeekSection({
  week,
  language,
  overrides,
  onTextChange,
  picture,
  onPictureChange,
}: CurriculumWeekSectionProps) {
  const scope = `${text.week} ${week}`

  const field = (key: CurriculumKey, label: string) => (
    <CurriculumTextField
      key={`${language}:${key}`}
      textKey={key}
      language={language}
      overrides={overrides}
      label={label}
      scope={scope}
      onChange={(value) => onTextChange(key, value)}
    />
  )

  return (
    <AdminSection title={scope}>
      {WEEK_TEXT_FIELDS.map((part) => field(weekKey(week, part), summaryLabels[part]))}

      <div className="flex flex-col gap-1 border-t border-border pt-4">
        <h3 className="font-extrabold">{text.overview}</h3>
        <p className="text-sm text-fg-muted">{text.overviewNote}</p>
      </div>
      <ImageField
        label={`${text.picture}: ${scope}`}
        hint={text.pictureHint}
        value={picture}
        defaultValue={null}
        onChange={onPictureChange}
        bounds={WEEK_PICTURE_BOUNDS}
        shape="landscape"
      />
      {Array.from({ length: OUTCOMES_PER_WEEK }, (_, index) =>
        field(outcomeKey(week, index + 1), `${text.outcome} ${index + 1}`),
      )}
    </AdminSection>
  )
}
