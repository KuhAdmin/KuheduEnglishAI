import { expect, test } from '@playwright/test'
import { ADMIN, PIXEL_PNG, seedLanguage, signInAsAdmin } from './helpers'

const save = 'Save changes'

test.describe('admin sign-in', () => {
  test('the admin area is closed to visitors who are not signed in', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/sign-in$/)

    await page.goto('/admin/languages')
    await expect(page).toHaveURL(/\/sign-in$/)
  })

  test('wrong credentials are refused; the default admin gets in from the landing page', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Sign in' }).click()

    await page.getByLabel('Email address').fill(ADMIN.username)
    await page.getByLabel('Password', { exact: true }).fill('not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toHaveText('Incorrect email or password.')
    await expect(page).toHaveURL(/\/sign-in$/)

    await page.getByLabel('Password', { exact: true }).fill(ADMIN.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/admin\/texts$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Screen texts' })).toBeVisible()
  })

  test('the session survives a reload and ends on sign-out', async ({ page }) => {
    await signInAsAdmin(page)
    await page.reload()
    await expect(page).toHaveURL(/\/admin\/texts$/)

    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/sign-in$/)
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/sign-in$/)
  })

  test('every section is reachable from the tabs', async ({ page }) => {
    await signInAsAdmin(page)
    for (const [tab, heading] of [
      ['Landing page', 'Landing page'],
      ['Languages', 'Languages'],
      ['Profile pictures', 'Profile pictures'],
      ['Screen texts', 'Screen texts'],
    ] as const) {
      await page.getByRole('navigation', { name: 'Admin sections' }).getByText(tab).click()
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    }
  })
})

