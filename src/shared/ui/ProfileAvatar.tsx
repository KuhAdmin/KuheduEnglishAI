import { UserRound } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/shared/lib/cn'

export type ProfileAvatarProps = {
  maleImageUrl: string
  femaleImageUrl: string
  /**
   * Seconds this avatar is ahead in the flip cycle, so neighbouring avatars don't all turn at
   * the same moment. Keep it under 2s so every avatar still starts on its front face.
   */
  phase?: number
  className?: string
}

/**
 * Circular profile picture that flips like a coin between the male image (front face) and the
 * female image (back face), so the option speaks to every learner. Decorative: the option's
 * label is always shown next to it. With reduced motion (or one broken image) it stays still.
 */
export function ProfileAvatar({
  maleImageUrl,
  femaleImageUrl,
  phase = 0,
  className,
}: ProfileAvatarProps) {
  const [failedUrls, setFailedUrls] = useState<readonly string[]>([])
  // A Set: an admin may upload the same picture for both.
  const faces = [...new Set([maleImageUrl, femaleImageUrl])].filter(
    (url) => !failedUrls.includes(url),
  )
  const flipping = faces.length === 2

  if (faces.length === 0) {
    return (
      <span
        className={cn(
          'flex size-14 items-center justify-center rounded-full bg-primary-soft text-on-primary-soft',
          className,
        )}
      >
        <UserRound aria-hidden="true" className="size-7" />
      </span>
    )
  }

  return (
    // Perspective lives on the outer element; it must not clip, or the 3D turn is flattened.
    <span className={cn('block size-14 perspective-near', className)}>
      <span
        // Negative delay: start part-way through the cycle instead of waiting.
        style={flipping ? { animationDelay: `${-phase}s` } : undefined}
        className={cn(
          'relative block size-full transform-3d',
          flipping && 'animate-coin-flip motion-reduce:animate-none',
        )}
      >
        {faces.map((url, index) => (
          <img
            key={url}
            src={url}
            alt=""
            width={56}
            height={56}
            draggable={false}
            onError={() => setFailedUrls((failed) => [...failed, url])}
            className={cn(
              'absolute inset-0 size-full rounded-full bg-primary-soft object-cover backface-hidden',
              // The back face starts turned away and comes round when the coin flips.
              index === 1 && 'rotate-y-180',
            )}
          />
        ))}
      </span>
    </span>
  )
}
