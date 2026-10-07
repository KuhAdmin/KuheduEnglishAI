import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useHaptics } from '@/shared/hooks/useHaptics'
import { useLanguagesConfig } from '@/shared/lib/appConfig/useLanguagesConfig'
import { DEFAULT_LANGUAGE, I18nProvider, useLanguageStore } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { LanguageChooser } from '../components/LanguageChooser'
import { pickInitialLanguage } from '../lib/pickInitialLanguage'

/**
 * The learner picks their mother tongue. From here on the whole app is shown in it, and this
 * screen already is: its wording follows the highlighted card before Continue is pressed.
 */
export function LanguageStepPage() {
  const { languages, defaultCode } = useLanguagesConfig()
  const saved = useLanguageStore((state) => state.language)
  const setLanguage = useLanguageStore((state) => state.setLanguage)
  const navigate = useNavigate()
  const haptic = useHaptics()

  // Until the learner taps a card, the suggestion follows the settings.
  const [picked, setPicked] = useState<string | null>(null)
  const selected = languages.some((language) => language.code === picked)
    ? picked
    : pickInitialLanguage({
        languages,
        saved,
        deviceLanguages: navigator.languages,
        defaultCode,
      })
  const previewLanguage = selected ?? DEFAULT_LANGUAGE

  const handleSelect = (code: string) => {
    haptic('tap')
    setPicked(code)
  }

  const handleContinue = () => {
    if (!selected) return
    setLanguage(selected)
    navigate(paths.onboardingProfile)
  }

  return (
    <I18nProvider language={previewLanguage}>
      <div lang={previewLanguage}>
        <LanguageChooser
          languages={languages}
          selected={selected}
          onSelect={handleSelect}
          onContinue={handleContinue}
        />
      </div>
    </I18nProvider>
  )
}
