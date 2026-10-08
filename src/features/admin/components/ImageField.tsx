import { ImageOff } from 'lucide-react'
import { useId, useRef, useState, type ChangeEvent } from 'react'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { adminText } from '../adminText'
import { fileToStoredImage, ImageTooLargeError, type ImageBounds } from '../lib/imageUpload'

const shapeClass = {
  circle: 'size-20 rounded-full',
  square: 'size-20 rounded-md',
  portrait: 'h-32 w-18 rounded-md',
  landscape: 'h-18 w-32 rounded-md',
}

export type ImageFieldProps = {
  label: string
  hint?: string
  /** Current image, or `null` for none. */
  value: string | null
  /** What "Use default" / "Remove image" goes back to; `null` means no image. */
  defaultValue: string | null
  onChange: (value: string | null) => void
  /** Uploaded images are shrunk to fit these bounds. */
  bounds: ImageBounds
  shape?: keyof typeof shapeClass
  className?: string
}

/** Shows an image setting and lets the admin replace it with an upload or go back to the default. */
export function ImageField({
  label,
  hint,
  value,
  defaultValue,
  onChange,
  bounds,
  shape = 'square',
  className,
}: ImageFieldProps) {
  const inputId = useId()
  const hintId = `${inputId}-hint`
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<'idle' | 'processing' | 'failed' | 'too-large'>('idle')

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Allow choosing the same file again later.
    event.target.value = ''
    if (!file) return

    setState('processing')
    try {
      onChange(await fileToStoredImage(file, bounds))
      setState('idle')
    } catch (error) {
      setState(error instanceof ImageTooLargeError ? 'too-large' : 'failed')
    }
  }

  const problem =
    state === 'failed'
      ? adminText.image.failed
      : state === 'too-large'
        ? adminText.image.tooLarge
        : null

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <span className="text-sm font-bold text-fg">{label}</span>
      <div className="flex items-center gap-4">
        <span
          className={cn(
            'flex shrink-0 items-center justify-center overflow-hidden border border-border bg-surface-sunken text-fg-subtle',
            shapeClass[shape],
          )}
        >
          {value ? (
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <ImageOff aria-label={adminText.image.none} className="size-6" />
          )}
        </span>

        <div className="flex min-w-0 flex-col items-start gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={state === 'processing'}
              onClick={() => inputRef.current?.click()}
            >
              {state === 'processing'
                ? adminText.image.processing
                : value
                  ? adminText.image.replace
                  : adminText.image.upload}
            </Button>
            {value !== defaultValue && (
              <Button variant="ghost" onClick={() => onChange(defaultValue)}>
                {defaultValue === null ? adminText.image.remove : adminText.image.useDefault}
              </Button>
            )}
          </div>
          {hint && (
            <p id={hintId} className="text-sm text-fg-muted">
              {hint}
            </p>
          )}
        </div>
      </div>

      {/* The visible button opens this; it stays in the accessibility tree with its own name. */}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        aria-label={label}
        aria-describedby={hint ? hintId : undefined}
        onChange={handleFile}
        className="sr-only"
        tabIndex={-1}
      />

      {problem && (
        <p role="alert" className="text-sm font-bold text-danger">
          {problem}
        </p>
      )}
    </div>
  )
}
