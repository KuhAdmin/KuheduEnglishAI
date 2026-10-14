import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { TutorAsPartner } from './TutorAsPartner'

/** The picture's side in CSS pixels, for the browser to keep its place before it has loaded. */
const PIXELS = { sm: 56, md: 112 }

export type PartnerAvatarProps = {
  /**
   * Their picture, when an admin gave them one; `null` shows the learner's tutor playing them,
   * as does a picture that fails to load.
   */
  imageUrl: string | null
  /** Their line is being said right now. */
  speaking: boolean
  /** `md` before the conversation, where they stand alone; `sm` beside each of their lines. */
  size?: 'sm' | 'md'
}

/**
 * The person a learner talks to. **Without a picture of their own it is the learner's tutor**
 * (`TutorAsPartner`): the lines are said in the tutor's voice, and a voice with no face of its
 * own, under a name that may be a man's or a woman's, is what made "Ravi" speak as a woman.
 * With a picture, it is that picture in a circle, a ring pulsing around it while they speak.
 * Either is decoration: the screen's heading names them, and its status line says who speaks.
 */
export function PartnerAvatar({ imageUrl, speaking, size = 'md' }: PartnerAvatarProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const showImage = imageUrl !== null && imageUrl !== failedImage

  if (!showImage) return <TutorAsPartner speaking={speaking} size={size} />

  return (
    <span className={cn('relative inline-flex shrink-0', size === 'sm' ? 'size-14' : 'size-28')}>
      {speaking && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-pulse-ring rounded-full bg-primary motion-reduce:hidden"
        />
      )}
      <span
        className={cn(
          'relative flex size-full items-center justify-center overflow-hidden rounded-full border-primary bg-primary-soft text-on-primary-soft',
          size === 'sm' ? 'border-2' : 'border-4',
          // Without motion, a still ring says the same thing as the pulse.
          speaking && 'motion-reduce:ring-4 motion-reduce:ring-primary-soft',
        )}
      >
        <img
          src={imageUrl}
          alt=""
          width={PIXELS[size]}
          height={PIXELS[size]}
          decoding="async"
          draggable={false}
          onError={() => setFailedImage(imageUrl)}
          className="size-full object-cover"
        />
      </span>
    </span>
  )
}
