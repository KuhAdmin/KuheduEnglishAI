import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '@/shared/lib/account'
import { LANGUAGES_CONFIG_NAME } from '@/shared/lib/appConfig/languagesConfig'
import { settingsRepository } from '@/shared/lib/appConfig/settingsRepository'
import { useVoiceStore } from '@/shared/lib/audio/useVoiceStore'
import {
  fileToStoredImage,
  ImageTooLargeError,
  ImageUnreadableError,
} from '@/shared/lib/image/imageUpload'
import type * as ImageUpload from '@/shared/lib/image/imageUpload'
import { useProfilePhotoStore } from '@/shared/lib/learner/profilePhoto'
import { useTutorAvatarStore } from '@/shared/lib/learner/tutorAvatar'
import { AppLanguageProvider, useLanguageStore } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { useThemeStore } from '@/shared/theme'
import { installFakeSound, removeFakeSound } from '@/test/fakeSound'
import { ProfileAppearancePage } from './ProfileAppearancePage'
import { ProfileLanguagePage } from './ProfileLanguagePage'
import { ProfilePage } from './ProfilePage'

// jsdom has no canvas; the shrinking itself is covered by fitWithin's tests and by Playwright.
const PHOTO = 'data:image/webp;base64,UklGRg=='
vi.mock('@/shared/lib/image/imageUpload', async (importOriginal) => ({
  ...(await importOriginal<typeof ImageUpload>()),
  fileToStoredImage: vi.fn(),
}))

const learner = {
  id: 'u-1',
  email: 'asha@example.com',
  emailVerified: true,
  role: 'learner' as const,
  displayName: null,
  pictureUrl: null,
}
const GOOGLE_PICTURE = 'https://lh3.googleusercontent.com/a/asha=s96-c'

function renderProfile(initialPath: string = paths.profile) {
  // The screens themselves, not the app's lazy routes: loading a route's code can take longer
  // than a test waits for a heading on a busy machine.
  const router = createMemoryRouter(
    [
      { path: paths.profile, Component: ProfilePage },
      { path: paths.profileLanguage, Component: ProfileLanguagePage },
      { path: paths.profileAppearance, Component: ProfileAppearancePage },
    ],
    { initialEntries: [initialPath] },
  )
  render(
    <AppLanguageProvider>
      <RouterProvider router={router} />
    </AppLanguageProvider>,
  )
  return router
}

const settings = (name: string) => within(screen.getByRole('navigation', { name }))
const languages = (name: string) => within(screen.getByRole('group', { name }))

beforeEach(() => {
  localStorage.clear()
  useLanguageStore.setState({ language: null })
  useThemeStore.setState({ preference: 'auto' })
  useVoiceStore.setState({ voices: {} })
  useTutorAvatarStore.setState({ avatar: null })
  useSessionStore.setState({ user: null, loaded: false })
  useProfilePhotoStore.setState({ photo: null })
  vi.mocked(fileToStoredImage).mockReset().mockResolvedValue(PHOTO)
})

afterEach(() => removeFakeSound())

