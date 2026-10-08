import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createMemoryRouter,
  isRouteErrorResponse,
  RouterProvider,
  useRouteError,
} from 'react-router'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { settingsRepository } from '@/shared/lib/appConfig/settingsRepository'
import { CURRICULUM_CONFIG_NAME } from '@/shared/lib/curriculum/curriculumOverrides'
import { WEEK_PICTURES_CONFIG_NAME } from '@/shared/lib/curriculum/weekPictures'
import { getCurriculum } from '@/shared/lib/curriculum/useCurriculum'
import { AppLanguageProvider, useLanguageStore } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { SectionCard } from '../components/SectionCard'
import { homeRoutes, weekRoutes } from '../index'

function NotFound() {
  const error = useRouteError()
  return <h1>{isRouteErrorResponse(error) && error.status === 404 ? 'Not found' : 'Error'}</h1>
}

function renderHome(initialPath: string = paths.home) {
  const router = createMemoryRouter(
    [{ ErrorBoundary: NotFound, children: [...homeRoutes, ...weekRoutes] }],
    { initialEntries: [initialPath] },
  )
  render(
    <AppLanguageProvider>
      <RouterProvider router={router} />
    </AppLanguageProvider>,
  )
  return router
}

const sections = () =>
  within(screen.getByRole('list', { name: 'Sections' })).getAllByRole('listitem')

beforeAll(async () => {
  // The routes are lazy; load their chunks up front so no test waits on the transform.
  await Promise.all([import('./HomePage'), import('./SectionPage'), import('./WeekPage')])
})

beforeEach(() => {
  localStorage.clear()
  useLanguageStore.setState({ language: null })
})

describe('HomePage', () => {
  it('lays out the 50-week journey as ten sections', async () => {
    renderHome()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your 50-week journey' }),
    ).toBeVisible()
    expect(screen.getByText('Real-life communication, step by step.')).toBeVisible()

    const items = sections()
    expect(items).toHaveLength(10)
    expect(within(items[0] as HTMLElement).getByText('Start Communicating')).toBeVisible()
    expect(within(items[0] as HTMLElement).getByText('Weeks 1–5')).toBeVisible()
    expect(within(items[3] as HTMLElement).getByText('Handle Everyday Interactions')).toBeVisible()
    expect(within(items[3] as HTMLElement).getByText('Weeks 16–20')).toBeVisible()
    expect(within(items[9] as HTMLElement).getByText('Communicate Independently')).toBeVisible()
    expect(within(items[9] as HTMLElement).getByText('Weeks 46–50')).toBeVisible()
  })

  it('marks Section 1 as the current one, in words, and nothing as completed', async () => {
    renderHome()
    await screen.findByRole('heading', { level: 1 })

    const current = screen.getByRole('link', { current: 'step' })
    expect(current).toHaveTextContent('Start Communicating')
    expect(within(current).getByText('Current section')).toBeVisible()
    expect(screen.getAllByText('Current section')).toHaveLength(1)
    expect(screen.queryByText('Completed')).not.toBeInTheDocument()
  })

  it('opens any section, none of them locked', async () => {
    const router = renderHome()
    await screen.findByRole('heading', { level: 1 })

    const links = within(screen.getByRole('list', { name: 'Sections' })).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      Array.from({ length: 10 }, (_, index) => `/home/sections/${index + 1}`),
    )

    await userEvent.click(screen.getByRole('link', { name: /Sustain Conversations/ }))
    expect(router.state.location.pathname).toBe('/home/sections/5')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sustain Conversations' }),
    ).toBeVisible()
  })

  it('shows an admin’s wording for the course, as soon as it is saved', async () => {
    settingsRepository.write(CURRICULUM_CONFIG_NAME, { en: { 'section.1': 'Say Hello' } })
    renderHome()
    await screen.findByRole('heading', { level: 1 })

    expect(within(sections()[0] as HTMLElement).getByText('Say Hello')).toBeVisible()
    expect(within(sections()[1] as HTMLElement).getByText('My Everyday World')).toBeVisible()

    act(() => settingsRepository.remove(CURRICULUM_CONFIG_NAME))
    expect(within(sections()[0] as HTMLElement).getByText('Start Communicating')).toBeVisible()
  })

  it('is shown in the learner’s language, digits included', async () => {
    useLanguageStore.setState({ language: 'bn' })
    renderHome()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'আপনার ৫০ সপ্তাহের যাত্রা' }),
    ).toBeVisible()
    const first = screen.getByRole('link', { current: 'step' })
    expect(first).toHaveTextContent('কথা বলা শুরু করি')
    expect(within(first).getByText('সপ্তাহ ১–৫')).toBeVisible()
    expect(within(first).getByText('বর্তমান বিভাগ')).toBeVisible()
  })
})

