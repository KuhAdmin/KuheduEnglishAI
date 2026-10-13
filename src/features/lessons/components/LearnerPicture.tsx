import { UserRound } from 'lucide-react'
import { useState } from 'react'
import { useLearnerPicture } from '@/shared/lib/learner/useLearnerPicture'

/**
 * The learner, on their side of a conversation: their own picture, small and still, beside
 * what is theirs to say. Without a picture (or with one that cannot be loaded, as Google's
 * cannot offline) it is a plain figure: nothing is known of the learner to draw them from, and
 * the turning coin of Profile is neither still nor theirs.
 *
 * Decoration: the line beside it says whose turn this is.
 */
export function LearnerPicture() {
  const src = useLearnerPicture()
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const shown = src !== null && src !== failedSrc ? src : null

  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-on-primary-soft"
    >
      {shown ? (
        <img
          src={shown}
          alt=""
          width={32}
          height={32}
          decoding="async"
          draggable={false}
          // The provider's picture is asked for without saying which page wants it.
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(shown)}
          className="size-full object-cover"
        />
      ) : (
        <UserRound className="size-5" />
      )}
    </span>
  )
}
