import { expect, test, type Locator, type Page } from '@playwright/test'
import { expectNoHorizontalScroll, signInAsAdmin } from './helpers'

// These tests set their own display size, so they mean the same in every project.
const TABLET = { width: 768, height: 1024 }
const DESKTOP = { width: 1280, height: 720 }
const PHONE = { width: 390, height: 844 }
const PHONE_SIDEWAYS = { width: 844, height: 390 }

/** The frame's screen is as wide as a common phone's, and at most as tall. */
const FRAME_WIDTH = 390
const FRAME_MAX_HEIGHT = 844
/** What is kept clear above and below the phone, and the bezel around its screen. */
const FRAME_MARGIN = 24
const FRAME_BEZEL = 10

const nav = (page: Page) => page.getByRole('navigation', { name: 'Main navigation' })
const box = async (locator: Locator) => {
  const found = await locator.boundingBox()
  if (!found) throw new Error('element is not on screen')
  return found
}
/** How far the page itself can scroll: nothing, when the phone frame does the scrolling. */
const pageScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight)

for (const [name, display] of [
  ['a tablet', TABLET],
  ['a desktop', DESKTOP],
] as const) {
  const screenHeight = Math.min(FRAME_MAX_HEIGHT, display.height - 2 * (FRAME_MARGIN + FRAME_BEZEL))
  const screenTop = (display.height - screenHeight) / 2
  const screenLeft = (display.width - FRAME_WIDTH) / 2

  test.describe(`on ${name}`, () => {
    test.use({ viewport: display })

    test('learner screens are drawn in a phone in the middle of the display', async ({ page }) => {
      await page.goto('/home')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your 50-week journey')

      // The bottom navigation spans the phone's screen, not the display, and sits at its foot.
      const bar = await box(nav(page))
      expect(Math.round(bar.width)).toBe(FRAME_WIDTH)
      expect(Math.round(bar.x)).toBe(Math.round(screenLeft))
      expect(Math.round(bar.y + bar.height)).toBe(Math.round(screenTop + screenHeight))
      await expectNoHorizontalScroll(page)
    })

    test('the phone is the viewport: a long screen scrolls inside it, under a navigation that stays put', async ({
      page,
    }) => {
      await page.goto('/home')
      const before = await box(nav(page))
      // The display itself has nothing to scroll.
      expect(await pageScroll(page)).toBe(0)

      const last = page.getByRole('list', { name: 'Sections' }).getByRole('link').last()
      await last.scrollIntoViewIfNeeded()
      await expect(last).toBeInViewport({ ratio: 1 })

      const after = await box(nav(page))
      expect(after.y).toBe(before.y)
      const section = await box(last)
      expect(section.y + section.height).toBeLessThanOrEqual(after.y)
      expect(section.x).toBeGreaterThanOrEqual(screenLeft)
      expect(await pageScroll(page)).toBe(0)
    })

    test('a choice tapped far down a screen scrolls nothing but the phone’s screen', async ({
      page,
    }) => {
      await page.goto('/profile/appearance')
      // The top bar is outside what scrolls, so it must not move whatever is tapped below.
      const back = page.getByRole('link', { name: 'Back to your profile' })
      const before = await box(back)

      // The tap focuses the card's hidden radio button, which the browser scrolls into view.
      await page.getByText('Midnight Iris').click()
      await expect(page.getByRole('radio', { name: 'Midnight Iris' })).toBeChecked()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight-iris')

      const after = await box(back)
      expect(after.y).toBe(before.y)
      expect(after.y).toBeGreaterThanOrEqual(screenTop)
      expect(after.y).toBeLessThan(screenTop + 40)
      expect(await pageScroll(page)).toBe(0)
    })

    test('a full-height step is as tall as the phone, with its action pinned at the phone’s foot', async ({
      page,
    }) => {
      await page.goto('/home/weeks/1')
      const start = await box(page.getByRole('link', { name: 'Start Day 1' }))
      const back = await box(page.getByRole('link', { name: 'Back to the weeks' }))

      // Top bar at the top of the phone's screen, action in its bottom third, both inside it.
      expect(back.y).toBeGreaterThanOrEqual(screenTop)
      expect(back.y).toBeLessThan(screenTop + 40)
      expect(start.y).toBeGreaterThan(screenTop + (screenHeight * 2) / 3)
      expect(start.y + start.height).toBeLessThanOrEqual(screenTop + screenHeight)
      expect(start.x).toBeGreaterThanOrEqual(screenLeft)
      expect(start.x + start.width).toBeLessThanOrEqual(screenLeft + FRAME_WIDTH)
      expect(await pageScroll(page)).toBe(0)
      await expectNoHorizontalScroll(page)
    })

    test('the landing page fills the phone, and a page that does not exist is shown in it too', async ({
      page,
    }) => {
      await page.goto('/')
      const cta = await box(page.getByRole('link', { name: 'Get Started' }))
      expect(cta.x).toBeGreaterThanOrEqual(screenLeft)
      expect(cta.x + cta.width).toBeLessThanOrEqual(screenLeft + FRAME_WIDTH)
      expect(cta.y + cta.height).toBeLessThanOrEqual(screenTop + screenHeight)
      expect(await pageScroll(page)).toBe(0)

      await page.goto('/no-such-page')
      const title = await box(page.getByRole('heading', { level: 1 }))
      expect(title.x).toBeGreaterThanOrEqual(screenLeft)
      expect(title.x + title.width).toBeLessThanOrEqual(screenLeft + FRAME_WIDTH)
    })

    test('the admin area keeps the whole display', async ({ page }) => {
      await signInAsAdmin(page)
      await page.goto('/admin/lessons')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lessons')

      const week = await box(page.getByRole('combobox', { name: 'Week' }))
      expect(week.width).toBeGreaterThan(FRAME_WIDTH)
      await expectNoHorizontalScroll(page)
    })
  })
}

test.describe('on a phone', () => {
  test.use({ viewport: PHONE })

  test('learner screens go edge to edge, and the page itself scrolls', async ({ page }) => {
    await page.goto('/home')
    const bar = await box(nav(page))
    expect(Math.round(bar.width)).toBe(PHONE.width)
    expect(Math.round(bar.x)).toBe(0)
    expect(Math.round(bar.y + bar.height)).toBe(PHONE.height)
    expect(await pageScroll(page)).toBeGreaterThan(0)
    await expectNoHorizontalScroll(page)
  })
})

test.describe('on a phone held sideways', () => {
  test.use({ viewport: PHONE_SIDEWAYS })

  test('there is no room to draw a phone, so screens keep to a column and the page scrolls', async ({
    page,
  }) => {
    await page.goto('/home')
    const bar = await box(nav(page))
    // Wider than the frame, narrower than the display: the plain column.
    expect(bar.width).toBeGreaterThan(FRAME_WIDTH)
    expect(bar.width).toBeLessThan(PHONE_SIDEWAYS.width)
    expect(Math.round(bar.y + bar.height)).toBe(PHONE_SIDEWAYS.height)
    expect(await pageScroll(page)).toBeGreaterThan(0)
  })
})
