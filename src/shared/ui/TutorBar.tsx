import { Volume2, VolumeX } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import type { MouthShape } from '@/shared/lib/audio/lipSync'
import { cn } from '@/shared/lib/cn'
import type { TutorAvatarId } from '@/shared/lib/learner/tutorAvatar'
import type { AvatarMood } from './AvatarFrame'
import { IconButton } from './IconButton'
import { TutorAvatar } from './TutorAvatar'

export type TutorBarProps = Omit<ComponentProps<'section'>, 'children' | 'aria-label'> & {
  /** What a screen reader calls this part of the screen, e.g. "Your tutor". */
  label: string
  avatar: TutorAvatarId
  /** Give it `useLipSync()` to move the lips while the line is being said. */
  mouth?: MouthShape
  mood?: AvatarMood
  /** What the tutor says, written out. Set `lang` when it is not in the screen's language. */
  text: string
  /**
   * Makes the face a button that says the line (again), or stops it. Left out on a device that
   * cannot say the line: it is then only written.
   */
  replay?: { label: string; onClick: () => void }
  /** The button that silences the tutor for good, or lets it speak again. Left out like `replay`. */
  sound?: { muted: boolean; label: string; onToggle: () => void }
  /**
   * A control of the screen's own laid over the first row's start, opposite the mute button: a
   * back arrow that must keep its place. An `IconButton` of variant `secondary` suits the panel.
   */
  leading?: ReactNode
}

/**
 * The tutor's place on a screen: the face in the middle, large enough to be someone who is
 * there, and under it what the tutor has to say right now. The line is always written, whether
 * or not it is also said aloud. It is drawn as a panel in the theme's soft primary colour, so a
 * wrapper that runs it to the screen's edges uses the same colour.
 */
export function TutorBar({
  label,
  avatar,
  mouth,
  mood,
  text,
  replay,
  sound,
  leading,
  className,
  ...rest
}: TutorBarProps) {
  const face = <TutorAvatar avatar={avatar} size="md" mouth={mouth} mood={mood} />

  return (
    <section
      aria-label={label}
      // A panel of its own colour: the tutor's place is told apart from the screen it speaks
      // about, and from whatever scrolls past under it.
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl bg-primary-soft p-3 text-on-primary-soft',
        className,
      )}
      {...rest}
    >
      {/* The controls are laid over the row's two ends, so the face stays in the middle with or
          without them. */}
      <div className="relative flex w-full justify-center">
        {leading && <div className="absolute inset-s-0 top-0">{leading}</div>}
        {replay ? (
          <button
            type="button"
            aria-label={replay.label}
            title={replay.label}
            onClick={replay.onClick}
            className="flex shrink-0 rounded-xl transition-transform duration-(--duration-fast) ease-standard select-none active:scale-95"
          >
            {face}
          </button>
        ) : (
          face
        )}
        {sound && (
          <IconButton
            // The variant drawn for this panel's colour.
            variant="secondary"
            label={sound.label}
            aria-pressed={sound.muted}
            onClick={sound.onToggle}
            className="absolute inset-e-0 top-0"
          >
            {sound.muted ? (
              <VolumeX aria-hidden="true" className="size-6" />
            ) : (
              <Volume2 aria-hidden="true" className="size-6" />
            )}
          </IconButton>
        )}
      </div>
      <p className="relative w-full rounded-xl bg-surface px-4 py-2 text-center wrap-break-word text-fg shadow-sm">
        {/* The bubble's tail, pointing up at the face that says it. */}
        <span
          aria-hidden="true"
          className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-surface"
        />
        {text}
      </p>
    </section>
  )
}
