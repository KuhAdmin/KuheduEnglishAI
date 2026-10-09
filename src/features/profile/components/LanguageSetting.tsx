import { useHaptics } from '@/shared/hooks/useHaptics'
import { useLanguagesConfig } from '@/shared/lib/appConfig/useLanguagesConfig'
import { useLanguage, useLanguageStore, useT } from '@/shared/lib/i18n'
import { LanguageChoiceList } from '@/shared/ui/LanguageChoiceList'

/**
 * Lets the learner change the language they chose during onboarding. Like the theme, it is
 * saved on the tap, and the whole app, this screen included, is in the new language at once.
 */
export function LanguageSetting() {
  const t = useT()
  const haptic = useHaptics()
  const { languages } = useLanguagesConfig()
  const current = useLanguage()
  const setLanguage = useLanguageStore((state) => state.setLanguage)

  // The language on screen: English for a learner who never chose. One an admin has since
  // removed is no longer on offer, so nothing is ticked rather than a language they did not pick.
  const value = languages.some((language) => language.code === current) ? current : null

  return (
    <LanguageChoiceList
      legend={t('profile.language')}
      languages={languages}
      value={value}
      onChange={(code) => {
        haptic('tap')
        setLanguage(code)
      }}
    />
  )
}
