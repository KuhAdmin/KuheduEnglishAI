import { Play, Square } from 'lucide-react'
import type { VoiceChoice } from '@/shared/lib/audio/voices'
import { fillText, useLanguage, useT } from '@/shared/lib/i18n'
import { ChoiceList } from '@/shared/ui/ChoiceList'
import { IconButton } from '@/shared/ui/IconButton'
import { accentName } from '../lib/voiceText'

export type VoiceListProps = {
  /** Names the group. */
  legend: string
  voices: readonly VoiceChoice[]
  /** The voice selected, if it is one of these. */
  selectedId: string | null
  /** The voice that is used when the learner has not chosen one: marked "Default". */
  defaultId: string | null
  onSelect: (id: string) => void
  /** The voice whose sample is playing, if any: its button stops it. */
  playingId: string | null
  onPlay: (voice: VoiceChoice) => void
}

/**
 * Voices to choose from, each with a button to hear it. A voice goes by its own name and is
 * described by what is known about it, its accent, never by how it sounds: that is what the
 * sample is for.
 */
export function VoiceList({
  legend,
  voices,
  selectedId,
  defaultId,
  onSelect,
  playingId,
  onPlay,
}: VoiceListProps) {
  const t = useT()
  const language = useLanguage()

  return (
    <ChoiceList
      legend={legend}
      value={selectedId}
      onChange={onSelect}
      options={voices.map((voice) => {
        const { name } = voice
        const playing = voice.id === playingId

        return {
          value: voice.id,
          label: (
            <>
              {/* The voice's own name: not a text of ours, so not translated. */}
              <span className="wrap-break-word">{name}</span>
              {voice.id === defaultId && (
                <>
                  {' '}
                  <span className="inline-block rounded-full bg-primary-soft px-2 align-middle text-sm font-bold text-on-primary-soft">
                    {t('voice.default')}
                  </span>
                </>
              )}
            </>
          ),
          description: <span className="text-sm">{accentName(language, voice.language)}</span>,
          action: (
            <IconButton
              variant="secondary"
              label={playing ? t('voice.stop') : fillText(t('voice.play'), { name })}
              onClick={() => onPlay(voice)}
            >
              {playing ? (
                <Square aria-hidden="true" className="size-4 fill-current" />
              ) : (
                <Play aria-hidden="true" className="size-5 fill-current" />
              )}
            </IconButton>
          ),
        }
      })}
    />
  )
}
