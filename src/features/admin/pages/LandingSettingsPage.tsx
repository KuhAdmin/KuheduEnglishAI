import {
  defaultLandingConfig,
  LANDING_CONFIG_NAME,
  landingConfigSchema,
  type LandingConfig,
} from '@/shared/lib/appConfig/landingConfig'
import { useLanguagesConfig } from '@/shared/lib/appConfig/useLanguagesConfig'
import { SelectField } from '@/shared/ui/SelectField'
import { TextField } from '@/shared/ui/TextField'
import { adminText } from '../adminText'
import { AdminPage } from '../components/AdminPage'
import { AdminSection } from '../components/AdminSection'
import { HeadlinesEditor } from '../components/HeadlinesEditor'
import { ImageField } from '../components/ImageField'
import { useSettingsDraft } from '../hooks/useSettingsDraft'
import { isHeadlineComplete } from '../lib/validateHeadlines'

const text = adminText.landing

const focalPointOptions = [
  { value: 'top', label: text.focalTop },
  { value: 'center', label: text.focalCenter },
  { value: 'bottom', label: text.focalBottom },
]

/** Edit the first screen visitors see: logo, hero image and the wording over it. */
export function LandingSettingsPage() {
  const { languages } = useLanguagesConfig()
  const draft = useSettingsDraft<LandingConfig>({
    name: LANDING_CONFIG_NAME,
    schema: landingConfigSchema,
    defaults: defaultLandingConfig,
  })
  const { brand, hero, overlay, cta } = draft.value

  /** Change some fields of one group (brand, hero, overlay or cta). */
  const patch = <Group extends keyof LandingConfig>(
    group: Group,
    changes: Partial<LandingConfig[Group]>,
  ) => draft.update((current) => ({ ...current, [group]: { ...current[group], ...changes } }))

  // Headlines can be written in any learner language, and always in English.
  const languageOptions = [
    ...languages.map(({ code, nativeName }) => ({ value: code, label: nativeName })),
    ...(languages.some(({ code }) => code === 'en') ? [] : [{ value: 'en', label: 'English' }]),
  ]

  return (
    <AdminPage
      heading={text.heading}
      intro={text.intro}
      isDirty={draft.isDirty}
      canSave={overlay.headlines.every(isHeadlineComplete)}
      isCustomised={draft.isCustomised}
      status={draft.status}
      onSave={draft.save}
      onDiscard={draft.discard}
      onResetToDefaults={draft.resetToDefaults}
    >
      <AdminSection title={text.brand}>
        <ImageField
          label={text.logo}
          hint={text.logoHint}
          value={brand.logoUrl}
          defaultValue={defaultLandingConfig.brand.logoUrl}
          onChange={(logoUrl) =>
            patch('brand', { logoUrl: logoUrl ?? defaultLandingConfig.brand.logoUrl })
          }
          bounds={{ maxWidth: 256, maxHeight: 256 }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={text.brandName}
            value={brand.name}
            maxLength={40}
            onChange={(event) => patch('brand', { name: event.target.value })}
          />
          <TextField
            label={text.tagline}
            value={brand.tagline}
            maxLength={60}
            onChange={(event) => patch('brand', { tagline: event.target.value })}
          />
        </div>
      </AdminSection>

      <AdminSection title={text.hero}>
        <ImageField
          label={text.heroImage}
          hint={text.heroHint}
          value={hero.imageUrl}
          defaultValue={null}
          onChange={(imageUrl) => patch('hero', { imageUrl })}
          bounds={{ maxWidth: 1080, maxHeight: 1920 }}
          shape="portrait"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={text.heroAlt}
            hint={text.heroAltHint}
            value={hero.imageAlt}
            maxLength={160}
            onChange={(event) => patch('hero', { imageAlt: event.target.value })}
          />
          <SelectField
            label={text.focalPoint}
            options={focalPointOptions}
            value={hero.focalPoint}
            onChange={(event) =>
              patch('hero', {
                focalPoint: event.target.value as LandingConfig['hero']['focalPoint'],
              })
            }
          />
        </div>
      </AdminSection>

      <AdminSection title={text.overlay}>
        <HeadlinesEditor
          headlines={overlay.headlines}
          languageOptions={languageOptions}
          onChange={(headlines) => patch('overlay', { headlines })}
        />
      </AdminSection>

      <AdminSection title={text.buttons}>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label={text.primaryLabel}
            value={cta.primaryLabel}
            maxLength={30}
            onChange={(event) => patch('cta', { primaryLabel: event.target.value })}
          />
          <TextField
            label={text.signInPrompt}
            value={cta.signInPrompt}
            maxLength={60}
            onChange={(event) => patch('cta', { signInPrompt: event.target.value })}
          />
          <TextField
            label={text.signInLabel}
            value={cta.signInLabel}
            maxLength={30}
            onChange={(event) => patch('cta', { signInLabel: event.target.value })}
          />
        </div>
      </AdminSection>
    </AdminPage>
  )
}
