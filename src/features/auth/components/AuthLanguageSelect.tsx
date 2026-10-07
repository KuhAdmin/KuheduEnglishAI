import { Globe } from 'lucide-react'
import { useMemo } from 'react'
import { useHaptics } from '@/shared/hooks/useHaptics'
import { useLanguagesConfig } from '@/shared/lib/appConfig/useLanguagesConfig'
import { DEFAULT_LANGUAGE, useLanguage, useLanguageStore, useT } from '@/shared/lib/i18n'
import { CompactSelect } from '@/shared/ui/CompactSelect'

/**
 * Lets a visitor read the account screen in their own language before onboarding asks for it.
 * The choice is the learner's language for the whole app, so the language step opens with it.
 */
export function AuthLanguageSelect({ className }: { className?: string }) {
  const t = useT()
  const haptic = useHaptics()
  const { languages } = useLanguagesConfig()
  const current = useLanguage()
  const setLanguage = useLanguageStore((state) => state.setLanguage)

  const options = useMemo(() => {
    const offered = languages.map(({ code, nativeName }) => ({
      value: code,
      label: nativeName,
      lang: code,
    }))
    // English is what this screen opens in, so it is offered even if an admin removed it.
    return offered.some((option) => option.value === DEFAULT_LANGUAGE)
      ? offered
      : [...offered, { value: DEFAULT_LANGUAGE, label: 'English', lang: DEFAULT_LANGUAGE }]
  }, [languages])

  // A saved language that is no longer offered reads as English, which is what the screen shows.
  const value = options.some((option) => option.value === current) ? current : DEFAULT_LANGUAGE

  return (
    <CompactSelect
      label={t('auth.language')}
      icon={<Globe className="size-5" />}
      options={options}
      value={value}
      onChange={(event) => {
        haptic('tap')
        setLanguage(event.target.value)
      }}
      className={className}
    />
  )
}
