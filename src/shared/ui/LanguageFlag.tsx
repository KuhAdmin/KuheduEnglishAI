import { useState } from 'react'

export type LanguageFlagProps = {
  flagUrl: string | null
  /** Language code, shown as initials when there is no usable image. */
  code: string
}

/** Circular flag for a language. Decorative: the language name is always shown next to it. */
export function LanguageFlag({ flagUrl, code }: LanguageFlagProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (flagUrl === null || flagUrl === failedUrl) {
    return (
      <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-on-primary-soft uppercase">
        {code.slice(0, 2)}
      </span>
    )
  }

  return (
    <img
      src={flagUrl}
      alt=""
      width={44}
      height={44}
      draggable={false}
      onError={() => setFailedUrl(flagUrl)}
      className="size-11 rounded-full border border-border object-cover"
    />
  )
}
