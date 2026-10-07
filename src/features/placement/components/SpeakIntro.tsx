import { Mic, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import {
  MicrophoneError,
  releaseStream,
  requestMicrophone,
  type MicrophoneProblem,
} from '@/shared/lib/audio/microphone'
import { useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { usePlacementStore } from '../store/usePlacementStore'
import type { NotAssessedReason } from '../types'
import { MicrophoneHelp } from './MicrophoneHelp'
import { TestFrame } from './TestFrame'

const skipReasons = {
  denied: 'microphoneDenied',
  unavailable: 'microphoneUnavailable',
} as const satisfies Record<MicrophoneProblem, NotAssessedReason>

/**
 * Before the speaking part: why the microphone is needed, asked for only on the learner's tap.
 * If it cannot be used, they can fix it or go on — and speaking is then left unassessed.
 */
export function SpeakIntro({ onPause }: { onPause: () => void }) {
  const t = useT()
  const beginStage = usePlacementStore((state) => state.beginStage)
  const skipStage = usePlacementStore((state) => state.skipStage)
  const [checking, setChecking] = useState(false)
  const [problem, setProblem] = useState<MicrophoneProblem | null>(null)

  const handleAllow = async () => {
    setChecking(true)
    setProblem(null)
    try {
      // Only to get the permission: each answer opens the microphone for itself.
      releaseStream(await requestMicrophone())
      beginStage()
    } catch (error) {
      setProblem(error instanceof MicrophoneError ? error.problem : 'unavailable')
      setChecking(false)
    }
  }

  return (
    <TestFrame
      title={t('placementTest.speak.introTitle')}
      subtitle={t('placementTest.speak.introBody')}
      onPause={onPause}
      footer={
        <div className="flex flex-col gap-2">
          <Button size="lg" fullWidth disabled={checking} onClick={() => void handleAllow()}>
            <Mic aria-hidden="true" className="size-5" />
            {t(
              checking
                ? 'placementTest.speak.checking'
                : problem
                  ? 'placementTest.speak.checkMic'
                  : 'placementTest.speak.allow',
            )}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => skipStage(problem ? skipReasons[problem] : 'learnerSkipped')}
          >
            {t('placementTest.speak.without')}
          </Button>
        </div>
      }
    >
      <div className="flex animate-rise-in flex-col items-center gap-5">
        <span className="flex size-24 items-center justify-center rounded-full bg-primary-soft text-on-primary-soft">
          <Mic aria-hidden="true" className="size-12" />
        </span>
        <p className="text-center text-lg font-bold">{t('placementTest.speak.micWhy')}</p>
        <p className="flex items-start gap-2 text-fg-muted">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {t('placementTest.speak.privacy')}
        </p>
        {problem && <MicrophoneHelp problem={problem} />}
      </div>
    </TestFrame>
  )
}
