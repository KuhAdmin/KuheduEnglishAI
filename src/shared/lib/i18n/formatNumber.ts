/**
 * A whole number written the way the language writes numbers: Bengali digits in Bengali, Latin
 * digits in Hindi and English — the same as the hand-written screen texts.
 */
export function formatNumber(language: string, value: number): string {
  try {
    return new Intl.NumberFormat(language, { useGrouping: false }).format(value)
  } catch {
    // An unknown language tag: plain digits are better than no number.
    return String(value)
  }
}
