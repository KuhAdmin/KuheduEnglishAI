import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import {
  expect,
  LEARNER,
  lessonServer,
  signedInAs,
  signInAsAdmin,
  stubSpeech,
  test,
  withoutLearnerServer,
  withoutLessonServer,
  type KeptPiece,
} from './helpers'

const heading = (page: Page) => page.getByRole('heading', { level: 1 })

/** A conversation for a week the app has nothing built in for. */
const atTheBusStop = {
  videoUrl: null,
  lines: [
    { speaker: 'Asha', text: 'Excuse me, where is the bus stop?', translations: {} },
    { speaker: 'Ravi', text: 'It is near the bank.', translations: {} },
  ],
}

test('a week’s content kept on the server opens for a learner', async ({ page }) => {
  await stubSpeech(page)
  await lessonServer(page.context(), [
    { week: 2, kind: 'dialogue', value: atTheBusStop, version: 1 },
  ])

  // Week 2 has nothing built in: what is shown is the server's.
  await page.goto('/lessons/weeks/2/days/1')

  await expect(heading(page)).toHaveText('Watch and listen')
  await expect(page.getByText('Excuse me, where is the bus stop?')).toBeVisible()
  await expect(page.getByText('It is near the bank.')).toBeVisible()

  // And the app keeps it: without the server the day still opens.
  await withoutLessonServer(page.context())
  await page.reload()
  await expect(page.getByText('Excuse me, where is the bus stop?')).toBeVisible()
})

test('what an admin saves is on the server, for a learner on another browser', async ({
  baseURL,
  browser,
  page: adminTab,
}) => {
  const kept: KeptPiece[] = []
  await signInAsAdmin(adminTab)
  await lessonServer(adminTab.context(), kept)
  await adminTab.goto('/admin/lessons')

  await adminTab.getByText('Day 2 · Learn useful words').click()
  await adminTab.getByRole('combobox', { name: 'Week' }).selectOption('2')
  await adminTab.getByRole('button', { name: 'Add word' }).click()
  await adminTab.getByRole('textbox', { name: 'Word or phrase (Word 1)' }).fill('city')
  await adminTab.getByRole('button', { name: 'Save changes' }).click()
  await expect(adminTab.getByRole('status')).toContainText('Saved')
  expect(kept).toMatchObject([{ week: 2, kind: 'vocabulary', version: 1 }])

  // Another browser altogether: nothing of the admin's is in it.
  const other = await browser.newContext({ baseURL })
  await signedInAs(other, LEARNER)
  await withoutLearnerServer(other)
  await stubSpeech(other)
  await lessonServer(other, kept)
  const learner = await other.newPage()
  await learner.goto('/lessons/weeks/2/days/2')
  await expect(heading(learner)).toHaveText('Learn useful words')
  await expect(learner.getByRole('button', { name: /city/ })).toBeVisible()

  // Someone else saves the same words while this editor is open: theirs is not written over.
  const theirs = kept.find((piece) => piece.kind === 'vocabulary')
  if (theirs) theirs.version = 7
  await adminTab.getByRole('textbox', { name: 'Word or phrase (Word 1)' }).fill('town')
  await adminTab.getByRole('button', { name: 'Save changes' }).click()
  await expect(adminTab.getByRole('status')).toContainText('someone else changed this')
  expect(JSON.stringify(theirs?.value)).toContain('city')
  // What was typed is still there, to be saved again once their version has been looked at.
  await expect(adminTab.getByRole('textbox', { name: 'Word or phrase (Word 1)' })).toHaveValue(
    'town',
  )
  await other.close()
})

test('a save the server does not take says so, and loses nothing typed', async ({
  page: adminTab,
}) => {
  await signInAsAdmin(adminTab)
  await adminTab.goto('/admin/lessons')
  await adminTab.getByText('Day 2 · Learn useful words').click()
  await adminTab.getByRole('combobox', { name: 'Week' }).selectOption('2')
  await adminTab.getByRole('button', { name: 'Add word' }).click()
  await adminTab.getByRole('textbox', { name: 'Word or phrase (Word 1)' }).fill('city')

  // The connection goes.
  await withoutLessonServer(adminTab.context())
  await adminTab.getByRole('button', { name: 'Save changes' }).click()

  await expect(adminTab.getByRole('status')).toContainText('Could not save')
  await expect(adminTab.getByRole('textbox', { name: 'Word or phrase (Word 1)' })).toHaveValue(
    'city',
  )
  await expect(adminTab.getByRole('button', { name: 'Save changes' })).toBeEnabled()
})

/** What the days' screens are checked against, of a week as it is written in `server/content`. */
type WrittenWeek = {
  week: number
  content: Record<string, unknown> & {
    dialogue: { lines: { text: string }[] }
    vocabulary: { words: { word: string }[] }
    roleplay: { partner: string; asMan?: string }
    challenge: { title: { text: string } }
    scenarios: { scenarios: { name: { text: string } }[] }
  }
}

// The weeks written as files are what is put into the database: each must open, day by day.
for (const number of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) {
  test(`Week ${number}, as it is written to be imported, opens on all seven days`, async ({
    page,
  }) => {
    const written = JSON.parse(
      readFileSync(`server/content/week-${String(number).padStart(2, '0')}.json`, 'utf8'),
    ) as WrittenWeek
    const { week, content } = written
    await stubSpeech(page)
    await lessonServer(
      page.context(),
      Object.entries(content).map(([kind, value]) => ({ week, kind, value, version: 1 })),
    )
    const day = (which: number) => page.goto(`/lessons/weeks/${week}/days/${which}`)

    await day(1)
    await expect(heading(page)).toHaveText('Watch and listen')
    await expect(page.getByText(content.dialogue.lines[0]?.text ?? '')).toBeVisible()

    await day(2)
    await expect(heading(page)).toHaveText('Learn useful words')
    for (const { word } of content.vocabulary.words) {
      await expect(page.getByRole('button', { name: word }).first()).toBeVisible()
    }

    await day(3)
    await expect(heading(page)).toHaveText('Translate and speak')

    await day(4)
    await expect(heading(page)).toHaveText(
      `Talk to ${content.roleplay.asMan ?? content.roleplay.partner}`,
    )

    await day(5)
    await expect(heading(page)).toHaveText(content.challenge.title.text)

    await day(6)
    await expect(heading(page)).toHaveText('Weekly review')

    await day(7)
    await expect(heading(page)).toHaveText('Real-world challenge')
    for (const { name } of content.scenarios.scenarios) {
      await expect(page.getByText(name.text, { exact: true })).toBeVisible()
    }
  })
}
