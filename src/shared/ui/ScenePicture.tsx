import { useState, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { ScenePlaceholder } from './ScenePlaceholder'

export type ScenePictureProps = {
  /** The picture, or `null` when there is none: a drawn stand-in is shown instead. */
  src: string | null
  /** Laid over the picture (e.g. a play button), centred. */
  children?: ReactNode
  className?: string
}

/**
 * A 16:9 picture that sets the scene of a real-life situation. The situation is written out
 * beside it, so it has no description of its own.
 */
export function ScenePicture({ src, children, className }: ScenePictureProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = src !== null && src !== failedSrc

  return (
    <div
      className={cn(
        'relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-primary-soft',
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          width={640}
          height={360}
          decoding="async"
          draggable={false}
          onError={() => setFailedSrc(src)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <ScenePlaceholder />
      )}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  )
}
