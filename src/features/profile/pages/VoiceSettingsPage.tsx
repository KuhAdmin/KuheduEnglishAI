import { fillText, useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { ChoiceChips } from '@/shared/ui/ChoiceChips'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { SelectField } from '@/shared/ui/SelectField'
import { ProfileSubScreen } from '../components/ProfileSubScreen'
import { VoiceList } from '../components/VoiceList'
import { useVoiceChoice } from '../hooks/useVoiceChoice'

const noticeClass = 'rounded-lg bg-surface-sunken p-4 text-center text-fg-muted'

/**
 * The learner chooses the voices the app speaks each language with, one for the male tutor and
 * one for the female: a language, a tutor, a kind of voice, then a voice to hear and to set.
 * Any voice can be given to either tutor. The voices are the device's own, so the list differs
 * from phone to phone, and a language may have none.
 */
export function VoiceSettingsPage() {
  const t = useT()
  const choice = useVoiceChoice()
  const canChoose = choice.supported && choice.hasVoices

  const status = choice.playFailed
    ? t('voice.failed')
    : choice.justSaved
      ? fillText(t('voice.saved'), {
          tutor: t(`tutor.${choice.tutor}`),
          name: choice.justSaved.name,
          language: choice.languageName,
        })
      : choice.canSave
        ? ''
        : // Nothing is selected on a tab this tutor's voice is not on.
          choice.selected
          ? t('voice.inUse')
          : t('voice.choose')

  return (
    <ProfileSubScreen
      title={t('voice.title')}
      subtitle={t('voice.subtitle')}
      footer={
        canChoose ? (
          <div className="flex flex-col gap-3">
            {/* Says why the button is locked, and that a voice was set, right above it. */}
            <p aria-live="polite" className="min-h-6 text-center text-fg-muted">
              {status}
            </p>
            <Button size="lg" fullWidth disabled={!choice.canSave} onClick={choice.save}>
              {t('voice.set')}
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-6">
        <SelectField
          label={t('voice.language')}
          options={choice.languages.map(({ code, nativeName }) => ({
            value: code,
            label: nativeName,
          }))}
          value={choice.language}
          onChange={(event) => choice.changeLanguage(event.target.value)}
        />

        {!choice.supported && <p className={noticeClass}>{t('voice.unsupported')}</p>}

        {choice.supported && !choice.hasVoices && (
          <p className={noticeClass}>
            {fillText(t('voice.none'), { language: choice.languageName })} {t('voice.noneHint')}
          </p>
        )}

        {canChoose && (
          <>
            {/* Whose voice is being chosen; each tile says the voice that tutor has now. */}
            <ChoiceChips
              layout="equal"
              legend={t('voice.for')}
              options={choice.tutors.map(({ kind, voice }) => ({
                value: kind,
                label: t(`tutor.${kind}`),
                description: voice?.name,
              }))}
              value={choice.tutor}
              onChange={choice.changeTutor}
            />

            {choice.groups.length > 1 && (
              <SegmentedControl
                fullWidth
                legend={t('voice.group')}
                options={choice.groups.map((gender) => ({
                  value: gender,
                  label: t(`voice.${gender}`),
                }))}
                value={choice.group}
                onChange={choice.changeGroup}
              />
            )}

            <div className="flex flex-col gap-3">
              {choice.group === 'other' && <p className="text-fg-muted">{t('voice.otherNote')}</p>}
              <VoiceList
                legend={t('voice.listLabel')}
                voices={choice.voices}
                selectedId={choice.selected?.id ?? null}
                defaultId={choice.defaultId}
                onSelect={choice.select}
                playingId={choice.playingId}
                onPlay={choice.play}
              />
            </div>

            <section aria-labelledby="voice-sample-heading" className="flex flex-col gap-2">
              <h2 id="voice-sample-heading" className="text-sm font-bold">
                {t('voice.sampleHeading')}
              </h2>
              <p lang={choice.language} className="rounded-lg bg-surface-sunken p-4">
                {choice.sample}
              </p>
            </section>
          </>
        )}
      </div>
    </ProfileSubScreen>
  )
}