describe('SectionPage', () => {
  it('shows a section’s five weeks: goal, situation and challenge', async () => {
    renderHome('/home/sections/4')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Handle Everyday Interactions' }),
    ).toBeVisible()
    expect(screen.getByText('Section 4')).toBeVisible()
    expect(screen.getByText('Weeks 16–20')).toBeVisible()

    const weeks = within(screen.getByRole('list', { name: 'Weeks' })).getAllByRole('article')
    expect(weeks).toHaveLength(5)
    const last = within(weeks[4] as HTMLElement)
    expect(last.getByText('Week 20')).toBeVisible()
    expect(
      last.getByRole('heading', { level: 2, name: 'I can handle everyday transactions.' }),
    ).toBeVisible()
    expect(last.getByText('Situation')).toBeVisible()
    expect(last.getByText('Ordering at a café or food counter')).toBeVisible()
    expect(last.getByText('Your challenge')).toBeVisible()
    expect(last.getByText(/^Place an order, ask about options/)).toBeVisible()
    // Nobody is in this section yet.
    expect(screen.queryByText('This week')).not.toBeInTheDocument()
  })

  it('marks the week the learner is on, and leads back to the journey', async () => {
    const router = renderHome('/home/sections/1')
    await screen.findByRole('heading', { level: 1, name: 'Start Communicating' })

    const current = screen.getByRole('article', { current: 'step' })
    expect(within(current).getByText('Week 1')).toBeVisible()
    expect(within(current).getByText('This week')).toBeVisible()
    expect(screen.getAllByText('This week')).toHaveLength(1)

    await userEvent.click(screen.getByRole('link', { name: 'Back to your journey' }))
    expect(router.state.location.pathname).toBe(paths.home)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your 50-week journey' }),
    ).toBeVisible()
  })

  it('opens a week’s overview from its card', async () => {
    const router = renderHome('/home/sections/4')
    await screen.findByRole('heading', { level: 1, name: 'Handle Everyday Interactions' })

    const links = within(screen.getByRole('list', { name: 'Weeks' })).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      [16, 17, 18, 19, 20].map((week) => `/home/weeks/${week}`),
    )

    await userEvent.click(screen.getByRole('link', { name: 'I can handle everyday transactions.' }))
    expect(router.state.location.pathname).toBe('/home/weeks/20')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Real-life situation' }),
    ).toBeVisible()
  })

  it.each(['0', '11', 'abc', '2.5'])(
    'treats section "%s" as a page that does not exist',
    async (id) => {
      renderHome(`/home/sections/${id}`)
      expect(await screen.findByRole('heading', { name: 'Not found' })).toBeVisible()
    },
  )

  it('is shown in Hindi with Hindi goals', async () => {
    useLanguageStore.setState({ language: 'hi' })
    renderHome('/home/sections/1')

    expect(await screen.findByRole('heading', { level: 1, name: 'बातचीत की शुरुआत' })).toBeVisible()
    expect(screen.getByText('हफ़्ते 1–5')).toBeVisible()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'मुझे नमस्ते कहना और अपना परिचय देना आता है।',
      }),
    ).toBeVisible()
  })
})

