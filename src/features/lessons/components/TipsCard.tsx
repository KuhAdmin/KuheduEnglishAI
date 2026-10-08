import { Lightbulb } from 'lucide-react'

export type TipsCardProps = {
  /** The card's heading, e.g. "Tips". */
  title: string
  tips: readonly string[]
  /** The language the tips are written in. */
  lang: string
}

/** Short hints for the task at hand. Content an admin wrote, shown as plain text. */
export function TipsCard({ title, tips, lang }: TipsCardProps) {
  return (
    <section className="flex flex-col gap-2 rounded-xl bg-warning-soft p-4 text-fg">
      <h2 className="flex items-center gap-2 font-extrabold">
        <Lightbulb aria-hidden="true" className="size-5 text-warning" />
        {title}
      </h2>
      <ul lang={lang} className="flex list-disc flex-col gap-1 ps-5">
        {tips.map((tip, index) => (
          <li key={index}>{tip}</li>
        ))}
      </ul>
    </section>
  )
}
