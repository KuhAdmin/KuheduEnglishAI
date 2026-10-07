import { expect, type BrowserContext, type Page } from '@playwright/test'

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

/**
 * Replace the browser's text-to-speech, which has no voices in a headless browser. `works`
 * "speaks" instantly; `fails` reports an error, as a device with no usable voice would.
 */
export async function stubSpeech(target: Page | BrowserContext, mode: 'works' | 'fails' = 'works') {
  await target.addInitScript((behaviour) => {
    type Utterance = {
      onstart?: () => void
      onend?: () => void
      onerror?: (event: { error: string }) => void
    }
    const fake = {
      getVoices: () => [],
      cancel: () => {},
      speak: (utterance: Utterance) => {
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
  }, mode)
}

/** Make the browser refuse the microphone, as when the learner taps "Block". */
export async function denyMicrophone(target: Page | BrowserContext) {
  await target.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
      configurable: true,
    })
  })
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}
