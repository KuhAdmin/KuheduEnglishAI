import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, ReactNode } from 'react'
import type { MouthShape } from '@/shared/lib/audio/lipSync'
import { cn } from '@/shared/lib/cn'

const avatarVariants = cva(
  'relative inline-flex aspect-square shrink-0 overflow-hidden rounded-xl bg-primary-soft',
  {
    variants: { size: { sm: 'w-14', md: 'w-28', lg: 'w-40' } },
    defaultVariants: { size: 'lg' },
  },
)

/** `encourage` is the smile with a thumbs up beside it. */
export type AvatarMood = 'neutral' | 'smile' | 'encourage'

/** What every drawn avatar takes (`MaleAvatar`, `FemaleAvatar`). */
export type AvatarProps = Omit<ComponentProps<'span'>, 'children'> &
  VariantProps<typeof avatarVariants> & {
    /**
     * The shape of the mouth. Give it `useLipSync()` to move the lips with the device's voice.
     * `rest`, the default, is a closed mouth, or the smile of the mood.
     */
    mouth?: MouthShape
    mood?: AvatarMood
    /** What a screen reader calls the avatar. Left out, it is decoration and is not announced. */
    label?: string
  }

export type AvatarFrameProps = AvatarProps & {
  /** The drawing: SVG shapes in a 200 by 200 picture. */
  children: ReactNode
}

/**
 * The square a drawn avatar sits in: its size, its backdrop (the theme's; the figure's colors
 * are its own) and how it is announced.
 */
export function AvatarFrame({
  mouth = 'rest',
  mood = 'neutral',
  size,
  label,
  className,
  children,
  ...rest
}: AvatarFrameProps) {
  return (
    <span
      data-mouth={mouth}
      data-mood={mood}
      className={cn(avatarVariants({ size }), className)}
      {...rest}
    >
      <svg
        viewBox="0 0 200 200"
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className="size-full"
      >
        {children}
      </svg>
    </span>
  )
}
