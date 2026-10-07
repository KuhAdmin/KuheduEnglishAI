import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import {
  defaultLanguagesConfig,
  LANGUAGES_CONFIG_NAME,
  languagesConfigSchema,
  MAX_LANGUAGES,
  type LanguagesConfig,
  type SupportLanguage,
} from '@/shared/lib/appConfig/languagesConfig'
import { Button } from '@/shared/ui/Button'
import { IconButton } from '@/shared/ui/IconButton'
import { SelectField } from '@/shared/ui/SelectField'
import { TextField } from '@/shared/ui/TextField'
import { adminText } from '../adminText'
import { AdminPage } from '../components/AdminPage'
import { AdminSection } from '../components/AdminSection'
import { ImageField } from '../components/ImageField'
import { useSettingsDraft } from '../hooks/useSettingsDraft'
import { validateLanguages } from '../lib/validateLanguages'

const text = adminText.languages

const emptyLanguage: SupportLanguage = { code: '', nativeName: '', caption: '', flagUrl: null }

/** Edit which mother tongues learners can choose, their flags and their order. */
export function LanguagesSettingsPage() {
  const draft = useSettingsDraft<LanguagesConfig>({
    name: LANGUAGES_CONFIG_NAME,
    schema: languagesConfigSchema,
    defaults: defaultLanguagesConfig,
  })
  const { languages, defaultCode } = draft.value
  const validation = validateLanguages(languages)

  const setLanguages = (change: (languages: SupportLanguage[]) => SupportLanguage[]) =>
    draft.update((current) => ({ ...current, languages: change([...current.languages]) }))

  const patchRow = (index: number, changes: Partial<SupportLanguage>) =>
    setLanguages((list) =>
      list.map((language, i) => (i === index ? { ...language, ...changes } : language)),
    )

  const moveRow = (index: number, offset: -1 | 1) =>
    setLanguages((list) => {
      const target = index + offset
      const [moved] = list.splice(index, 1)
      if (moved) list.splice(target, 0, moved)
      return list
    })

  const defaultOptions = languages
    .filter((language) => language.code.trim())
    .map((language) => ({
      value: language.code.trim(),
      label: language.nativeName.trim() || language.code,
    }))
  // If the pre-selected language was removed or renamed, the first one takes its place.
  const effectiveDefault = defaultOptions.some((option) => option.value === defaultCode)
    ? defaultCode
    : (defaultOptions[0]?.value ?? defaultCode)

  const handleSave = () => draft.save((current) => ({ ...current, defaultCode: effectiveDefault }))

  return (
    <AdminPage
      heading={text.heading}
      intro={text.intro}
      isDirty={draft.isDirty}
      canSave={validation.valid}
      isCustomised={draft.isCustomised}
      status={draft.status}
      onSave={handleSave}
      onDiscard={draft.discard}
      onResetToDefaults={draft.resetToDefaults}
    >
      <ol className="flex flex-col gap-4">
        {languages.map((language, index) => {
          const name = language.nativeName.trim() || `${text.language} ${index + 1}`
          return (
            <li key={index}>
              <AdminSection
                title={<span lang={language.code || undefined}>{name}</span>}
                actions={
                  <div className="flex shrink-0 items-center">
                    <IconButton
                      label={`${text.moveUp}: ${name}`}
                      disabled={index === 0}
                      onClick={() => moveRow(index, -1)}
                    >
                      <ArrowUp aria-hidden="true" className="size-5" />
                    </IconButton>
                    <IconButton
                      label={`${text.moveDown}: ${name}`}
                      disabled={index === languages.length - 1}
                      onClick={() => moveRow(index, 1)}
                    >
                      <ArrowDown aria-hidden="true" className="size-5" />
                    </IconButton>
                    <IconButton
                      variant="danger"
                      label={`${text.remove}: ${name}`}
                      disabled={languages.length === 1}
                      onClick={() => setLanguages((list) => list.filter((_, i) => i !== index))}
                    >
                      <Trash2 aria-hidden="true" className="size-5" />
                    </IconButton>
                  </div>
                }
              >
                <ImageField
                  label={`${text.flag}: ${name}`}
                  hint={text.flagHint}
                  value={language.flagUrl}
                  defaultValue={null}
                  onChange={(flagUrl) => patchRow(index, { flagUrl })}
                  bounds={{ maxWidth: 128, maxHeight: 128 }}
                  shape="circle"
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  <TextField
                    label={text.code}
                    hint={text.codeHint}
                    value={language.code}
                    error={validation.rows[index]?.code}
                    maxLength={20}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(event) => patchRow(index, { code: event.target.value })}
                  />
                  <TextField
                    label={text.nativeName}
                    lang={language.code || undefined}
                    value={language.nativeName}
                    error={validation.rows[index]?.nativeName}
                    maxLength={40}
                    onChange={(event) => patchRow(index, { nativeName: event.target.value })}
                  />
                  <TextField
                    label={text.caption}
                    hint={text.captionHint}
                    value={language.caption}
                    maxLength={40}
                    onChange={(event) => patchRow(index, { caption: event.target.value })}
                  />
                </div>
              </AdminSection>
            </li>
          )
        })}
      </ol>

      {validation.list && (
        <p role="alert" className="text-sm font-bold text-danger">
          {validation.list}
        </p>
      )}

      <Button
        variant="secondary"
        className="self-start"
        disabled={languages.length >= MAX_LANGUAGES}
        onClick={() => setLanguages((list) => [...list, emptyLanguage])}
      >
        <Plus aria-hidden="true" className="size-5" />
        {text.add}
      </Button>

      <SelectField
        className="sm:max-w-sm"
        label={text.defaultLanguage}
        hint={text.defaultHint}
        options={defaultOptions}
        value={effectiveDefault}
        onChange={(event) =>
          draft.update((current) => ({ ...current, defaultCode: event.target.value }))
        }
      />
    </AdminPage>
  )
}