describe('ProfilePage', () => {
  it('lists the settings, each with its current value, and where the learner stands', async () => {
    useThemeStore.setState({ preference: 'sage-dusk' })
    renderProfile()

    expect(await screen.findByRole('heading', { level: 1, name: 'My profile' })).toBeVisible()
    expect(
      within(screen.getByRole('region', { name: 'Your learning' })).getByText('Week 1 of 50'),
    ).toBeVisible()

    const rows = settings('Settings').getAllByRole('link')
    expect(rows.map((row) => row.textContent)).toEqual([
      'Language English',
      // No voices in this test's browser, so the row says what the screen is for.
      'Voice settings Choose a voice for each tutor.',
      'Tutor avatar Male tutor',
      'Appearance Sage Dusk',
      // Who they are is the server's to say, and it has not been asked here (as offline): the
      // row still leads to the account screen.
      'Account',
    ])
    expect(rows.map((row) => row.getAttribute('href'))).toEqual([
      paths.profileLanguage,
      paths.profileVoice,
      paths.profileTutor,
      paths.profileAppearance,
      paths.signIn,
    ])
  })

  it('names the account of a learner who is signed in, and leads to where they can sign out', async () => {
    useSessionStore.getState().setUser(learner)
    renderProfile()

    const account = await screen.findByRole('link', { name: /Account/ })
    expect(account).toHaveTextContent('Account asha@example.com')
    // The half of the account screen that says who they are, with the way out.
    expect(account).toHaveAttribute('href', paths.signIn)
  })

  describe('the learner’s picture', () => {
    const card = () => within(screen.getByRole('region', { name: 'Your learning' }))
    const picture = () => card().queryByRole('img', { name: 'Your photo' })
    const camera = () => card().getByRole('button', { name: 'Change your photo' })
    const choose = (file = new File(['x'], 'me.jpg', { type: 'image/jpeg' })) =>
      userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file)

    it('is the picture of their age group until there is one of theirs, with a camera to change it', async () => {
      useSessionStore.getState().setUser(learner)
      renderProfile()
      await screen.findByRole('heading', { level: 1, name: 'My profile' })

      expect(picture()).toBeNull()
      // The stand-in is decoration: the two faces of the age group's coin.
      expect(card().getAllByRole('presentation')).toHaveLength(2)
      expect(camera()).toBeEnabled()
      expect(card().queryByRole('button', { name: 'Remove photo' })).toBeNull()
    })

    it('is their Google account’s picture when they signed in with Google', async () => {
      useSessionStore.getState().setUser({ ...learner, pictureUrl: GOOGLE_PICTURE })
      renderProfile()
      await screen.findByRole('heading', { level: 1, name: 'My profile' })

      expect(picture()).toHaveAttribute('src', GOOGLE_PICTURE)
      // Asked of Google without saying which page wants it.
      expect(picture()).toHaveAttribute('referrerpolicy', 'no-referrer')
      // It is Google's to change, not something kept here to remove.
      expect(card().queryByRole('button', { name: 'Remove photo' })).toBeNull()
    })

    it('falls back to the stand-in when Google’s picture cannot be loaded, or is not an https address', async () => {
      useSessionStore.getState().setUser({ ...learner, pictureUrl: GOOGLE_PICTURE })
      renderProfile()
      await screen.findByRole('heading', { level: 1, name: 'My profile' })

      fireEvent.error(picture() as HTMLElement)
      expect(picture()).toBeNull()
      expect(card().getAllByRole('presentation')).toHaveLength(2)

      useSessionStore.getState().setUser({ ...learner, pictureUrl: 'http://example.com/a.png' })
      expect(picture()).toBeNull()
    })

    it('takes a photo they choose, keeps it in this browser, and shows it before Google’s', async () => {
      useSessionStore.getState().setUser({ ...learner, pictureUrl: GOOGLE_PICTURE })
      renderProfile()
      await screen.findByRole('heading', { level: 1, name: 'My profile' })

      await choose()

      expect(picture()).toHaveAttribute('src', PHOTO)
      expect(vi.mocked(fileToStoredImage).mock.lastCall?.[1]).toEqual({
        maxWidth: 512,
        maxHeight: 512,
      })
      expect(card().getByText('This photo is kept on this device only.')).toBeVisible()
      expect(useProfilePhotoStore.getState().photo).toBe(PHOTO)
      expect(localStorage.getItem('kuhedu-profile-photo')).toContain(PHOTO)

      // Taken away again, Google's picture is back.
      await userEvent.click(card().getByRole('button', { name: 'Remove photo' }))
      expect(picture()).toHaveAttribute('src', GOOGLE_PICTURE)
      expect(card().queryByText('This photo is kept on this device only.')).toBeNull()
      expect(useProfilePhotoStore.getState().photo).toBeNull()
    })

    it('opens the phone’s chooser from the camera button', async () => {
      useSessionStore.getState().setUser(learner)
      renderProfile()
      await screen.findByRole('heading', { level: 1, name: 'My profile' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const opened = vi.spyOn(input, 'click')

      await userEvent.click(camera())

      expect(opened).toHaveBeenCalledTimes(1)
      expect(input).toHaveAttribute('accept', 'image/*')
    })

    it('says why a file was not taken, and keeps the picture there was', async () => {
      useSessionStore.getState().setUser(learner)
      useProfilePhotoStore.setState({ photo: PHOTO })
      renderProfile()
      await screen.findByRole('heading', { level: 1, name: 'My profile' })

      // Named a picture, and not one inside.
      vi.mocked(fileToStoredImage).mockRejectedValueOnce(new ImageUnreadableError())
      await choose(new File(['not a picture'], 'broken.png', { type: 'image/png' }))
      expect(card().getByRole('alert')).toHaveTextContent(
        'That file could not be read as a picture. Choose another one.',
      )
      expect(picture()).toHaveAttribute('src', PHOTO)

      vi.mocked(fileToStoredImage).mockRejectedValueOnce(new ImageTooLargeError())
      await choose()
      expect(card().getByRole('alert')).toHaveTextContent(
        'That picture could not be kept. Try a smaller one.',
      )

      // The next one that works takes the complaint away.
      await choose()
      expect(card().queryByRole('alert')).toBeNull()
    })

    it('does not show something from storage that is not a photo of ours', () => {
      localStorage.setItem(
        'kuhedu-profile-photo',
        JSON.stringify({ state: { photo: 'https://example.com/someone.png' }, version: 0 }),
      )
      void useProfilePhotoStore.persist.rehydrate()
      expect(useProfilePhotoStore.getState().photo).toBeNull()

      localStorage.setItem(
        'kuhedu-profile-photo',
        JSON.stringify({ state: { photo: PHOTO }, version: 0 }),
      )
      void useProfilePhotoStore.persist.rehydrate()
      expect(useProfilePhotoStore.getState().photo).toBe(PHOTO)
    })
  })

  it('names the voice lessons are heard in, once the server’s voices are known', async () => {
    installFakeSound()
    useVoiceStore.setState({ voices: { en: { male: 'bf_emma' } } })
    renderProfile()

    await screen.findByRole('heading', { level: 1, name: 'My profile' })
    expect(settings('Settings').getByRole('link', { name: /Voice settings/ })).toHaveTextContent(
      // The male tutor is theirs, and they gave him this voice.
      'Voice settings Emma',
    )
  })

  it('opens a setting on its own screen, with the way back', async () => {
    const router = renderProfile()

    await screen.findByRole('heading', { level: 1, name: 'My profile' })
    await userEvent.click(settings('Settings').getByRole('link', { name: /Appearance/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Appearance' })).toBeVisible()
    expect(screen.getByRole('radio', { name: /Auto/ })).toBeChecked()

    await userEvent.click(screen.getByRole('link', { name: 'Back to your profile' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'My profile' })).toBeVisible()
    expect(router.state.location.pathname).toBe(paths.profile)
  })
})

describe('ProfileLanguagePage', () => {
  it('shows the language chosen during onboarding as the current one', async () => {
    useLanguageStore.setState({ language: 'hi' })
    renderProfile(paths.profileLanguage)

    expect(await screen.findByRole('heading', { level: 1, name: 'भाषा' })).toBeVisible()
    expect(languages('भाषा').getByRole('radio', { name: 'हिन्दी (Hindi)' })).toBeChecked()
    expect(languages('भाषा').getByRole('radio', { name: 'বাংলা (Bengali)' })).not.toBeChecked()
  })

  it('saves another language on the tap and shows the screen in it at once', async () => {
    useLanguageStore.setState({ language: 'hi' })
    renderProfile(paths.profileLanguage)

    await userEvent.click(await screen.findByRole('radio', { name: 'বাংলা (Bengali)' }))

    expect(useLanguageStore.getState().language).toBe('bn')
    expect(screen.getByRole('heading', { level: 1, name: 'ভাষা' })).toBeVisible()
    expect(languages('ভাষা').getByRole('radio', { name: 'বাংলা (Bengali)' })).toBeChecked()
    expect(document.documentElement).toHaveAttribute('lang', 'bn')
  })

  it('ticks English for a learner who never chose, since that is what they see', async () => {
    renderProfile(paths.profileLanguage)

    expect(await screen.findByRole('radio', { name: 'English (English only)' })).toBeChecked()
    expect(useLanguageStore.getState().language).toBeNull()
  })

  it('offers the languages the admin saved, with none ticked if the learner’s was removed', async () => {
    useLanguageStore.setState({ language: 'hi' })
    settingsRepository.write(LANGUAGES_CONFIG_NAME, {
      defaultCode: 'ta',
      languages: [
        { code: 'ta', nativeName: 'தமிழ்', caption: 'Tamil', flagUrl: null },
        { code: 'mr', nativeName: 'मराठी', caption: 'Marathi', flagUrl: null },
      ],
    })
    renderProfile(paths.profileLanguage)

    expect(await screen.findByRole('radio', { name: 'தமிழ் (Tamil)' })).toBeInTheDocument()
    const radios = languages('भाषा').getAllByRole('radio')
    expect(radios).toHaveLength(2)
    for (const radio of radios) expect(radio).not.toBeChecked()
  })
})