test.describe('admin and app side by side', () => {
  test('an edited Bengali text appears in the learner’s open tab without a reload', async ({
    context,
    page: adminTab,
  }) => {
    await signInAsAdmin(adminTab)

    const learnerTab = await context.newPage()
    await learnerTab.goto('/onboarding/language')
    await expect(learnerTab.getByRole('heading', { level: 1 })).toHaveText('আপনার ভাষা বেছে নিন')

    await adminTab.getByText('বাংলা').click()
    const field = adminTab.getByRole('textbox', { name: 'Choose your language' })
    await expect(field).toHaveValue('আপনার ভাষা বেছে নিন')
    await field.fill('আপনার মাতৃভাষা বেছে নিন')
    await adminTab.getByRole('button', { name: save }).click()
    await expect(adminTab.getByRole('status')).toContainText('Saved')

    await expect(learnerTab.getByRole('heading', { level: 1 })).toHaveText(
      'আপনার মাতৃভাষা বেছে নিন',
    )
    // Other languages are untouched.
    await learnerTab.getByText('हिन्दी').click()
    await expect(learnerTab.getByRole('heading', { level: 1 })).toHaveText('अपनी भाषा चुनें')

    // The edit is still there after both tabs reload.
    await learnerTab.reload()
    await expect(learnerTab.getByRole('heading', { level: 1 })).toHaveText(
      'আপনার মাতৃভাষা বেছে নিন',
    )
    await adminTab.reload()
    await adminTab.getByText('বাংলা').click()
    await expect(adminTab.getByRole('textbox', { name: 'Choose your language' })).toHaveValue(
      'আপনার মাতৃভাষা বেছে নিন',
    )

    // Resetting that one text restores the built-in wording everywhere.
    await adminTab.getByRole('button', { name: 'Reset this text: Choose your language' }).click()
    await adminTab.getByRole('button', { name: save }).click()
    await learnerTab.getByText('বাংলা').click()
    await expect(learnerTab.getByRole('heading', { level: 1 })).toHaveText('আপনার ভাষা বেছে নিন')
  })

  test('the account screen’s texts are edited under their own screen filter', async ({
    context,
    page: adminTab,
  }) => {
    await signInAsAdmin(adminTab)

    const learnerTab = await context.newPage()
    await learnerTab.goto('/sign-up')
    await expect(learnerTab.getByRole('button', { name: 'Create Account' })).toBeVisible()

    await adminTab.getByRole('combobox', { name: 'Screen' }).selectOption('Sign in and sign up')
    await expect(adminTab.getByRole('heading', { level: 2 })).toHaveText(['Sign in and sign up'])
    await expect(adminTab.getByRole('textbox', { name: 'Choose your language' })).toHaveCount(0)

    await adminTab.getByRole('textbox', { name: 'Create Account' }).fill('Join now')
    await adminTab.getByRole('button', { name: save }).click()
    await expect(adminTab.getByRole('status')).toContainText('Saved')

    await expect(learnerTab.getByRole('button', { name: 'Join now' })).toBeVisible()
    // The other languages keep their own wording.
    await learnerTab.getByRole('combobox', { name: 'Language' }).selectOption('hi')
    await expect(learnerTab.getByRole('button', { name: 'खाता बनाएँ' })).toBeVisible()
  })

  test('a language added by the admin shows up on the language step, with its own texts', async ({
    context,
    page: adminTab,
  }) => {
    await signInAsAdmin(adminTab)
    await adminTab.goto('/admin/languages')

    await adminTab.getByRole('button', { name: 'Add language' }).click()
    const row = adminTab.locator('ol > li').nth(3)
    await row.getByLabel('Language code').fill('ta')
    await row.getByLabel('Name in its own script').fill('தமிழ்')
    await row.getByLabel(/^Note in brackets/).fill('Tamil')
    await row.getByLabel('Flag: தமிழ்').setInputFiles({
      name: 'flag.png',
      mimeType: 'image/png',
      buffer: PIXEL_PNG,
    })
    await expect(row.getByRole('button', { name: 'Remove image' })).toBeVisible()
    await adminTab.getByRole('button', { name: save }).click()
    await expect(adminTab.getByRole('status')).toContainText('Saved')

    const learnerTab = await context.newPage()
    await learnerTab.goto('/onboarding/language')
    await expect(learnerTab.getByRole('radio')).toHaveCount(4)
    const tamil = learnerTab.getByRole('radio', { name: 'தமிழ் (Tamil)' })
    await expect(tamil).toBeVisible()
    // The uploaded flag is stored in the browser and shown.
    const flag = learnerTab.locator('fieldset label').nth(3).locator('img')
    await expect(flag).toHaveAttribute('src', /^data:image\/(webp|png|jpeg);base64,/)
    expect(await flag.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)

    // No Tamil texts yet → English, until the admin writes one.
    await learnerTab.getByText('தமிழ்').click()
    await expect(learnerTab.getByRole('heading', { level: 1 })).toHaveText('Choose your language')

    await adminTab.goto('/admin/texts')
    await adminTab.getByText('தமிழ்').click()
    await adminTab
      .getByRole('textbox', { name: 'Choose your language' })
      .fill('உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்')
    await adminTab.getByRole('button', { name: save }).click()
    await expect(learnerTab.getByRole('heading', { level: 1 })).toHaveText(
      'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
    )
  })

  test('landing-page changes, including an uploaded logo, reach the landing page', async ({
    context,
    page: adminTab,
  }) => {
    await signInAsAdmin(adminTab)
    await adminTab.goto('/admin/landing')

    // Rewrite the Bengali and English headlines and drop the Hindi one.
    await adminTab.getByLabel('Headline 1', { exact: true }).fill('নতুন বাংলা শিরোনাম')
    await adminTab.getByLabel('Headline 3', { exact: true }).fill('Speak with confidence')
    await adminTab.getByRole('button', { name: 'Remove headline 2' }).click()
    await adminTab.getByLabel('Brand name').fill('Acme English')
    await adminTab.getByLabel('Main button').fill('Start now')
    await adminTab.getByLabel('Logo').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: PIXEL_PNG,
    })
    await expect(adminTab.getByRole('button', { name: 'Use default' })).toBeVisible()
    await adminTab.getByRole('button', { name: save }).click()
    await expect(adminTab.getByRole('status')).toContainText('Saved')

    const learnerTab = await context.newPage()
    await learnerTab.goto('/')
    const headline = learnerTab.getByRole('heading', { level: 1 })
    await expect(headline).toHaveText('নতুন বাংলা শিরোনাম')
    // Two headlines left, so two language buttons; the English one shows the edited text.
    await expect(learnerTab.getByRole('group', { name: 'Headline language' })).toBeVisible()
    await expect(learnerTab.getByRole('button', { name: 'हिन्दी' })).toHaveCount(0)
    await learnerTab.getByRole('button', { name: 'English' }).click()
    await expect(headline).toHaveText('Speak with confidence')
    await expect(learnerTab.getByText('Acme English')).toBeVisible()
    await expect(learnerTab.getByRole('link', { name: 'Start now' })).toBeVisible()
    await expect(learnerTab.locator('header img')).toHaveAttribute('src', /^data:image\//)

    // Reset to defaults (after confirming) brings the original landing page back, live.
    adminTab.once('dialog', (dialog) => dialog.accept())
    await adminTab.getByRole('button', { name: 'Reset to defaults' }).click()
    await expect(learnerTab.getByText('Kuhedu English')).toBeVisible()
    await expect(learnerTab.getByRole('link', { name: 'Get Started' })).toBeVisible()
    await expect(learnerTab.locator('header img')).toHaveAttribute('src', '/logo.svg')
  })

  test('an uploaded profile picture replaces the bundled one on "Tell us about yourself"', async ({
    context,
    page: adminTab,
  }) => {
    await seedLanguage(context, 'en')
    await signInAsAdmin(adminTab)
    await adminTab.goto('/admin/profiles')

    await adminTab.getByLabel('Male picture: Child (6–12)', { exact: true }).setInputFiles({
      name: 'boy.png',
      mimeType: 'image/png',
      buffer: PIXEL_PNG,
    })
    await expect(adminTab.getByRole('button', { name: 'Use default' })).toBeVisible()
    await adminTab.getByRole('button', { name: save }).click()
    await expect(adminTab.getByRole('status')).toContainText('Saved')

    const learnerTab = await context.newPage()
    await learnerTab.goto('/onboarding/profile')
    const childPictures = learnerTab.locator('fieldset label').first().locator('img')
    await expect(childPictures).toHaveCount(2)
    await expect(childPictures.first()).toHaveAttribute('src', /^data:image\//)
    await expect(childPictures.nth(1)).toHaveAttribute('src', '/avatars/child-female.svg')
  })

  test('unsaved edits can be discarded and incomplete language rows cannot be saved', async ({
    page,
  }) => {
    await signInAsAdmin(page)
    await page.goto('/admin/languages')

    await expect(page.getByRole('button', { name: save })).toBeDisabled()
    await page.getByRole('button', { name: 'Add language' }).click()
    await expect(page.getByText('Use a short code such as bn or en-IN.')).toBeVisible()
    await expect(page.getByRole('button', { name: save })).toBeDisabled()

    await page.getByRole('button', { name: 'Discard' }).click()
    await expect(page.locator('ol > li')).toHaveCount(3)
  })
})
