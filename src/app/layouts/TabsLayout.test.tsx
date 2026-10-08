import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppLanguageProvider, useLanguageStore } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { TabsLayout } from './TabsLayout'

function renderTabs(initialPath: string = paths.home) {
  const router = createMemoryRouter(
    [
      {
        Component: TabsLayout,
        children: [
          { path: paths.home, element: <h1>Journey</h1> },
          { path: paths.homeSection, element: <h1>A section</h1> },
          { path: paths.lessons, element: <h1>Lessons</h1> },
          { path: paths.progress, element: <h1>Progress screen</h1> },
          { path: paths.profile, element: <h1>Profile screen</h1> },
        ],
      },
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

const nav = () => screen.getByRole('navigation', { name: 'Main navigation' })
const tab = (name: string) => within(nav()).getByRole('link', { name })

beforeEach(() => {
  localStorage.clear()
  useLanguageStore.setState({ language: null })
})

describe('TabsLayout', () => {
  it('offers the four main screens, with the one on show marked', () => {
    renderTabs()

    expect(within(nav()).getAllByRole('link')).toHaveLength(4)
    expect(tab('Home')).toHaveAttribute('href', paths.home)
    expect(tab('Learn')).toHaveAttribute('href', paths.lessons)
    expect(tab('Progress')).toHaveAttribute('href', paths.progress)
    expect(tab('Profile')).toHaveAttribute('href', paths.profile)

    expect(tab('Home')).toHaveAttribute('aria-current', 'page')
    expect(tab('Learn')).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading'))
  })

  it('moves between the screens', async () => {
    const router = renderTabs()

    await userEvent.click(tab('Progress'))
    expect(await screen.findByRole('heading', { name: 'Progress screen' })).toBeVisible()
    expect(router.state.location.pathname).toBe(paths.progress)
    expect(tab('Progress')).toHaveAttribute('aria-current', 'page')
    expect(tab('Home')).not.toHaveAttribute('aria-current')

    await userEvent.click(tab('Profile'))
    expect(await screen.findByRole('heading', { name: 'Profile screen' })).toBeVisible()
  })

  it('keeps Home marked on a screen opened from it', () => {
    renderTabs('/home/sections/4')
    expect(screen.getByRole('heading', { name: 'A section' })).toBeVisible()
    expect(tab('Home')).toHaveAttribute('aria-current', 'page')
  })

  it('is in the learner’s language', () => {
    useLanguageStore.setState({ language: 'bn' })
    renderTabs()
    const bengali = screen.getByRole('navigation', { name: 'প্রধান নেভিগেশন' })
    expect(within(bengali).getByRole('link', { name: 'শিখুন' })).toBeVisible()
    expect(within(bengali).getByRole('link', { name: 'অগ্রগতি' })).toBeVisible()
  })
})
