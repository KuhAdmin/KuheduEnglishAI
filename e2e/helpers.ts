import { expect, type BrowserContext, type Locator, type Page } from '@playwright/test'

/** A 1×1 PNG, for uploads and for mocked image URLs. */
export const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

export const ADMIN = { username: 'admin', password: 'Kuhedu@123' }

/**
 * Put a value in localStorage before the app starts — once per browser context, so later
 * changes made through the UI survive reloads and are shared between tabs.
 */
async function seedStorage(target: Page | BrowserContext, key: string, value: unknown) {
  await target.addInitScript(
    ([storageKey, json]) => {
      const marker = `e2e-seeded:${storageKey}`
      if (localStorage.getItem(marker)) return
      localStorage.setItem(marker, '1')
      localStorage.setItem(storageKey, json)
    },
    [key, JSON.stringify(value)] as const,
  )
}

/** Start as a learner who already chose this language. */
export const seedLanguage = (target: Page | BrowserContext, language: string) =>
  seedStorage(target, 'kuhedu-language', { state: { language }, version: 0 })

/** Start with settings an admin saved earlier. */
export const seedSettings = (target: Page | BrowserContext, name: string, value: unknown) =>
  seedStorage(target, `kuhedu-settings:${name}`, value)

/** Sign in through the real screen, starting from the landing page's "Sign in" link. */
export async function signInAsAdmin(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'Sign in' }).click()
  await page.getByLabel('Email address').fill(ADMIN.username)
  await page.getByLabel('Password', { exact: true }).fill(ADMIN.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/admin\/texts$/)
}

/** A voice of the fake device: what `SpeechSynthesisVoice` has. */
export type FakeVoice = { name: string; lang: string; localService: boolean; voiceURI: string }

/** One thing the fake device was asked to say, and the voice it was to say it in. */
export type Spoken = { text: string; voice: string | null }

/**
 * Replace the browser's text-to-speech, which has no voices in a headless browser. `works`
 * "speaks" instantly; `fails` reports an error, as a device with no usable voice would. The
 * device has the `voices` given (none unless a test is about them), and what it is asked to
 * say can be read back with `spoken`.
 */
export async function stubSpeech(
  target: Page | BrowserContext,
  mode: 'works' | 'fails' = 'works',
  voices: readonly FakeVoice[] = [],
) {
  await target.addInitScript(
    ([behaviour, deviceVoices]) => {
      type Utterance = {
        text: string
        voice?: { voiceURI: string } | null
        onstart?: () => void
        onend?: () => void
        onerror?: (event: { error: string }) => void
      }
      const said: { text: string; voice: string | null }[] = []
      Object.defineProperty(window, '__spoken', { value: said, configurable: true })
      const fake = {
        getVoices: () => deviceVoices,
        cancel: () => {},
        speak: (utterance: Utterance) => {
          said.push({ text: utterance.text, voice: utterance.voice?.voiceURI ?? null })
          setTimeout(() => {
            if (behaviour === 'fails') {
              utterance.onerror?.({ error: 'synthesis-failed' })
            } else {
              utterance.onstart?.()
              utterance.onend?.()
            }
          }, 50)
        },
      }
      Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true })
      // The browser's own utterance only takes one of its own voices, and these are not.
      class FakeUtterance {
        voice: { voiceURI: string } | null = null
        lang = ''
        rate = 1
        pitch = 1
        constructor(readonly text: string) {}
      }
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        value: FakeUtterance,
        configurable: true,
      })
    },
    [mode, voices] as const,
  )
}

/** Everything the fake device (`stubSpeech`) has been asked to say since the page loaded. */
export const spoken = (page: Page) =>
  page.evaluate(() => (window as unknown as { __spoken: Spoken[] }).__spoken)

/** Make the browser refuse the microphone, as when the learner taps "Block". */
export async function denyMicrophone(target: Page | BrowserContext) {
  await target.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
      configurable: true,
    })
  })
}

/**
 * Scrolls to the very end whatever it is that scrolls the element: the page on a phone, the
 * phone frame's screen on a tablet or anything wider.
 */
export async function scrollToEnd(inside: Locator) {
  await inside.evaluate((element) => {
    const scrolls = (candidate: Element) =>
      candidate.scrollHeight > candidate.clientHeight &&
      /auto|scroll/.test(getComputedStyle(candidate).overflowY)
    let scroller = element.parentElement
    while (scroller && !scrolls(scroller)) scroller = scroller.parentElement
    const target = scroller ?? document.scrollingElement
    target?.scrollTo(0, target.scrollHeight)
  })
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}
