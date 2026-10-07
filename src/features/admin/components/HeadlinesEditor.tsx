import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { MAX_HEADLINES, type LandingHeadline } from '@/shared/lib/appConfig/landingConfig'
import { Button } from '@/shared/ui/Button'
import { IconButton } from '@/shared/ui/IconButton'
import { SelectField, type SelectFieldOption } from '@/shared/ui/SelectField'
import { TextAreaField } from '@/shared/ui/TextAreaField'
import { TextField } from '@/shared/ui/TextField'
import { adminText } from '../adminText'
import { isHeadlineComplete } from '../lib/validateHeadlines'

const text = adminText.landing

export type HeadlinesEditorProps = {
  headlines: readonly LandingHeadline[]
  /** Languages a headline can be written in. */
  languageOptions: readonly SelectFieldOption[]
  onChange: (headlines: LandingHeadline[]) => void
}

/** Edit the landing headlines: one per language, in the order they slide past. */
export function HeadlinesEditor({ headlines, languageOptions, onChange }: HeadlinesEditorProps) {
  const patchRow = (index: number, changes: Partial<LandingHeadline>) =>
    onChange(headlines.map((row, i) => (i === index ? { ...row, ...changes } : row)))

  const moveRow = (index: number, offset: -1 | 1) => {
    const list = [...headlines]
    const [moved] = list.splice(index, 1)
    if (moved) list.splice(index + offset, 0, moved)
    onChange(list)
  }

  const addRow = () => {
    // Suggest a language that has no headline yet.
    const unused = languageOptions.find(
      (option) => !headlines.some((headline) => headline.lang === option.value),
    )
    const lang = unused?.value ?? languageOptions[0]?.value ?? 'en'
    onChange([...headlines, { lang, text: '', subtext: '' }])
  }

  return (
    <>
      <p className="text-fg-muted">{text.overlayIntro}</p>

      <ol className="flex flex-col gap-4">
        {headlines.map((headline, index) => {
          const number = index + 1
          // A language this headline already uses stays selectable even if it was removed
          // from the language list later.
          const options = languageOptions.some((option) => option.value === headline.lang)
            ? languageOptions
            : [{ value: headline.lang, label: headline.lang }, ...languageOptions]

          return (
            <li key={index} className="flex flex-col gap-3 rounded-md bg-surface-sunken p-3">
              <div className="flex items-end gap-2">
                <SelectField
                  className="flex-1"
                  label={`${text.headlineLang} ${number}`}
                  options={options}
                  value={headline.lang}
                  onChange={(event) => patchRow(index, { lang: event.target.value })}
                />
                <div className="flex shrink-0 items-center">
                  <IconButton
                    label={`${text.moveHeadlineUp} ${number}`}
                    disabled={index === 0}
                    onClick={() => moveRow(index, -1)}
                  >
                    <ArrowUp aria-hidden="true" className="size-5" />
                  </IconButton>
                  <IconButton
                    label={`${text.moveHeadlineDown} ${number}`}
                    disabled={index === headlines.length - 1}
                    onClick={() => moveRow(index, 1)}
                  >
                    <ArrowDown aria-hidden="true" className="size-5" />
                  </IconButton>
                  <IconButton
                    variant="danger"
                    label={`${text.removeHeadline} ${number}`}
                    disabled={headlines.length === 1}
                    onClick={() => onChange(headlines.filter((_, i) => i !== index))}
                  >
                    <Trash2 aria-hidden="true" className="size-5" />
                  </IconButton>
                </div>
              </div>
              <TextAreaField
                label={`${text.headline} ${number}`}
                lang={headline.lang}
                value={headline.text}
                maxLength={120}
                error={isHeadlineComplete(headline) ? undefined : text.errorHeadline}
                onChange={(event) => patchRow(index, { text: event.target.value })}
              />
              <TextField
                label={`${text.subheadline} ${number} ${text.optional}`}
                lang={headline.lang}
                value={headline.subtext}
                maxLength={160}
                onChange={(event) => patchRow(index, { subtext: event.target.value })}
              />
            </li>
          )
        })}
      </ol>

      <Button
        variant="secondary"
        className="self-start"
        disabled={headlines.length >= MAX_HEADLINES}
        onClick={addRow}
      >
        <Plus aria-hidden="true" className="size-5" />
        {text.addHeadline}
      </Button>
    </>
  )
}
