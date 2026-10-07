import { ArrowRight, BookOpen, Headphones } from 'lucide-react'
import { isSpeechSupported } from '@/shared/lib/audio/speech'
import { useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { usePlacementStore } from '../store/usePlacementStore'
import { TestFrame } from './TestFrame'

export type StageIntroProps = {
  stage: 'LISTEN' | 'UNDERSTAND'
  onPause: () => void
}

/** A breath before a part of the test begins: what is coming, in one or two lines. */
export function StageIntro({ stage, onPause }: StageIntroProps) {
  const t = useT()
  const beginStage = usePlacementStore((state) => state.beginStage)
  const skipStage = usePlacementStore((state) => state.skipStage)

  const listening = stage === 'LISTEN'
  // No voice on this device: say so and move on, rather than failing question by question.
  const noAudio = listening && !isSpeechSupported()
  const Icon = listening ? Headphones : BookOpen

  return (
    <TestFrame
      title={t(
        listening ? 'placementTest.listen.introTitle' : 'placementTest.understand.introTitle',
      )}
      subtitle={
        noAudio
          ? undefined
          : t(listening ? 'placementTest.listen.introBody' : 'placementTest.understand.introBody')
      }
      onPause={onPause}
      footer={
        <Button
          size="lg"
          fullWidth
          onClick={() => (noAudio ? skipStage('audioUnavailable') : beginStage())}
        >
          {t('onboarding.continue')}
          <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.5} />
        </Button>
      }
    >
      <div className="flex animate-rise-in flex-col items-center gap-4">
        <span className="flex size-24 items-center justify-center rounded-full bg-primary-soft text-on-primary-soft">
          <Icon aria-hidden="true" className="size-12" />
        </span>
        {noAudio && (
          <p className="rounded-md bg-accent-soft px-4 py-3 text-center font-bold text-on-accent-soft">
            {t('placementTest.listen.noAudio')}
          </p>
        )}
      </div>
    </TestFrame>
  )
}
