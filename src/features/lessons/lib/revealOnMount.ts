/**
 * A ref callback for something that appears in answer to a tap but possibly out of sight (the
 * help for a blocked microphone): brings it to where the eye is as soon as it is on the page.
 */
export function revealOnMount(element: HTMLElement | null) {
  if (element && typeof element.scrollIntoView === 'function') {
    element.scrollIntoView({ block: 'nearest' })
  }
}