describe('WeekPage', () => {
  const overview = () => screen.findByRole('heading', { level: 1, name: 'Real-life situation' })
  const outcomes = () =>
    within(screen.getByRole('list', { name: 'What you will be able to do' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent)

  it('shows the week’s place in the course, its situation and what the learner will manage', async () => {
    renderHome('/home/weeks/20')
    await overview()

    expect(screen.getByText('Week 20 of 50')).toBeVisible()
    expect(screen.getByRole('progressbar', { name: 'Your place in the course' })).toHaveAttribute(
      'aria-valuenow',
      '40',
    )
    // The situation is the one on the week's card.
    expect(screen.getByText('Ordering at a café or food counter')).toBeVisible()
    expect(outcomes()).toEqual([
      'Order food and drink',
      'Ask about the menu and price',
      'Make special requests',
      'Respond to a follow-up question',
      'Complete a natural café conversation',
    ])
    expect(within(screen.getByRole('contentinfo')).getByRole('link')).toHaveAccessibleName(
      'Start Day 1',
    )
    expect(screen.getByRole('link', { name: 'Start Day 1' })).toHaveAttribute(
      'href',
      '/lessons/weeks/20/days/1',
    )
  })

  it('leads back to the week’s section and on to the next week', async () => {
    const router = renderHome('/home/weeks/20')
    await overview()

    expect(screen.getByRole('link', { name: 'Back to the weeks' })).toHaveAttribute(
      'href',
      '/home/sections/4',
    )
    await userEvent.click(screen.getByRole('link', { name: 'Next week' }))
    expect(router.state.location.pathname).toBe('/home/weeks/21')
    expect(await screen.findByText('Week 21 of 50')).toBeVisible()
    expect(
      screen.getByText('Interviewing someone about their interests or experiences'),
    ).toBeVisible()
    // Week 21 opens Section 5.
    expect(screen.getByRole('link', { name: 'Back to the weeks' })).toHaveAttribute(
      'href',
      '/home/sections/5',
    )
  })

  it('has no next week after the last one', async () => {
    renderHome('/home/weeks/50')
    await overview()

    expect(screen.getByText('Week 50 of 50')).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Next week' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled()
  })

  it('shows a drawing until an admin uploads the week’s picture, and if that picture fails', async () => {
    renderHome('/home/weeks/20')
    await overview()
    expect(document.querySelector('main img')).toBeNull()
    expect(document.querySelector('main svg[viewBox="0 0 320 180"]')).not.toBeNull()

    act(() => settingsRepository.write(WEEK_PICTURES_CONFIG_NAME, { 20: '/weeks/cafe.webp' }))
    const picture = document.querySelector('main img') as HTMLImageElement
    expect(picture).toHaveAttribute('src', '/weeks/cafe.webp')
    // Decorative: the situation is written out above it.
    expect(picture).toHaveAttribute('alt', '')

    fireEvent.error(picture)
    expect(document.querySelector('main img')).toBeNull()
    expect(document.querySelector('main svg[viewBox="0 0 320 180"]')).not.toBeNull()
  })

  it('follows an admin’s wording of the situation and the outcomes', async () => {
    settingsRepository.write(CURRICULUM_CONFIG_NAME, {
      en: { 'week.20.context': 'At a café', 'week.20.outcome.1': 'Order a coffee' },
    })
    renderHome('/home/weeks/20')
    await overview()

    expect(screen.getByText('At a café')).toBeVisible()
    expect(outcomes()[0]).toBe('Order a coffee')
    expect(outcomes()[1]).toBe('Ask about the menu and price')
  })

  it('is shown in Bengali, digits included', async () => {
    useLanguageStore.setState({ language: 'bn' })
    renderHome('/home/weeks/20')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'বাস্তব জীবনের পরিস্থিতি' }),
    ).toBeVisible()
    expect(screen.getByText('৫০ সপ্তাহের মধ্যে সপ্তাহ ২০')).toBeVisible()
    expect(screen.getByRole('link', { name: 'দিন ১ শুরু করুন' })).toBeVisible()
    expect(
      within(screen.getByRole('list', { name: 'আপনি যা করতে পারবেন' })).getByText(
        'খাবার ও পানীয় অর্ডার করা',
      ),
    ).toBeVisible()
  })

  it.each(['0', '51', 'abc', '2.5'])(
    'treats week "%s" as a page that does not exist',
    async (id) => {
      renderHome(`/home/weeks/${id}`)
      expect(await screen.findByRole('heading', { name: 'Not found' })).toBeVisible()
    },
  )
})

describe('SectionCard', () => {
  const [first, second] = getCurriculum('en')
  if (!first || !second) throw new Error('the curriculum has sections')

  it('says a finished section is completed, with a tick', () => {
    const router = createMemoryRouter(
      [{ path: '/', element: <SectionCard section={first} status="completed" /> }],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)

    const link = screen.getByRole('link', { name: /Start Communicating/ })
    expect(within(link).getByText('Completed')).toBeVisible()
    expect(link).not.toHaveAttribute('aria-current')
    expect(within(link).queryByText('Current section')).not.toBeInTheDocument()
  })

  it('shows a section still ahead plainly', () => {
    const router = createMemoryRouter(
      [{ path: '/', element: <SectionCard section={second} status="upcoming" /> }],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)

    const link = screen.getByRole('link', { name: /My Everyday World/ })
    expect(link).toHaveAttribute('href', '/home/sections/2')
    expect(within(link).getByText('Weeks 6–10')).toBeVisible()
    expect(within(link).queryByText(/Completed|Current section/)).not.toBeInTheDocument()
  })
})
