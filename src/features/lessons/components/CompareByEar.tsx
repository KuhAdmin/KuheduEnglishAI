import { Headphones, Volume2 } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import type { SaidKind } from './FindingLine'

export type CompareByEarProps = {
  /** Say the word aloud. Called from a tap. Left out when the app has no voice. */
  onPlayWord?: () => void
  /** Play the learner's recording back to them. Called from a tap. */
  onPlayTake: () => void
  /** The word is being said, or the recording played: the other waits its turn. */
  playingWord: boolean
  playingTake: boolean
  /** What was said, for what its button is called: "Hear the word", "Hear the sentence". */
  kind: SaidKind
}

/**
 * The word and the learner's own recording of it, one tap each and side by side: what was found
 * is a first version that can be wrong, and the learner's ear is the better judge. Both sounds
 * are elsewhere on the screen; here they are where the comparison is being made.
 */
export function CompareByEar({
  onPlayWord,
  onPlayTake,
  playingWord,
  playingTake,
  kind,
}: CompareByEarProps) {
  const t = useT()

  return (
    <div className={cn('grid gap-2', onPlayWord && 'grid-cols-2')}>
      {onPlayWord && (
        <Button variant="outline" size="sm" disabled={playingTake} onClick={onPlayWord}>
          <Volume2 aria-hidden="true" className="size-5" />
          {t(
            kind === 'sentence' ? 'lessonDay.feedback.hearSentence' : 'lessonDay.feedback.hearWord',
          )}
        </Button>
      )}
      <Button variant="outline" size="sm" disabled={playingWord} onClick={onPlayTake}>
        <Headphones aria-hidden="true" className="size-5" />
        {t('lessonDay.feedback.hearYou')}
      </Button>
    </div>
  )
}
