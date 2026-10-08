import { useState } from 'react'
import {
  builtInCatalogs,
  en,
  primarySubtag,
  translationKeys,
  type TranslationKey,
} from '@/shared/lib/i18n'
import {
  defaultScreenTexts,
  SCREEN_TEXTS_CONFIG_NAME,
  screenTextsSchema,
  type ScreenTexts,
} from '@/shared/lib/i18n/screenTexts'
import { SelectField } from '@/shared/ui/SelectField'
import { TextField } from '@/shared/ui/TextField'
import { adminText } from '../adminText'
import { AdminPage } from '../components/AdminPage'
import { AdminSection } from '../components/AdminSection'
import { EditLanguagePicker } from '../components/EditLanguagePicker'
import { ScreenTextRow } from '../components/ScreenTextRow'
import { useEditLanguage } from '../hooks/useEditLanguage'
import { useSettingsDraft } from '../hooks/useSettingsDraft'
import { groupTextKeys, type TextGroupId } from '../lib/textGroups'

const builtInFor = (language: string) =>
  builtInCatalogs[language] ?? builtInCatalogs[primarySubtag(language)]

const ALL_SCREENS = 'all'

// Every group, whatever is being searched for, so the picker never loses the screen it is on.
const screenOptions = [
  { value: ALL_SCREENS, label: adminText.texts.allScreens },
  ...groupTextKeys().map(({ id, title }) => ({ value: id as string, label: title })),
]

const groupNotes: Partial<Record<TextGroupId, string>> = adminText.texts.groupNotes

/** How many texts a language has (the admin's or built-in) out of all texts. */
function countFilled(language: string, texts: ScreenTexts): number {
  const builtIn = builtInFor(language)
  return translationKeys.filter((key) => texts[language]?.[key]?.trim() || builtIn?.[key]).length
}

/** Edit what learners read, per language. */
export function ScreenTextsPage() {
  const { options: languageOptions, language, setLanguage } = useEditLanguage()
  const draft = useSettingsDraft<ScreenTexts>({
    name: SCREEN_TEXTS_CONFIG_NAME,
    schema: screenTextsSchema,
    defaults: defaultScreenTexts,
  })
  const texts = draft.value
  const builtIn = builtInFor(language)

  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const matches = (key: TranslationKey) =>
    !query ||
    [key, en[key], builtIn?.[key], texts[language]?.[key]].some((value) =>
      value?.toLowerCase().includes(query),
    )
  const [screen, setScreen] = useState(ALL_SCREENS)
  const groups = groupTextKeys(translationKeys.filter(matches)).filter(
    (group) => screen === ALL_SCREENS || group.id === screen,
  )

  const setText = (key: TranslationKey, text: string | undefined) =>
    draft.update((current) => {
      const others = Object.fromEntries(
        Object.entries(current[language] ?? {}).filter(([otherKey]) => otherKey !== key),
      )
      // Typing the built-in text back in is the same as not overriding it.
      const forLanguage =
        text === undefined || text === builtIn?.[key] ? others : { ...others, [key]: text }
      return { ...current, [language]: forLanguage }
    })

  return (
    <AdminPage
      heading={adminText.texts.heading}
      intro={adminText.texts.intro}
      isDirty={draft.isDirty}
      isCustomised={draft.isCustomised}
      status={draft.status}
      onSave={draft.save}
      onDiscard={draft.discard}
      onResetToDefaults={draft.resetToDefaults}
    >
      <div className="flex flex-col gap-4">
        <EditLanguagePicker
          options={languageOptions}
          value={language}
          onChange={setLanguage}
          countFilled={(code) => countFilled(code, texts)}
          total={translationKeys.length}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label={adminText.texts.screenFilter}
            options={screenOptions}
            value={screen}
            onChange={(event) => setScreen(event.target.value)}
          />
          <TextField
            type="search"
            label={adminText.texts.search}
            placeholder={adminText.texts.searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            enterKeyHint="search"
          />
        </div>
      </div>

      {groups.length === 0 && (
        <p className="py-8 text-center text-fg-muted">{adminText.texts.noMatches}</p>
      )}

      {groups.map((group) => (
        <AdminSection key={group.id} title={group.title} description={groupNotes[group.id]}>
          {group.keys.map((key) => (
            <ScreenTextRow
              key={`${language}:${key}`}
              textKey={key}
              language={language}
              english={en[key]}
              builtIn={builtIn?.[key]}
              override={texts[language]?.[key]}
              onChange={(text) => setText(key, text)}
              onReset={() => setText(key, undefined)}
            />
          ))}
        </AdminSection>
      ))}
    </AdminPage>
  )
}
