/**
 * A voice's accent in words ("English (India)"), in the learner's language where the browser
 * knows it. A tag it cannot name is shown as it is.
 */
export function accentName(language: string, tag: string): string {
  const normalised = tag.replace('_', '-')
  try {
    // `standard`: "English (United States)", in step with the others, not "American English".
    const names = new Intl.DisplayNames([language, 'en'], {
      type: 'language',
      languageDisplay: 'standard',
    })
    return names.of(normalised) ?? tag
  } catch {
    return tag
  }
}
