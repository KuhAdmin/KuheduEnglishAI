import type { ReactNode } from 'react'

export type RevealedHelp = {
  /** What this text is, e.g. "What was said" or the language's name. */
  label: string
  text: string
  /** Language of the text, for fonts and screen readers. */
  lang: string
}

export type HelpPanelProps = {
  title: string
  /** Help the learner has asked to see. */
  revealed: readonly RevealedHelp[]
  /** The kinds of help still on offer, as buttons. */
  children: ReactNode
}

/** Help for the current question, opened by the learner when they are not sure. */
export function HelpPanel({ title, revealed, children }: HelpPanelProps) {
  return (
    <section
      aria-label={title}
      className="flex animate-rise-in flex-col gap-3 rounded-lg bg-surface-sunken p-4"
    >
      <h2 className="font-extrabold">{title}</h2>
      {/* Read out when it appears: the learner asked for it and is waiting. */}
      <div aria-live="polite" className="flex flex-col gap-3 empty:hidden">
        {revealed.map(({ label, text, lang }) => (
          <p key={label} className="flex flex-col gap-1 rounded-md bg-surface p-3">
            <span className="text-sm font-bold text-fg-muted">{label}</span>
            <span lang={lang} className="text-lg">
              {text}
            </span>
          </p>
        ))}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}
