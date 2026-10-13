import { expect, expectNoHorizontalScroll, LEARNER, PIXEL_PNG, signedInAs, test } from './helpers'

const GOOGLE_PICTURE = 'https://lh3.googleusercontent.com/a/asha=s96-c'

test('the profile shows the Google account’s picture, and the camera changes it for a photo kept here', async ({
  page,
}) => {
  await signedInAs(page, { ...LEARNER, pictureUrl: GOOGLE_PICTURE })
  await page.route('https://lh3.googleusercontent.com/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: PIXEL_PNG }),
  )
  await page.goto('/profile')

  const card = page.getByRole('region', { name: 'Your learning' })
  const photo = card.getByRole('img', { name: 'Your photo' })
  await expect(photo).toHaveAttribute('src', GOOGLE_PICTURE)
  await expect(photo).toHaveJSProperty('complete', true)
  expect(await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)

  // The camera is a comfortable touch target, and nothing is there to remove yet.
  const camera = card.getByRole('button', { name: 'Change your photo' })
  const box = await camera.boundingBox()
  expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(44)
  expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44)
  await expect(card.getByRole('button', { name: 'Remove photo' })).toHaveCount(0)
  await expectNoHorizontalScroll(page)

  // The camera opens the phone's own chooser; the photo is shrunk here and shown at once.
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), camera.click()])
  await chooser.setFiles({ name: 'me.png', mimeType: 'image/png', buffer: PIXEL_PNG })
  await expect(photo).toHaveAttribute('src', /^data:image\/(webp|jpeg);base64,/)
  await expect(
    card.getByText('This photo is saved with your account. Only you see it.'),
  ).toBeVisible()
  await expectNoHorizontalScroll(page)

  // Kept in this browser: it is still their picture after a reload.
  await page.reload()
  await expect(photo).toHaveAttribute('src', /^data:image\//)

  // Removed, the Google picture is back.
  const remove = card.getByRole('button', { name: 'Remove photo' })
  expect(Math.round((await remove.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44)
  await remove.click()
  await expect(photo).toHaveAttribute('src', GOOGLE_PICTURE)
  await expect(
    card.getByText('This photo is saved with your account. Only you see it.'),
  ).toHaveCount(0)
})

test('an account without a picture has the stand-in, and a file that is no picture is refused', async ({
  page,
}) => {
  await page.goto('/profile')
  const card = page.getByRole('region', { name: 'Your learning' })
  const camera = card.getByRole('button', { name: 'Change your photo' })
  await expect(camera).toBeVisible()
  await expect(card.getByRole('img', { name: 'Your photo' })).toHaveCount(0)

  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), camera.click()])
  await chooser.setFiles({ name: 'notes.png', mimeType: 'image/png', buffer: Buffer.from('no') })
  await expect(card.getByRole('alert')).toHaveText(
    'That file could not be read as a picture. Choose another one.',
  )
  await expect(card.getByRole('img', { name: 'Your photo' })).toHaveCount(0)
})
