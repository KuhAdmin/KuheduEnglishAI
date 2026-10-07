import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import type { LandingConfig } from '@/shared/lib/appConfig/landingConfig'
import { HeroPlaceholder } from './HeroPlaceholder'

const focalPointClass = {
  top: 'object-top',
  center: 'object-center',
  bottom: 'object-bottom',
} satisfies Record<LandingConfig['hero']['focalPoint'], string>

export type LandingHeroProps = LandingConfig['hero'] & { className?: string }

/**
 * Full-bleed hero backdrop. The top fade keeps the brand lockup readable whatever image an
 * admin uploads; the scrim behind the headline belongs to the page, sized by its text.
 */
export function LandingHero({ imageUrl, imageAlt, focalPoint, className }: LandingHeroProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showImage = imageUrl !== null && imageUrl !== failedUrl

  return (
    <div className={cn('absolute inset-0 overflow-hidden bg-primary-soft', className)}>
      {showImage ? (
        <img
          src={imageUrl}
          alt={imageAlt}
          fetchPriority="high"
          decoding="async"
          draggable={false}
          onError={() => setFailedUrl(imageUrl)}
          className={cn('absolute inset-0 size-full object-cover', focalPointClass[focalPoint])}
        />
      ) : (
        <HeroPlaceholder />
      )}
      <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-bg via-bg/80 to-transparent" />
    </div>
  )
}
