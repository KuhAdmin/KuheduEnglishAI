import { useLayoutEffect, useRef, type ComponentProps } from 'react'
import { FIT_TEXT_MIN_REM, fittedSize } from './fittedSize'

export type FitTextProps = ComponentProps<'p'> & {
  /** The smallest size the line may be drawn at, in rem. */
  minSize?: number
  /**
   * Told the size the line was drawn at, as a CSS `font-size`, each time it is fitted;
   * `undefined` when its own size fits. For a text beside it that is to be the same size: give
   * it a state's setter (one that stays the same between renders, or the line is fitted again
   * at each).
   */
  onFit?: (fontSize: string | undefined) => void
}

/**
 * One line of text that stays one line: where its place is too narrow for it at its own size
 * (the one its classes give it), it is drawn a little smaller, as much as is needed and no
 * more, down to `minSize`. Under that it wraps, at `minSize`. It follows its place as that
 * changes (a narrower phone, another language's longer wording, a font that arrives late).
 *
 * For a short note beside a control, which reads better whole than broken after its last two
 * words. Not for body text, and not for anything long: a text that needs to wrap should.
 */
export function FitText({
  minSize = FIT_TEXT_MIN_REM,
  onFit,
  className,
  children,
  ...rest
}: FitTextProps) {
  const line = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const element = line.current
    if (!element) return

    const fit = () => {
      // Measured at its own size, on one line: how much room the whole of it asks for.
      element.style.fontSize = ''
      element.style.whiteSpace = 'nowrap'
      const base = Number.parseFloat(getComputedStyle(element).fontSize)
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const available = element.clientWidth
      // Nothing to measure against (not laid out, or a test's page without layout).
      if (!base || available === 0) return

      const min = minSize * rem
      let size = fittedSize(base, available, element.scrollWidth, min)
      // Letters do not narrow in exact step with their size: look, and give a little more.
      while (size !== null && size < base) {
        element.style.fontSize = `${size / rem}rem`
        if (element.scrollWidth <= available) break
        size = size - 0.5 >= min ? size - 0.5 : null
      }
      if (size === null) {
        element.style.fontSize = `${minSize}rem`
        element.style.whiteSpace = ''
      }
      onFit?.(element.style.fontSize || undefined)
    }

    fit()
    if (typeof ResizeObserver === 'undefined') return

    // Its own height changes as it is fitted; only a change of width is a reason to fit again.
    let width = element.clientWidth
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return
      width = element.clientWidth
      fit()
    })
    observer.observe(element)
    // A script's own font (Bengali, Devanagari) is fetched when first shown, and is wider or
    // narrower than the one drawn meanwhile.
    const fonts = document.fonts as FontFaceSet | undefined
    fonts?.addEventListener('loadingdone', fit)
    return () => {
      observer.disconnect()
      fonts?.removeEventListener('loadingdone', fit)
    }
  }, [children, minSize, onFit])

  return (
    <p ref={line} className={className} {...rest}>
      {children}
    </p>
  )
}
