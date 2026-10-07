/**
 * Put values into a screen text's `{name}` placeholders, e.g. `Level {level}`. The placeholder
 * stays in the stored text so each language can put it where its grammar needs it. One that has
 * no value is left as written, which makes a mistyped name easy to spot on screen.
 */
export function fillText(text: string, values: Readonly<Record<string, string>>): string {
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) => values[name] ?? placeholder)
}
