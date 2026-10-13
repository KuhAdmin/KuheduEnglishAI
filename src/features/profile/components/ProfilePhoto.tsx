import { Camera } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useT } from '@/shared/lib/i18n'
import { IconButton } from '@/shared/ui/IconButton'

export type ProfilePhotoProps = {
  /** The learner's picture: their own photo or their sign-in provider's. `null` for none. */
  src: string | null
  /** Drawn when there is no picture, or it cannot be loaded. Give it the picture's size (`size-20`). */
  fallback: ReactNode
  /** A photo is being taken in: the camera waits. */
  busy?: boolean
  onChoose: (file: File) => void
}

/**
 * The learner's picture in Profile, with a camera button on its corner that opens the phone's
 * own chooser (the camera or the gallery) to change it.
 */
export function ProfilePhoto({ src, fallback, busy = false, onChoose }: ProfilePhotoProps) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  // A picture kept elsewhere (the sign-in provider's) may not load: offline, or taken down.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const shown = src !== null && src !== failedSrc ? src : null

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Allow choosing the same file again later.
    event.target.value = ''
    if (file) onChoose(file)
  }

  return (
    // `relative`: the hidden input and the camera are placed in it (see "The phone frame").
    <div className="relative shrink-0">
      {shown ? (
        <img
          src={shown}
          alt={t('profile.photo.alt')}
          width={80}
          height={80}
          draggable={false}
          // The provider's picture is asked for without saying which page wants it.
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(shown)}
          className="size-20 rounded-full bg-primary-soft object-cover"
        />
      ) : (
        fallback
      )}

      {/* A full touch target around a smaller disc, so the picture is not covered. */}
      <IconButton
        label={t('profile.photo.change')}
        disabled={busy}
        aria-busy={busy || undefined}
        onClick={() => inputRef.current?.click()}
        className="absolute -end-3 -bottom-3"
      >
        <span className="flex size-8 items-center justify-center rounded-full border-2 border-surface bg-primary text-on-primary">
          <Camera aria-hidden="true" className="size-4" />
        </span>
      </IconButton>
      {/* The button opens this; it is the button that is named and reached by keyboard. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleFile}
        className="sr-only"
      />
    </div>
  )
}
