import type { ReactNode } from 'react'
import type { MicrophoneProblem } from './microphone'
import { useT } from '@/shared/lib/i18n'

export type MicrophoneHelpProps = {
  problem: MicrophoneProblem
  /** Ways on from here, when the screen's own pinned actions do not already offer them. */
  children?: ReactNode
}

/** Why the microphone cannot be used and, where the learner can change that, how. */
export function MicrophoneHelp({ problem, children }: MicrophoneHelpProps) {
  const t = useT()

  return (
    <div role="alert" className="flex w-full flex-col gap-3 rounded-lg bg-accent-soft p-4">
      <p className="font-extrabold text-on-accent-soft">
        {t(problem === 'denied' ? 'microphone.denied' : 'microphone.unavailable')}
      </p>
      {problem === 'denied' && (
        <ul className="flex list-disc flex-col gap-1 ps-5 text-on-accent-soft">
          <li>{t('microphone.deniedAndroid')}</li>
          <li>{t('microphone.deniedIos')}</li>
        </ul>
      )}
      {children && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  )
}
