import { ArrowRight } from 'lucide-react'
import type { SupportLanguage } from '@/shared/lib/appConfig/languagesConfig'
import { useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { ChoiceList } from '@/shared/ui/ChoiceList'
import { LanguageFlag } from './LanguageFlag'
import { StepScreen } from '@/shared/ui/StepScreen'

export type LanguageChooserProps = {
  languages: readonly SupportLanguage[]
  selected: string | null
  onSelect: (code: string) => void
  onContinue: () => void
}

/**
 * The language question itself. It is rendered inside an I18nProvider set to the highlighted
 * language, so its own wording changes the moment the learner taps a different card.
 */
export function LanguageChooser({
  languages,
  selected,
  onSelect,
  onContinue,
}: LanguageChooserProps) {
  const t = useT()

  return (
    <StepScreen
      title={t('onboarding.language.title')}
      subtitle={t('onboarding.language.subtitle')}
      footer={
        <Button size="lg" fullWidth disabled={!selected} onClick={onContinue}>
          {t('onboarding.continue')}
          <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.5} />
        </Button>
      }
    >
      <ChoiceList
        legend={t('onboarding.language.title')}
        value={selected}
        onChange={onSelect}
        options={languages.map((language) => ({
          value: language.code,
          media: <LanguageFlag flagUrl={language.flagUrl} code={language.code} />,
          label: (
            <>
              <span lang={language.code}>{language.nativeName}</span>
              {language.caption && (
                <>
                  {' '}
                  <span lang="en" className="font-normal text-fg-muted">
                    ({language.caption})
                  </span>
                </>
              )}
            </>
          ),
        }))}
      />
    </StepScreen>
  )
}
