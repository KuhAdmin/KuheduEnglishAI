import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export type PhoneFrameProps = {
  children: ReactNode
}

/**
 * Where learner screens are drawn. On a phone it is the screen itself: a full-width column, and
 * the page scrolls. On a tablet or anything wider (`framed:`, which also needs the height for
 * it) it is a phone drawn in the middle of the display — and that phone is then the viewport:
 * a screen is as tall as it (`h-viewport`), scrolls inside it, and anything `sticky` or `fixed`
 * stays within it.
 */
export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    // The display around the phone; on a phone, nothing.
    <div className="framed:flex framed:min-h-dvh framed:items-center framed:justify-center framed:bg-surface-sunken">
      <div
        className={cn(
          'mx-auto w-full max-w-lg bg-bg',
          // The phone: its screen is exactly `--frame-width` wide, the bezel goes around it.
          'framed:mx-0 framed:box-content framed:w-(--frame-width) framed:max-w-none framed:shrink-0 framed:frame-viewport',
          // `clip`, not `hidden`: a hidden box can still be scrolled (by focus moving to something
          // below its edge), which would slide the whole screen up inside the phone.
          'framed:overflow-clip framed:rounded-(--frame-radius) framed:border-(length:--frame-bezel) framed:border-border-strong framed:shadow-lg',
          // Makes the phone, not the display, what `fixed` descendants are placed against.
          'framed:transform-gpu',
        )}
      >
        {/* `relative`: an `absolute` descendant (a visually hidden radio button) is then placed in
            what scrolls, and scrolls with it, instead of against the phone above. */}
        <div className="min-h-viewport framed:relative framed:frame-scrollbars framed:h-viewport framed:overflow-y-auto framed:scroll-contained">
          {children}
        </div>
      </div>
    </div>
  )
}
