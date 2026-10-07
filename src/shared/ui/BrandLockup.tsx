import { cn } from '@/shared/lib/cn'

export type BrandLockupProps = {
  logoUrl: string
  name: string
  /** Smaller line under the name; left out when empty. */
  tagline?: string
  className?: string
}

/** Logo + product name + tagline lockup. */
export function BrandLockup({ logoUrl, name, tagline, className }: BrandLockupProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* The name is right next to it, so the logo itself is decorative. */}
      <img
        src={logoUrl}
        alt=""
        width={44}
        height={44}
        className="size-11 shrink-0 rounded-md object-contain"
      />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-xl leading-6 font-extrabold tracking-tight text-fg">
          {name}
        </span>
        {tagline && <span className="truncate text-sm text-fg-muted">{tagline}</span>}
      </div>
    </div>
  )
}
