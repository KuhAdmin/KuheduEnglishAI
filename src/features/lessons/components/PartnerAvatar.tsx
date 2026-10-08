import { UserRound } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/shared/lib/cn'

export type PartnerAvatarProps = {
  /** Their picture; `null` shows a drawn stand-in, as does a picture that fails to load. */
  imageUrl: string | null
  /** Their line is being said right now. */
  speaking: boolean
}

/**
 * The person a learner talks to, in a circle; a ring pulses around it while they speak. The
 * picture is decoration: the screen's heading names them, and its status line says who speaks.
 */
export function PartnerAvatar({ imageUrl, speaking }: PartnerAvatarProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const showImage = imageUrl !== null && imageUrl !== failedImage

  return (
    <span className="relative inline-flex size-28 shrink-0">
      {speaking && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-pulse-ring rounded-full bg-primary motion-reduce:hidden"
        />
      )}
      <span
        className={cn(
          'relative flex size-full items-center justify-center overflow-hidden rounded-full border-4 border-primary bg-primary-soft text-on-primary-soft',
          // Without motion, a still ring says the same thing as the pulse.
          speaking && 'motion-reduce:ring-4 motion-reduce:ring-primary-soft',
        )}
      >
        {showImage ? (
          <img
            src={imageUrl}
            alt=""
            width={112}
            height={112}
            decoding="async"
            draggable={false}
            onError={() => setFailedImage(imageUrl)}
            className="size-full object-cover"
          />
        ) : (
          <UserRound aria-hidden="true" className="size-14" />
        )}
      </span>
    </span>
  )
}
