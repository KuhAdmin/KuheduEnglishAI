import { expect, test, type Page } from '@playwright/test'
import {
  denyMicrophone,
  expectNoHorizontalScroll,
  PIXEL_PNG,
  seedLanguage,
  seedSettings,
  signInAsAdmin,
  stubSpeech,
} from './helpers'

const heading = (page: Page) => page.getByRole('heading', { level: 1 })
const conversation = (page: Page) =>
  page.getByRole('list', { name: 'Conversation' }).getByRole('listitem')
const next = (page: Page) => page.getByRole('button', { name: 'Next' })

test('Week 1, Day 1: listen to the conversation, then Next opens', async ({ page }) => {
  await stubSpeech(page)
  await page.goto('/home/weeks/1')
  await page.getByRole('link', { name: 'Start Day 1' }).click()

  await expect(page).toHaveURL(/\/lessons\/weeks\/1\/days\/1$/)
  await expect(heading(page)).toHaveText('Watch and listen')
  await expect(page.getByText('See how the conversation flows.')).toBeVisible()
  await expect(page.getByText('1/7')).toBeVisible()
  await expect(conversation(page)).toHaveCount(9)
  await expect(conversation(page).first()).toContainText('Asha')
  await expect(conversation(page).first()).toContainText('Hello! Good morning.')
  // A screen of its own, like the week's overview.
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0)
  await expectNoHorizontalScroll(page)

  // Locked until heard, and it says why.
  await expect(next(page)).toBeDisabled()
  await expect(next(page)).toBeInViewport({ ratio: 1 })
  await expect(page.getByText('Listen to the conversation once to continue.')).toBeVisible()

  const play = page.getByRole('button', { name: 'Play the conversation' })
  const playBox = await play.boundingBox()
  expect(Math.round(playBox?.height ?? 0)).toBeGreaterThanOrEqual(48)
  for (const replay of await page.getByRole('button', { name: /^Listen to this line/ }).all()) {
    const box = await replay.boundingBox()
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44)
    expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(44)
  }

  // Hearing one line again is not hearing the conversation.
  await page.getByRole('button', { name: 'Listen to this line: Hello! Good morning.' }).click()
  await expect(next(page)).toBeDisabled()

  await play.click()
  await expect(next(page)).toBeEnabled()
  await expect(page.getByText('Listen to the conversation once to continue.')).toHaveCount(0)

  // Finishing the day goes back to the week, which now offers the next one.
  await next(page).click()
  await expect(page).toHaveURL(/\/home\/weeks\/1$/)
  await expect(page.getByRole('link', { name: 'Start Day 2' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('link', { name: 'Start Day 2' })).toBeVisible()

  // Coming back to Day 1, the conversation already heard is not locked again.
  await page.goto('/lessons/weeks/1/days/1')
  await expect(next(page)).toBeEnabled()
})

const words = (page: Page) => page.getByRole('list', { name: 'Words' }).getByRole('button')
const word = (page: Page, name: string) =>
  page.getByRole('list', { name: 'Words' }).getByRole('button', { name: new RegExp(`^${name}`) })
const week1Words = ['hello', 'good morning', 'name', 'thank you', 'nice to meet you', 'goodbye']

/** Tap each word and let it be said to the end: a word cut short by the next tap is not heard. */
async function hear(page: Page, names: readonly string[]) {
  for (const name of names) {
    await word(page, name).click()
    await expect(word(page, name)).toHaveAccessibleName(`${name} Heard`)
  }
}

test('Week 1, Day 2: hear every word, then Next opens and the week moves on', async ({ page }) => {
  await stubSpeech(page)
  await page.goto('/lessons/weeks/1/days/2')

  await expect(heading(page)).toHaveText('Learn useful words')
  await expect(page.getByText('Tap each word to hear and repeat.')).toBeVisible()
  await expect(page.getByText('2/7')).toBeVisible()
  await expect(words(page)).toHaveCount(6)
  await expect(word(page, 'hello')).toContainText('/həˈləʊ/')
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0)
  await expectNoHorizontalScroll(page)

  // The practice panel and Next stay in reach while the words scroll.
  await expect(
    page.getByRole('heading', { level: 2, name: 'Practice pronunciation' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tap to speak' })).toBeInViewport({ ratio: 1 })
  await expect(next(page)).toBeInViewport({ ratio: 1 })
  await expect(next(page)).toBeDisabled()
  await expect(page.getByText('Listen to every word once to continue.')).toBeVisible()

  for (const card of await words(page).all()) {
    const box = await card.boundingBox()
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(48)
  }

  // Tapping a word says it, ticks it off and makes it the one to practise.
  await word(page, 'goodbye').click()
  await expect(word(page, 'goodbye')).toHaveAttribute('aria-pressed', 'true')
  await expect(word(page, 'goodbye')).toHaveAccessibleName('goodbye Heard')
  await expect(page.locator('section').getByText('goodbye')).toBeVisible()
  await expect(next(page)).toBeDisabled()

  await hear(page, week1Words.slice(0, 5))
  await expect(next(page)).toBeEnabled()
  await expect(page.getByText('Listen to every word once to continue.')).toHaveCount(0)

  await next(page).click()
  await expect(page).toHaveURL(/\/home\/weeks\/1$/)
  // Day 1 was not done in this browser, so the week still opens that first.
  await expect(page.getByRole('link', { name: 'Start Day 1' })).toBeVisible()

  // Finished once, the day is not locked again.
  await page.goto('/lessons/weeks/1/days/2')
  await expect(next(page)).toBeEnabled()
})

// Day 3 as a learner who translates from Bengali sees it.
const bn = {
  title: 'অনুবাদ করুন ও বলুন',
  sentence: 'বাক্য',
  field: 'আপনার অনুবাদ',
  check: 'মিলিয়ে দেখুন',
  showAnswer: 'উত্তর দেখুন',
  right: 'ঠিক হয়েছে। খুব ভালো!',
  compare: 'আপনার বাক্যটি এর সঙ্গে মিলিয়ে দেখুন।',
  speak: 'বলতে ট্যাপ করুন',
  next: 'পরবর্তী',
}

test('Week 1, Day 3: a Bengali learner translates each sentence, then the day is done', async ({
  page,
}) => {
  await stubSpeech(page)
  await seedLanguage(page, 'bn')
  await page.goto('/lessons/weeks/1/days/3')

  await expect(heading(page)).toHaveText(bn.title)
  await expect(page.getByText('৩/৭')).toBeVisible()
  await expect(page.getByText('৫টি বাক্যের মধ্যে বাক্য ১')).toBeVisible()
  const sentence = page.getByRole('region', { name: bn.sentence })
  await expect(sentence).toContainText('হ্যালো! সুপ্রভাত।')
  // The browser under test has no Bengali voice, so nothing offers to read the sentence out.
  await expect(sentence.getByRole('button')).toHaveCount(0)
  await expect(page.getByText('দুপুরের আগে “Good morning” বলুন।')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0)
  await expectNoHorizontalScroll(page)

  const field = page.getByRole('textbox', { name: bn.field })
  const bnNext = page.getByRole('button', { name: bn.next })
  await expect(bnNext).toBeDisabled()
  await expect(bnNext).toBeInViewport({ ratio: 1 })
  await expect(page.getByText('Hello! Good morning.')).toHaveCount(0)
  // Smaller text in a field makes iOS zoom the page when it is tapped.
  expect(
    await field.evaluate((input) => parseFloat(getComputedStyle(input).fontSize)),
  ).toBeGreaterThanOrEqual(16)
  for (const name of [bn.showAnswer, bn.speak]) {
    const box = await page.getByRole('button', { name }).boundingBox()
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44)
  }

  // A sentence the app does not know is set beside the answer, and the learner may go on.
  await field.fill('Hello morning')
  await page.getByRole('button', { name: bn.check }).click()
  await expect(page.getByText(bn.compare)).toBeVisible()
  await expect(page.getByText('Hello! Good morning.')).toBeVisible()
  await expect(bnNext).toBeEnabled()

  // The right words get the tick, however they are capitalised or punctuated.
  await field.fill('hello, good morning')
  await field.press('Enter')
  await expect(page.getByText(bn.right)).toBeVisible()
  await expectNoHorizontalScroll(page)
  await bnNext.click()

  // The next sentence starts afresh.
  await expect(page.getByText('৫টি বাক্যের মধ্যে বাক্য ২')).toBeVisible()
  await expect(sentence).toContainText('আপনি কেমন আছেন?')
  await expect(field).toHaveValue('')
  await expect(page.getByText('How are you?')).toHaveCount(0)
  await expect(bnNext).toBeDisabled()

  await field.fill("i'm fine thank you")
  await field.press('Enter')
  await expect(page.getByText(bn.compare)).toBeVisible()
  await bnNext.click()
  await field.fill("i'm fine thank you")
  await field.press('Enter')
  await expect(page.getByText(bn.right)).toBeVisible()
  await bnNext.click()

  for (const number of ['৪', '৫']) {
    await expect(page.getByText(`৫টি বাক্যের মধ্যে বাক্য ${number}`)).toBeVisible()
    await page.getByRole('button', { name: bn.showAnswer }).click()
    await bnNext.click()
  }
  await expect(page).toHaveURL(/\/home\/weeks\/1$/)

  // Finished once, the day is not locked again.
  await page.goto('/lessons/weeks/1/days/3')
  await expect(bnNext).toBeEnabled()
})

test('Week 1, Day 3: a learner with no language to translate from listens and says', async ({
  page,
}) => {
  await stubSpeech(page)
  await page.goto('/lessons/weeks/1/days/3')

  await expect(heading(page)).toHaveText('Translate and speak')
  await expect(page.getByText('Listen to the sentence, then say it.')).toBeVisible()
  await expect(page.getByText('Sentence 1 of 5')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Sentence' })).toContainText('Hello! Good morning.')
  await expect(page.getByRole('textbox')).toHaveCount(0)
  await expect(page.getByText('Say “Good morning” before noon.')).toBeVisible()
  await expect(next(page)).toBeEnabled()

  const listen = page.getByRole('button', { name: 'Listen to the sentence' })
  const box = await listen.boundingBox()
  expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44)
  expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(44)
  await listen.click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expectNoHorizontalScroll(page)
})

const talk = (page: Page) => page.getByRole('list', { name: 'Conversation' }).getByRole('listitem')

test('Week 1, Day 4: a role-play taken turn by turn, with a hint, to its end', async ({ page }) => {
  await stubSpeech(page)
  await page.goto('/lessons/weeks/1/days/4')

  // Nothing is called AI: the partner's lines are written.
  await expect(heading(page)).toHaveText('Talk to Ravi')
  await expect(page.getByText('Practise a conversation. Speak when it is your turn.')).toBeVisible()
  await expect(page.getByText('4/7')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0)
  // The microphone is explained before anything asks for it, and nothing starts by itself.
  await expect(
    page.getByText('We will ask to use your microphone. Your recording is not saved.'),
  ).toBeVisible()
  const start = page.getByRole('button', { name: 'Start the conversation' })
  await expect(start).toBeInViewport({ ratio: 1 })
  await expect(page.getByRole('list', { name: 'Conversation' })).toHaveCount(0)
  await expectNoHorizontalScroll(page)

  await start.click()
  await expect(talk(page)).toHaveText(['RaviHello! Good morning.'])
  await expect(page.getByText('Your turn. Tap to speak.')).toBeVisible()
  await expect(next(page)).toHaveCount(0)

  // Everything the learner needs is in reach of the thumb, and big enough to hit.
  const mic = page.getByRole('button', { name: 'Tap to speak' })
  await expect(mic).toBeInViewport({ ratio: 1 })
  expect(Math.round((await mic.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(48)
  for (const name of ['Hint', 'End chat', 'Skip this turn']) {
    const control = page.getByRole('button', { name, exact: true })
    await expect(control).toBeInViewport({ ratio: 1 })
    const box = await control.boundingBox()
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44)
    expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(44)
  }

  // The hint gives a reply to say; the turn itself does not move.
  await page.getByRole('button', { name: 'Hint', exact: true }).click()
  await expect(talk(page)).toHaveText(['RaviHello! Good morning.', 'What to sayGood morning!'])
  await expect(page.getByRole('button', { name: 'Hint', exact: true })).toBeDisabled()

  // Skipping goes on without the microphone, and shows what could have been said.
  await page.getByRole('button', { name: 'Skip this turn' }).click()
  await expect(talk(page)).toHaveText([
    'RaviHello! Good morning.',
    'You could sayGood morning!',
    'RaviHow are you?',
  ])
  await expect(page.getByRole('button', { name: 'Hint', exact: true })).toBeEnabled()

  // Ending asks first; staying changes nothing.
  await page.getByRole('button', { name: 'End chat', exact: true }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'End the conversation?' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'End chat' })).toBeInViewport({ ratio: 1 })
  await page.getByRole('button', { name: 'Keep talking' }).click()
  await expect(talk(page)).toHaveCount(3)

  for (let left = 4; left > 0; left -= 1) {
    await page.getByRole('button', { name: 'Skip this turn' }).click()
  }
  await expect(page.getByText('Well done! You finished the conversation.')).toBeVisible()
  await expect(talk(page)).toHaveCount(10)
  await expect(talk(page).last()).toHaveText('You could sayGoodbye! Have a nice day.')
  await expect(page.getByRole('button', { name: 'Practise again' })).toBeVisible()
  await expect(next(page)).toBeInViewport({ ratio: 1 })
  await expectNoHorizontalScroll(page)

  await next(page).click()
  await expect(page).toHaveURL(/\/home\/weeks\/1$/)
})

test('Week 1, Day 4: ending the chat early leaves the day unfinished', async ({ page }) => {
  await stubSpeech(page)
  await page.goto('/home/weeks/1')
  await page.evaluate(() =>
    localStorage.setItem(
      'kuhedu-lessons',
      JSON.stringify({ state: { heardWeeks: [1], doneDays: { 1: [1, 2, 3] } }, version: 0 }),
    ),
  )
  await page.reload()
  await page.getByRole('link', { name: 'Start Day 4' }).click()
  await page.getByRole('button', { name: 'Start the conversation' }).click()
  await page.getByRole('button', { name: 'Skip this turn' }).click()

  await page.getByRole('button', { name: 'End chat', exact: true }).click()
  await page.getByRole('link', { name: 'End chat' }).click()

  await expect(page).toHaveURL(/\/home\/weeks\/1$/)
  await expect(page.getByRole('link', { name: 'Start Day 4' })).toBeVisible()
})

test('Week 1, Day 4: a Bengali learner is told what to say before being shown the English', async ({
  page,
}) => {
  await stubSpeech(page)
  await seedLanguage(page, 'bn')
  await page.goto('/lessons/weeks/1/days/4')

  await expect(heading(page)).toHaveText('Ravi-এর সঙ্গে কথা বলুন')
  await expect(page.getByText('৪/৭')).toBeVisible()
  await page.getByRole('button', { name: 'কথোপকথন শুরু করুন' }).click()
  const lines = page.getByRole('list', { name: 'কথোপকথন' }).getByRole('listitem')
  await expect(lines).toHaveCount(1)

  await page.getByRole('button', { name: 'ইঙ্গিত' }).click()
  await expect(lines.last()).toContainText('তাঁকে সুপ্রভাত জানান।')
  await expect(lines.last()).not.toContainText('Good morning!')

  await page.getByRole('button', { name: 'আরও সাহায্য' }).click()
  await expect(lines.last()).toContainText('তাঁকে সুপ্রভাত জানান।')
  await expect(lines.last()).toContainText('Good morning!')
  await expect(page.getByRole('button', { name: 'ইঙ্গিত' })).toBeDisabled()
  // The longer Bengali labels still fit beside the microphone.
  await expect(page.getByRole('button', { name: 'কথা শেষ করুন' })).toBeInViewport({ ratio: 1 })
  await expectNoHorizontalScroll(page)
})

const toDo = (page: Page) => page.getByRole('list', { name: 'What to do' }).getByRole('listitem')

test('Week 1, Day 5: the challenge says what to do, helps on request, and never forces the microphone', async ({
  page,
}) => {
  await stubSpeech(page)
  await page.goto('/lessons/weeks/1/days/5')

  await expect(heading(page)).toHaveText('First meeting challenge')
  await expect(
    page.getByText('Meet someone new, from hello to goodbye. Try it on your own.'),
  ).toBeVisible()
  await expect(page.getByText('5/7')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0)
  await expect(toDo(page)).toHaveText([
    'Greet the person',
    'Ask how they are',
    'Say your name',
    'Ask their name',
    'Say goodbye',
  ])
  // Nothing is ticked for the learner, and nothing prompts them.
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await expect(page.getByRole('list', { name: 'Useful phrases' })).toHaveCount(0)
  await expectNoHorizontalScroll(page)

  // The microphone and Next stay in reach while the tasks scroll.
  const mic = page.getByRole('button', { name: 'Tap to speak' })
  await expect(mic).toBeInViewport({ ratio: 1 })
  expect(Math.round((await mic.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(48)
  await expect(next(page)).toBeInViewport({ ratio: 1 })
  await expect(next(page)).toBeDisabled()
  await expect(page.getByText('Record yourself once to continue.')).toBeVisible()

  // Help is one tap away, and changes nothing else.
  const help = page.getByRole('button', { name: 'I need help' })
  expect(Math.round((await help.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44)
  await help.click()
  const phrases = page.getByRole('list', { name: 'Useful phrases' }).getByRole('listitem')
  await expect(phrases).toHaveCount(6)
  // They open under the pinned microphone panel's edge, and are brought into view.
  await expect(phrases.last()).toBeInViewport({ ratio: 1 })
  const listen = page.getByRole('button', { name: 'Listen to this phrase: How are you?' })
  const box = await listen.boundingBox()
  expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44)
  expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(44)
  await listen.click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(next(page)).toBeDisabled()
  await expectNoHorizontalScroll(page)

  // A learner who cannot record goes on all the same.
  const cannot = page.getByRole('button', { name: 'I can’t record right now' })
  await cannot.scrollIntoViewIfNeeded()
  expect(Math.round((await cannot.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44)
  await cannot.click()
  await expect(next(page)).toBeEnabled()
  await expect(page.getByText('Record yourself once to continue.')).toHaveCount(0)

  await next(page).click()
  await expect(page).toHaveURL(/\/home\/weeks\/1$/)

  // Finished once, the day is not locked again.
  await page.goto('/lessons/weeks/1/days/5')
  await expect(next(page)).toBeEnabled()
})

test('Week 1, Day 5: a Bengali learner reads the challenge in Bengali', async ({ page }) => {
  await stubSpeech(page)
  await seedLanguage(page, 'bn')
  await page.goto('/lessons/weeks/1/days/5')

  await expect(heading(page)).toHaveText('প্রথম পরিচয়ের চ্যালেঞ্জ')
  await expect(page.getByText('৫/৭')).toBeVisible()
  const tasks = page.getByRole('list', { name: 'যা করতে হবে' }).getByRole('listitem')
  await expect(tasks).toHaveCount(5)
  await expect(tasks.first()).toHaveText('শুভেচ্ছা জানান')
  await expect(
    page.getByRole('heading', { level: 2, name: 'আপনার চেষ্টা রেকর্ড করুন' }),
  ).toBeVisible()

  // The help is English: it is what there is to say.
  await page.getByRole('button', { name: 'আমার সাহায্য দরকার' }).click()
  await expect(page.getByText('Nice to meet you.')).toBeVisible()
  await expectNoHorizontalScroll(page)
})

test('a blocked microphone on Day 5 is explained, and Next opens by itself', async ({ page }) => {
  await stubSpeech(page)
  await denyMicrophone(page)
  await page.goto('/lessons/weeks/1/days/5')
  await expect(next(page)).toBeDisabled()

  await page.getByRole('button', { name: 'Tap to speak' }).click()
  await expect(page.getByRole('alert')).toContainText('The microphone is blocked for this app.')
  await expect(page.getByRole('alert')).toBeInViewport()
  await expect(next(page)).toBeEnabled()
})

test('Week 1, Day 6: the review offers five activities, and one of them done opens Next', async ({
  page,
}) => {
  await stubSpeech(page)
  await page.goto('/lessons/weeks/1/days/6')

  await expect(heading(page)).toHaveText('Weekly review')
  await expect(page.getByText('Optional day')).toBeVisible()
  await expect(page.getByText('6/7')).toBeVisible()
  const activities = page.getByRole('list', { name: 'Activities' }).getByRole('link')
  await expect(activities).toHaveCount(5)
  for (const activity of await activities.all()) {
    const box = await activity.boundingBox()
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(48)
  }
  // Nothing is done yet: the day can be skipped, but there is no "Next".
  await expect(next(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Skip this day' })).toBeInViewport({ ratio: 1 })
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0)
  await expectNoHorizontalScroll(page)

  await page.getByRole('link', { name: 'Start practice' }).click()
  await expect(page).toHaveURL(/\/days\/6\?part=quiz$/)
  await expect(heading(page)).toHaveText('Quick quiz')
  const check = page.getByRole('button', { name: 'Check' })
  await expect(check).toBeDisabled()
  await expect(check).toBeInViewport({ ratio: 1 })
  await expect(page.getByText('Choose an answer to continue.')).toBeVisible()

  const answers = [
    'Good morning.',
    'I’m fine, thank you.',
    'What’s your name?',
    'Nice to meet you.',
    'Goodbye! Have a nice day.',
  ]
  for (const [index, answer] of answers.entries()) {
    await expect(page.getByText(`Question ${index + 1} of 5`)).toBeVisible()
    await page.getByText(answer, { exact: true }).click()
    await check.click()
    await expect(page.getByText('That is right. Well done!')).toBeVisible()
    await expectNoHorizontalScroll(page)
    await next(page).click()
  }
  await expect(heading(page)).toHaveText('Quiz finished')
  await expect(page.getByText('Right the first time: 5 of 5')).toBeVisible()
  await next(page).click()

  // Back on the list, with the quiz ticked and the next activity on offer.
  await expect(page).toHaveURL(/\/days\/6$/)
  await expect(page.getByRole('link', { name: /^Quick quiz.*Done$/ })).toBeVisible()
  await page.getByRole('link', { name: 'Continue practice' }).click()
  await expect(heading(page)).toHaveText('Listening practice')
  await expect(conversation(page).first()).toContainText('Hi! Good afternoon.')

  // The phone's Back closes an activity; what was done is still done after a reload.
  await page.goBack()
  await expect(heading(page)).toHaveText('Weekly review')
  await page.reload()
  await expect(page.getByRole('link', { name: /^Quick quiz.*Done$/ })).toBeVisible()

  await next(page).click()
  await expect(page).toHaveURL(/\/home\/weeks\/1$/)
})

test('Week 1, Day 6: a wrong answer is shown the right one, and the question comes back', async ({
  page,
}) => {
  await stubSpeech(page)
  await page.goto('/lessons/weeks/1/days/6?part=quiz')

  await page.getByText('Thank you.', { exact: true }).click()
  await page.getByRole('button', { name: 'Check' }).click()
  const feedback = page.getByRole('status').filter({ hasText: 'Not quite. The answer is:' })
  await expect(feedback).toContainText('Good morning.')
  await expect(feedback).toBeInViewport({ ratio: 1 })
  await expect(page.getByRole('button', { name: 'Listen to the answer' })).toBeVisible()
  await next(page).click()

  for (const answer of [
    'I’m fine, thank you.',
    'What’s your name?',
    'Nice to meet you.',
    'Goodbye! Have a nice day.',
  ]) {
    await page.getByText(answer, { exact: true }).click()
    await page.getByRole('button', { name: 'Check' }).click()
    await next(page).click()
  }

  await expect(page.getByText('One more try')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(
    'It is morning. How do you greet someone?',
  )
  await page.getByText('Good morning.', { exact: true }).click()
  await page.getByRole('button', { name: 'Check' }).click()
  await next(page).click()
  await expect(page.getByText('Right the first time: 4 of 5')).toBeVisible()
})

test('Week 1, Day 6: a Bengali learner turns a flashcard from the meaning to the word', async ({
  page,
}) => {
  await stubSpeech(page)
  await seedLanguage(page, 'bn')
  await page.goto('/lessons/weeks/1/days/6?part=flashcards')

  await expect(heading(page)).toHaveText('শব্দের ফ্ল্যাশকার্ড')
  await expect(page.getByText('বাকি কার্ড: ৬')).toBeVisible()
  await expect(page.getByText('হ্যালো', { exact: true })).toBeVisible()
  await expect(page.getByText('hello', { exact: true })).toHaveCount(0)

  const show = page.getByRole('button', { name: 'শব্দটি দেখুন' })
  await expect(show).toBeInViewport({ ratio: 1 })
  await show.click()
  await expect(page.getByText('hello', { exact: true })).toBeVisible()
  await expectNoHorizontalScroll(page)

  // Sent to the back of the pile, it is still to do; put away, it is not.
  await page.getByRole('button', { name: 'আবার অনুশীলন করব' }).click()
  await expect(page.getByText('বাকি কার্ড: ৬')).toBeVisible()
  await expect(page.getByText('সুপ্রভাত', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'শব্দটি দেখুন' }).click()
  await page.getByRole('button', { name: 'এটি আমি জানি' }).click()
  await expect(page.getByText('বাকি কার্ড: ৫')).toBeVisible()
})

test('Week 1, Day 7: choose a scenario and a level, take the challenge, and Next opens', async ({
  page,
}) => {
  await stubSpeech(page)
  await page.goto('/lessons/weeks/1/days/7')

  await expect(heading(page)).toHaveText('Real-world challenge')
  await expect(page.getByText('Optional day')).toBeVisible()
  await expect(page.getByText('7/7')).toBeVisible()
  const scenarios = page.getByRole('group', { name: 'Change the scenario' })
  const levels = page.getByRole('group', { name: 'Challenge level' })
  await expect(scenarios.getByRole('radio')).toHaveCount(3)
  await expect(scenarios.getByRole('radio', { name: 'A new neighbour' })).toBeChecked()
  await expect(levels.getByRole('radio', { name: /^Standard/ })).toBeChecked()
  for (const chip of await page.locator('fieldset label').all()) {
    const box = await chip.boundingBox()
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44)
  }
  // Nothing is done yet: the day can be skipped, but there is no "Next".
  await expect(next(page)).toHaveCount(0)
  const start = page.getByRole('link', { name: 'Start challenge' })
  await expect(start).toBeInViewport({ ratio: 1 })
  await expect(page.getByRole('button', { name: 'Skip this day' })).toBeInViewport({ ratio: 1 })
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0)
  await expectNoHorizontalScroll(page)

  await page.getByText('A phone call', { exact: true }).click()
  await page.getByText('Harder', { exact: true }).click()
  await start.click()
  await expect(page).toHaveURL(/\/days\/7\?scenario=3&level=harder$/)
  await expect(heading(page)).toHaveText('Talk to Anita')
  await expect(page.getByText('A phone call · Harder')).toBeVisible()

  // Harder: no hint to ask for, and the microphone stays in the middle.
  await page.getByRole('button', { name: 'Start the conversation' }).click()
  await expect(page.getByRole('button', { name: 'Hint' })).toHaveCount(0)
  const mic = await page.getByRole('button', { name: 'Tap to speak' }).boundingBox()
  const width = page.viewportSize()?.width ?? 0
  const column = Math.min(width, 448)
  expect(Math.abs((mic?.x ?? 0) + (mic?.width ?? 0) / 2 - width / 2)).toBeLessThan(column * 0.05)
  await expectNoHorizontalScroll(page)
  for (let turn = 0; turn < 4; turn += 1) {
    await page.getByRole('button', { name: 'Skip this turn' }).click()
  }
  await next(page).click()

  // Back on the choices: the scenario is ticked, the level is still the one chosen.
  await expect(page).toHaveURL(/\/days\/7$/)
  await expect(scenarios.getByRole('radio', { name: 'A phone call Done' })).toHaveCount(1)
  await expect(levels.getByRole('radio', { name: /^Harder/ })).toBeChecked()
  await page.reload()
  await expect(scenarios.getByRole('radio', { name: 'A phone call Done' })).toHaveCount(1)

  await next(page).click()
  await expect(page).toHaveURL(/\/home\/weeks\/1$/)
})

test('Week 1, Day 7: the Easier level tells a Bengali learner what to say on every turn', async ({
  page,
}) => {
  await stubSpeech(page)
  await seedLanguage(page, 'bn')
  await page.goto('/lessons/weeks/1/days/7')

  await expect(heading(page)).toHaveText('বাস্তব জীবনের চ্যালেঞ্জ')
  await expect(page.getByText('নতুন প্রতিবেশী', { exact: true })).toBeVisible()
  await expectNoHorizontalScroll(page)
  await page.getByText('সহজ', { exact: true }).click()
  await page.getByRole('link', { name: 'চ্যালেঞ্জ শুরু করুন' }).click()
  await expect(page.getByText('নতুন প্রতিবেশী · সহজ')).toBeVisible()
  await page.getByRole('button', { name: 'কথোপকথন শুরু করুন' }).click()

  // Without asking: what to say, in Bengali. The English is one tap away.
  await expect(page.getByText('তাঁকে শুভ সন্ধ্যা জানান।')).toBeVisible()
  await expect(page.getByText('Good evening!', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'আরও সাহায্য' }).click()
  await expect(page.getByText('Good evening!', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'এই পালা বাদ দিন' }).click()
  await expect(page.getByText('নিজের নাম বলুন।')).toBeVisible()
  await expectNoHorizontalScroll(page)

  // The phone's Back closes the challenge.
  await page.goBack()
  await expect(heading(page)).toHaveText('বাস্তব জীবনের চ্যালেঞ্জ')
})

test('days are taken in order from the week, Day 1 to Day 7, and then the week is complete', async ({
  page,
}) => {
  await stubSpeech(page)
  await page.goto('/home/weeks/1')

  await page.getByRole('link', { name: 'Start Day 1' }).click()
  await page.getByRole('button', { name: 'Play the conversation' }).click()
  await next(page).click()

  await page.getByRole('link', { name: 'Start Day 2' }).click()
  await expect(heading(page)).toHaveText('Learn useful words')
  await hear(page, week1Words)
  await next(page).click()

  await page.getByRole('link', { name: 'Start Day 3' }).click()
  await expect(heading(page)).toHaveText('Translate and speak')
  for (const sentence of [1, 2, 3, 4, 5]) {
    await expect(page.getByText(`Sentence ${sentence} of 5`)).toBeVisible()
    await next(page).click()
  }

  await page.getByRole('link', { name: 'Start Day 4' }).click()
  await expect(heading(page)).toHaveText('Talk to Ravi')
  await page.getByRole('button', { name: 'Start the conversation' }).click()
  for (let turn = 0; turn < 5; turn += 1) {
    await page.getByRole('button', { name: 'Skip this turn' }).click()
  }
  await next(page).click()

  await page.getByRole('link', { name: 'Start Day 5' }).click()
  await expect(heading(page)).toHaveText('First meeting challenge')
  await page.getByRole('button', { name: 'I can’t record right now' }).click()
  await next(page).click()

  // Day 6 is optional: skipping it moves the week on as well.
  await page.getByRole('link', { name: 'Start Day 6' }).click()
  await expect(page).toHaveURL(/\/lessons\/weeks\/1\/days\/6$/)
  await expect(heading(page)).toHaveText('Weekly review')
  await page.getByRole('button', { name: 'Skip this day' }).click()

  // Day 7 is optional too. With it the week is complete, and its button leads on.
  await page.getByRole('link', { name: 'Start Day 7' }).click()
  await expect(page).toHaveURL(/\/lessons\/weeks\/1\/days\/7$/)
  await expect(heading(page)).toHaveText('Real-world challenge')
  await page.getByRole('button', { name: 'Skip this day' }).click()

  await expect(page).toHaveURL(/\/home\/weeks\/1$/)
  await expect(page.getByText('You finished this week. Well done!')).toBeVisible()
  await expect(page.getByRole('link', { name: /^Start Day/ })).toHaveCount(0)
  await expectNoHorizontalScroll(page)
  await page.reload()
  await expect(page.getByText('You finished this week. Well done!')).toBeVisible()

  // Another week has its own count.
  await page.getByRole('link', { name: 'Go to Week 2' }).click()
  await expect(page).toHaveURL(/\/home\/weeks\/2$/)
  await expect(page.getByRole('link', { name: 'Start Day 1' })).toBeVisible()
})

test.describe('practising the pronunciation', () => {
  test.skip(({ browserName }) => browserName === 'webkit', 'WebKit has no fake microphone')

  test('the learner records the word and can listen to themselves', async ({ page }) => {
    await stubSpeech(page)
    await page.goto('/lessons/weeks/1/days/2')
    await expect(
      page.getByText('We will ask to use your microphone. Your recording is not saved.'),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Tap to speak' }).click()
    await expect(page.getByText(/^Recording…/)).toBeVisible()
    await page.getByRole('button', { name: 'Stop recording' }).click()
    await expect(page.getByText('Recorded. Listen, or try again.')).toBeVisible()

    const listen = page.getByRole('button', { name: 'Listen to yourself' })
    const box = await listen.boundingBox()
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44)
    await listen.click()

    // Another word is another attempt.
    await word(page, 'name').click()
    await expect(listen).toHaveCount(0)
    await expect(page.locator('section').getByText('name')).toBeVisible()
    // Speaking opened nothing: Next still waits for the words to be heard.
    await expect(next(page)).toBeDisabled()
    await expectNoHorizontalScroll(page)
  })

  test('on Day 3 the learner records the sentence, and the next one starts without it', async ({
    page,
  }) => {
    await stubSpeech(page)
    await page.goto('/lessons/weeks/1/days/3')
    await expect(page.getByRole('heading', { level: 2, name: 'Say it in English' })).toBeVisible()
    await expect(
      page.getByText('We will ask to use your microphone. Your recording is not saved.'),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Tap to speak' }).click()
    await expect(page.getByText(/^Recording…/)).toBeVisible()
    await page.getByRole('button', { name: 'Stop recording' }).click()
    await expect(page.getByText('Recorded. Listen, or try again.')).toBeVisible()
    const listen = page.getByRole('button', { name: 'Listen to yourself' })
    await listen.click()

    await next(page).click()
    await expect(page.getByText('Sentence 2 of 5')).toBeVisible()
    await expect(listen).toHaveCount(0)
    await expectNoHorizontalScroll(page)
  })
})

test.describe('recording the challenge', () => {
  test.skip(({ browserName }) => browserName === 'webkit', 'WebKit has no fake microphone')

  test('one take opens Next, and the learner ticks what they managed after listening back', async ({
    page,
  }) => {
    await stubSpeech(page)
    await page.goto('/lessons/weeks/1/days/5')

    await page.getByRole('button', { name: 'Tap to speak' }).click()
    await expect(page.getByText(/^Recording… 0:0\d \/ 2:00$/)).toBeVisible()
    await page.getByRole('button', { name: 'Stop recording' }).click()
    await expect(page.getByText('Recorded. Listen, or try again.')).toBeVisible()
    await expect(next(page)).toBeEnabled()

    // The take is the learner's alone, and the screen says so.
    await expect(
      page.getByText('Only you can hear this recording. It is not saved, sent or scored.'),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Listen to yourself' }).click()

    // Now the list can be ticked, by them.
    await expect(
      page.getByText('Listen to your recording and tick what you managed.'),
    ).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(5)
    for (const row of await toDo(page).all()) {
      const box = await row.boundingBox()
      expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44)
    }
    await page.getByText('Greet the person').click()
    await page.getByText('Say goodbye').click()
    await expect(page.getByRole('checkbox', { name: 'Greet the person' })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'Say goodbye' })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'Say your name' })).not.toBeChecked()
    await page.getByText('Say goodbye').click()
    await expect(page.getByRole('checkbox', { name: 'Say goodbye' })).not.toBeChecked()
    await expectNoHorizontalScroll(page)

    await next(page).click()
    await expect(page).toHaveURL(/\/home\/weeks\/1$/)
  })
})

test.describe('answering in the role-play', () => {
  test.skip(({ browserName }) => browserName === 'webkit', 'WebKit has no fake microphone')

  test('speaking and stopping is the answer: the partner goes on, and the take can be heard', async ({
    page,
  }) => {
    await stubSpeech(page)
    await page.goto('/lessons/weeks/1/days/4')
    await page.getByRole('button', { name: 'Start the conversation' }).click()
    await expect(page.getByText('Your turn. Tap to speak.')).toBeVisible()

    await page.getByRole('button', { name: 'Tap to speak' }).click()
    await expect(page.getByText(/^Recording…/)).toBeVisible()
    await page.getByRole('button', { name: 'Stop recording' }).click()

    await expect(talk(page)).toHaveText([
      'RaviHello! Good morning.',
      'You could sayGood morning!',
      'RaviHow are you?',
    ])
    const listen = page.getByRole('button', { name: 'Listen to yourself' })
    await expect(listen).toBeVisible()
    const box = await listen.boundingBox()
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44)
    await listen.click()
    await expectNoHorizontalScroll(page)
  })
})

test('a blocked microphone in the role-play is explained, and turns can still be skipped', async ({
  page,
}) => {
  await stubSpeech(page)
  await denyMicrophone(page)
  await page.goto('/lessons/weeks/1/days/4')
  await page.getByRole('button', { name: 'Start the conversation' }).click()

  await page.getByRole('button', { name: 'Tap to speak' }).click()
  await expect(page.getByRole('alert')).toContainText('The microphone is blocked for this app.')
  await expect(page.getByRole('alert')).toBeInViewport()
  await expect(talk(page)).toHaveCount(1)

  await page.getByRole('button', { name: 'Skip this turn' }).click()
  await expect(talk(page)).toHaveCount(3)
})

test('a blocked microphone is explained, and the day can still be finished', async ({ page }) => {
  await stubSpeech(page)
  await denyMicrophone(page)
  await page.goto('/lessons/weeks/1/days/2')

  await page.getByRole('button', { name: 'Tap to speak' }).click()
  await expect(page.getByRole('alert')).toContainText('The microphone is blocked for this app.')
  await expect(page.getByRole('alert')).toBeInViewport()

  await hear(page, week1Words)
  await expect(next(page)).toBeEnabled()
})

test('a Bengali learner sees what each word means', async ({ page }) => {
  await stubSpeech(page)
  await seedLanguage(page, 'bn')
  await page.goto('/lessons/weeks/1/days/2')

  await expect(heading(page)).toHaveText('দরকারি শব্দ শিখুন')
  await expect(page.getByText('২/৭')).toBeVisible()
  const first = page.getByRole('list', { name: 'শব্দ' }).getByRole('button').first()
  await expect(first).toContainText('hello')
  await expect(first).toContainText('হ্যালো')
  await expect(page.getByRole('heading', { level: 2, name: 'উচ্চারণ অনুশীলন করুন' })).toBeVisible()
  await expectNoHorizontalScroll(page)
})

test('words written by the admin open that week’s Day 2, pictures included', async ({
  context,
  page: adminTab,
}) => {
  await stubSpeech(context)
  await signInAsAdmin(adminTab)
  await adminTab.goto('/admin/lessons')

  const learnerTab = await context.newPage()
  await learnerTab.goto('/lessons/weeks/2/days/2')
  await expect(heading(learnerTab)).toHaveText('Week 2 · Day 2')

  await adminTab.getByText('Day 2 · Learn useful words').click()
  await adminTab.getByRole('combobox', { name: 'Week' }).selectOption('2')
  await adminTab.getByRole('button', { name: 'Add word' }).click()
  await expect(adminTab.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await adminTab.getByRole('textbox', { name: 'Word or phrase (Word 1)' }).fill('city')
  await adminTab.getByRole('textbox', { name: 'Phonetic spelling (Word 1)' }).fill('/ˈsɪti/')
  await adminTab.getByRole('textbox', { name: 'Meaning: বাংলা (Word 1)' }).fill('শহর')
  await adminTab.getByLabel('Picture: Word 1').setInputFiles({
    name: 'city.png',
    mimeType: 'image/png',
    buffer: PIXEL_PNG,
  })
  await expect(adminTab.getByRole('button', { name: 'Remove image' })).toBeVisible()
  await adminTab.getByRole('button', { name: 'Add word' }).click()
  await adminTab.getByRole('textbox', { name: 'Word or phrase (Word 2)' }).fill('work')
  await adminTab.getByRole('button', { name: 'Save changes' }).click()
  await expect(adminTab.getByRole('status')).toContainText('Saved')
  await expectNoHorizontalScroll(adminTab)

  // The learner's open tab turns into the day.
  await expect(heading(learnerTab)).toHaveText('Learn useful words')
  await expect(words(learnerTab)).toHaveCount(2)
  await expect(word(learnerTab, 'city')).toContainText('/ˈsɪti/')
  const picture = word(learnerTab, 'city').locator('img')
  await expect(picture).toHaveAttribute('src', /^data:image\/(webp|png|jpeg);base64,/)
  expect(await picture.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
  await expect(word(learnerTab, 'work').locator('img')).toHaveCount(0)

  await hear(learnerTab, ['city', 'work'])
  await expect(next(learnerTab)).toBeEnabled()

  // Week 1's built-in words can be reworded, and put back.
  await adminTab.getByRole('combobox', { name: 'Week' }).selectOption('1')
  await adminTab.getByRole('textbox', { name: 'Word or phrase (Word 1)' }).fill('hi')
  await adminTab.getByRole('button', { name: 'Save changes' }).click()
  await expect(adminTab.getByRole('status')).toContainText('Saved')
  await learnerTab.goto('/lessons/weeks/1/days/2')
  await expect(words(learnerTab).first()).toContainText('hi')

  adminTab.once('dialog', (dialog) => dialog.accept())
  await adminTab.getByRole('button', { name: 'Reset to defaults' }).click()
  await expect(words(learnerTab).first()).toContainText('hello')
  await learnerTab.goto('/lessons/weeks/2/days/2')
  await expect(heading(learnerTab)).toHaveText('Week 2 · Day 2')
})

test('sentences written by the admin open that week’s Day 3, without a reload', async ({
  context,
  page: adminTab,
}) => {
  await stubSpeech(context)
  await signInAsAdmin(adminTab)
  await adminTab.goto('/admin/lessons')

  // The learner reads the app in Bengali; the admin area stays in English.
  const learnerTab = await context.newPage()
  await seedLanguage(learnerTab, 'bn')
  await learnerTab.goto('/lessons/weeks/2/days/3')
  await expect(heading(learnerTab)).toHaveText('সপ্তাহ ২ · দিন ৩')

  await adminTab.getByText('Day 3 · Translate and speak').click()
  await adminTab.getByRole('combobox', { name: 'Week' }).selectOption('2')
  await adminTab.getByRole('button', { name: 'Add sentence' }).click()
  await expect(adminTab.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await adminTab
    .getByRole('textbox', { name: 'English: the answer (Sentence 1)' })
    .fill('I’m from Kolkata.')
  await adminTab
    .getByRole('textbox', { name: 'Also accepted (Sentence 1)' })
    .fill('I come from Kolkata.\nI’m from Calcutta.')
  await adminTab
    .getByRole('textbox', { name: 'Sentence in বাংলা (Sentence 1)' })
    .fill('আমি কলকাতা থেকে এসেছি।')
  await adminTab
    .getByRole('textbox', { name: 'Tips: বাংলা (Sentence 1)' })
    .fill('“I’m from …” দিয়ে শুরু করুন।')
  await adminTab.getByRole('button', { name: 'Save changes' }).click()
  await expect(adminTab.getByRole('status')).toContainText('Saved')
  await expectNoHorizontalScroll(adminTab)

  // The learner's open tab turns into the day, with the admin's sentence and tip.
  await expect(heading(learnerTab)).toHaveText(bn.title)
  await expect(learnerTab.getByRole('region', { name: bn.sentence })).toContainText(
    'আমি কলকাতা থেকে এসেছি।',
  )
  await expect(learnerTab.getByText('“I’m from …” দিয়ে শুরু করুন।')).toBeVisible()

  // Another sentence the admin accepted is right, and so is its long form.
  const field = learnerTab.getByRole('textbox', { name: bn.field })
  await field.fill('I am from Calcutta')
  await field.press('Enter')
  await expect(learnerTab.getByText(bn.right)).toBeVisible()
  await expect(learnerTab.getByText('I’m from Kolkata.')).toBeVisible()
  await expect(learnerTab.getByRole('button', { name: bn.next })).toBeEnabled()

  // Week 1's built-in sentences can be reworded, and put back.
  await adminTab.getByRole('combobox', { name: 'Week' }).selectOption('1')
  await adminTab
    .getByRole('textbox', { name: 'Sentence in বাংলা (Sentence 1)' })
    .fill('নমস্কার! সুপ্রভাত।')
  await adminTab.getByRole('button', { name: 'Save changes' }).click()
  await expect(adminTab.getByRole('status')).toContainText('Saved')
  await learnerTab.goto('/lessons/weeks/1/days/3')
  await expect(learnerTab.getByRole('region', { name: bn.sentence })).toContainText(
    'নমস্কার! সুপ্রভাত।',
  )

  adminTab.once('dialog', (dialog) => dialog.accept())
  await adminTab.getByRole('button', { name: 'Reset to defaults' }).click()
  await expect(learnerTab.getByRole('region', { name: bn.sentence })).toContainText(
    'হ্যালো! সুপ্রভাত।',
  )
  await learnerTab.goto('/lessons/weeks/2/days/3')
  await expect(heading(learnerTab)).toHaveText('সপ্তাহ ২ · দিন ৩')
})

test('a challenge written by the admin opens that week’s Day 5, without a reload', async ({
  context,
  page: adminTab,
}) => {
  await stubSpeech(context)
  await signInAsAdmin(adminTab)
  await adminTab.goto('/admin/lessons')

  // The learner reads the app in Bengali; the admin area stays in English.
  const learnerTab = await context.newPage()
  await seedLanguage(learnerTab, 'bn')
  await learnerTab.goto('/lessons/weeks/2/days/5')
  await expect(heading(learnerTab)).toHaveText('সপ্তাহ ২ · দিন ৫')

  await adminTab.getByText('Day 5 · Challenge').click()
  await adminTab.getByRole('combobox', { name: 'Week' }).selectOption('2')
  await adminTab.getByRole('textbox', { name: 'Name of the challenge' }).fill('Café challenge')
  await adminTab.getByRole('textbox', { name: 'Name in বাংলা' }).fill('ক্যাফে চ্যালেঞ্জ')
  // A name without anything to do cannot be saved.
  await expect(adminTab.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await adminTab.getByRole('button', { name: 'Add task' }).click()
  await adminTab.getByRole('textbox', { name: 'What to do (Task 1)' }).fill('Greet the staff')
  await adminTab.getByRole('textbox', { name: 'In বাংলা (Task 1)' }).fill('কর্মীদের শুভেচ্ছা জানান')
  await adminTab.getByRole('button', { name: 'Add task' }).click()
  await adminTab.getByRole('textbox', { name: 'What to do (Task 2)' }).fill('Order food and drink')
  await adminTab
    .getByRole('textbox', { name: 'Phrases' })
    .fill('I’d like a coffee, please.\nHow much is it?')
  await adminTab.getByRole('button', { name: 'Save changes' }).click()
  await expect(adminTab.getByRole('status')).toContainText('Saved')
  await expectNoHorizontalScroll(adminTab)

  // The learner's open tab turns into the day: Bengali where it is written, English where not.
  await expect(heading(learnerTab)).toHaveText('ক্যাফে চ্যালেঞ্জ')
  const tasks = learnerTab.getByRole('list', { name: 'যা করতে হবে' }).getByRole('listitem')
  await expect(tasks).toHaveText(['কর্মীদের শুভেচ্ছা জানান', 'Order food and drink'])
  await learnerTab.getByRole('button', { name: 'আমার সাহায্য দরকার' }).click()
  await expect(learnerTab.getByText('How much is it?')).toBeVisible()

  // Week 1's built-in challenge can be changed, and put back.
  await adminTab.getByRole('combobox', { name: 'Week' }).selectOption('1')
  await adminTab.getByRole('textbox', { name: 'Name in বাংলা' }).fill('হ্যালো বলার চ্যালেঞ্জ')
  await adminTab.getByRole('button', { name: 'Save changes' }).click()
  await expect(adminTab.getByRole('status')).toContainText('Saved')
  await learnerTab.goto('/lessons/weeks/1/days/5')
  await expect(heading(learnerTab)).toHaveText('হ্যালো বলার চ্যালেঞ্জ')

  adminTab.once('dialog', (dialog) => dialog.accept())
  await adminTab.getByRole('button', { name: 'Reset to defaults' }).click()
  await expect(heading(learnerTab)).toHaveText('প্রথম পরিচয়ের চ্যালেঞ্জ')
  await learnerTab.goto('/lessons/weeks/2/days/5')
  await expect(heading(learnerTab)).toHaveText('সপ্তাহ ২ · দিন ৫')
})

test('a role-play written by the admin opens that week’s Day 4, partner’s picture included', async ({
  context,
  page: adminTab,
}) => {
  await stubSpeech(context)
  await signInAsAdmin(adminTab)
  await adminTab.goto('/admin/lessons')

  const learnerTab = await context.newPage()
  await learnerTab.goto('/lessons/weeks/2/days/4')
  await expect(heading(learnerTab)).toHaveText('Week 2 · Day 4')

  await adminTab.getByText('Day 4 · Role-play').click()
  await adminTab.getByRole('combobox', { name: 'Week' }).selectOption('2')
  await adminTab.getByRole('textbox', { name: 'Name or role' }).fill('the barista')
  await adminTab.getByLabel('Picture of the partner').setInputFiles({
    name: 'barista.png',
    mimeType: 'image/png',
    buffer: PIXEL_PNG,
  })
  await expect(adminTab.getByRole('button', { name: 'Remove image' })).toBeVisible()
  // A partner without anything to say cannot be saved.
  await expect(adminTab.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await adminTab.getByRole('button', { name: 'Add turn' }).click()
  await adminTab
    .getByRole('textbox', { name: 'Partner says (Turn 1)' })
    .fill('Hi! Welcome! What would you like today?')
  await adminTab
    .getByRole('textbox', { name: 'Suggested reply (Turn 1)' })
    .fill('I’d like a coffee, please.')
  await adminTab
    .getByRole('textbox', { name: 'What to say, in বাংলা (Turn 1)' })
    .fill('ভদ্রভাবে এক কাপ কফি চান।')
  await adminTab.getByRole('button', { name: 'Save changes' }).click()
  await expect(adminTab.getByRole('status')).toContainText('Saved')
  await expectNoHorizontalScroll(adminTab)

  // The learner's open tab turns into the day, with the admin's partner.
  await expect(heading(learnerTab)).toHaveText('Talk to the barista')
  const picture = learnerTab.locator('main img')
  await expect(picture).toHaveAttribute('src', /^data:image\/(webp|png|jpeg);base64,/)
  expect(await picture.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
  await learnerTab.getByRole('button', { name: 'Start the conversation' }).click()
  await expect(talk(learnerTab)).toHaveText(['the baristaHi! Welcome! What would you like today?'])
  await learnerTab.getByRole('button', { name: 'Skip this turn' }).click()
  await expect(talk(learnerTab).last()).toHaveText('You could sayI’d like a coffee, please.')
  await expect(next(learnerTab)).toBeVisible()

  // Week 1's built-in role-play can be changed, and put back.
  await adminTab.getByRole('combobox', { name: 'Week' }).selectOption('1')
  await adminTab.getByRole('textbox', { name: 'Name or role' }).fill('Meera')
  await adminTab.getByRole('button', { name: 'Save changes' }).click()
  await expect(adminTab.getByRole('status')).toContainText('Saved')
  await learnerTab.goto('/lessons/weeks/1/days/4')
  await expect(heading(learnerTab)).toHaveText('Talk to Meera')

  adminTab.once('dialog', (dialog) => dialog.accept())
  await adminTab.getByRole('button', { name: 'Reset to defaults' }).click()
  await expect(heading(learnerTab)).toHaveText('Talk to Ravi')
  await learnerTab.goto('/lessons/weeks/2/days/4')
  await expect(heading(learnerTab)).toHaveText('Week 2 · Day 4')
})

test('a device that cannot speak does not trap the learner', async ({ page }) => {
  await stubSpeech(page, 'fails')
  await page.goto('/lessons/weeks/1/days/1')
  await expect(next(page)).toBeDisabled()

  await page.getByRole('button', { name: 'Play the conversation' }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'This device cannot play the conversation. Read it below, then continue.',
  )
  await expect(next(page)).toBeEnabled()
})

test('a Bengali learner reads the transcript with the translation under each line', async ({
  page,
}) => {
  await stubSpeech(page)
  await seedLanguage(page, 'bn')
  await page.goto('/lessons/weeks/1/days/1')

  await expect(heading(page)).toHaveText('দেখুন ও শুনুন')
  await expect(page.getByText('১/৭')).toBeVisible()
  const lines = page.getByRole('list', { name: 'কথোপকথন' }).getByRole('listitem')
  await expect(lines.first()).toContainText('Hello! Good morning.')
  await expect(lines.first()).not.toContainText('সুপ্রভাত')

  await page.getByText('লিখিত রূপ').click()
  await expect(lines.first()).toContainText('Hello! Good morning.')
  await expect(lines.first()).toContainText('হ্যালো! সুপ্রভাত।')
  await expect(lines.getByRole('button')).toHaveCount(0)
  await expectNoHorizontalScroll(page)

  await page.getByText('সংলাপ').click()
  await expect(lines.getByRole('button')).toHaveCount(9)
})

const withVideo = {
  1: {
    videoUrl: '/media/week1.mp4',
    lines: [{ speaker: 'Asha', text: 'Hello!', translations: {} }],
  },
}

test('a video linked by the admin takes the place of the picture and the voice', async ({
  page,
}) => {
  await seedSettings(page, 'week-dialogues', withVideo)
  await stubSpeech(page)
  // Held open: there is no real video file to serve, and the player must not report an error.
  await page.route('**/media/week1.mp4', () => {})
  await page.goto('/lessons/weeks/1/days/1')

  const video = page.locator('video')
  await expect(video).toBeVisible()
  await expect(video).toHaveAttribute('src', '/media/week1.mp4')
  await expect(video).toHaveJSProperty('controls', true)
  await expect(page.getByRole('button', { name: 'Play the conversation' })).toHaveCount(0)
  await expect(conversation(page)).toHaveText(['AshaHello!'])
  await expect(next(page)).toBeDisabled()
  await expectNoHorizontalScroll(page)
})

test('a quiz written by the admin opens that week’s Day 6, without a reload', async ({
  context,
  page: adminTab,
}) => {
  await stubSpeech(context)
  await signInAsAdmin(adminTab)
  await adminTab.goto('/admin/lessons')

  const learnerTab = await context.newPage()
  await learnerTab.goto('/lessons/weeks/2/days/6')
  await expect(heading(learnerTab)).toHaveText('Week 2 · Day 6')
  await expect(learnerTab.getByText('This day’s lessons are coming soon.')).toBeVisible()

  await adminTab.getByText('Day 6 · Review').click()
  await adminTab.getByRole('combobox', { name: 'Week' }).selectOption('2')
  await adminTab.getByRole('button', { name: 'Add question' }).click()
  // A question without an answer and another choice cannot be saved.
  await expect(adminTab.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await adminTab
    .getByRole('textbox', { name: 'What is asked (Question 1)' })
    .fill('How do you order a coffee?')
  await adminTab
    .getByRole('textbox', { name: 'Right answer (Question 1)' })
    .fill('A coffee, please.')
  await adminTab
    .getByRole('textbox', { name: 'Other choices (Question 1)' })
    .fill('Goodbye.\nThank you.')
  await adminTab.getByRole('button', { name: 'Save changes' }).click()
  await expect(adminTab.getByRole('status')).toContainText('Saved')
  await expectNoHorizontalScroll(adminTab)

  // The learner's open tab turns into the review, listing the one part the week has.
  await expect(heading(learnerTab)).toHaveText('Weekly review')
  await expect(learnerTab.getByRole('list', { name: 'Activities' }).getByRole('link')).toHaveText([
    /^Quick quiz/,
  ])
  await learnerTab.getByRole('link', { name: 'Start practice' }).click()
  await expect(learnerTab.getByRole('heading', { level: 2 })).toHaveText(
    'How do you order a coffee?',
  )
  await expect(learnerTab.getByRole('radio')).toHaveCount(3)

  // The review's conversation is written in Day 1's editor, and adds a part to the list.
  await adminTab.getByText('Listening practice').click()
  await adminTab.getByRole('button', { name: 'Add line' }).click()
  await adminTab.getByRole('textbox', { name: 'Speaker (Line 1)' }).fill('Barista')
  await adminTab.getByRole('textbox', { name: 'English (Line 1)' }).fill('What would you like?')
  await adminTab.getByRole('button', { name: 'Save changes' }).click()
  await expect(adminTab.getByRole('status')).toContainText('Saved')
  await learnerTab.goto('/lessons/weeks/2/days/6')
  await expect(learnerTab.getByRole('list', { name: 'Activities' }).getByRole('link')).toHaveText([
    /^Quick quiz/,
    /^Listening practice/,
  ])
  // Day 1 of that week still has no conversation of its own.
  await learnerTab.goto('/lessons/weeks/2/days/1')
  await expect(heading(learnerTab)).toHaveText('Week 2 · Day 1')

  await learnerTab.goto('/lessons/weeks/2/days/6')
  adminTab.once('dialog', (dialog) => dialog.accept())
  await adminTab.getByRole('button', { name: 'Reset to defaults' }).click()
  await expect(heading(learnerTab)).toHaveText('Week 2 · Day 6')
})

test('a scenario written by the admin opens that week’s Day 7, without a reload', async ({
  context,
  page: adminTab,
}) => {
  await stubSpeech(context)
  await signInAsAdmin(adminTab)
  await adminTab.goto('/admin/lessons')

  const learnerTab = await context.newPage()
  await learnerTab.goto('/lessons/weeks/2/days/7')
  await expect(heading(learnerTab)).toHaveText('Week 2 · Day 7')
  await expect(learnerTab.getByText('This day’s lessons are coming soon.')).toBeVisible()

  await adminTab.getByText('Day 7 · Real-world challenge').click()
  await adminTab.getByRole('combobox', { name: 'Week' }).selectOption('2')
  await adminTab.getByRole('button', { name: 'Add scenario' }).click()
  // A scenario without a name and a conversation cannot be saved.
  await expect(adminTab.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await adminTab.getByRole('textbox', { name: 'Name of the scenario' }).fill('Takeaway café')
  await adminTab.getByRole('textbox', { name: 'Name or role' }).fill('the barista')
  await adminTab.getByRole('button', { name: 'Add turn' }).click()
  await adminTab
    .getByRole('textbox', { name: 'Partner says (Turn 1)' })
    .fill('What would you like?')
  await adminTab
    .getByRole('textbox', { name: 'Suggested reply (Turn 1)' })
    .fill('A coffee, please.')
  await adminTab.getByRole('button', { name: 'Save changes' }).click()
  await expect(adminTab.getByRole('status')).toContainText('Saved')
  await expectNoHorizontalScroll(adminTab)

  // The learner's open tab turns into the day, with the one scenario the week has.
  await expect(heading(learnerTab)).toHaveText('Real-world challenge')
  await expect(
    learnerTab.getByRole('group', { name: 'Change the scenario' }).getByRole('radio'),
  ).toHaveCount(1)
  await learnerTab.getByRole('link', { name: 'Start challenge' }).click()
  await expect(heading(learnerTab)).toHaveText('Talk to the barista')
  await expect(learnerTab.getByText('Takeaway café · Standard')).toBeVisible()
  // Day 4 of that week still has no role-play of its own.
  await learnerTab.goto('/lessons/weeks/2/days/4')
  await expect(heading(learnerTab)).toHaveText('Week 2 · Day 4')

  await learnerTab.goto('/lessons/weeks/2/days/7')
  adminTab.once('dialog', (dialog) => dialog.accept())
  await adminTab.getByRole('button', { name: 'Reset to defaults' }).click()
  await expect(heading(learnerTab)).toHaveText('Week 2 · Day 7')
})

test('a video that cannot be loaded gives way to the picture and the voice', async ({ page }) => {
  await seedSettings(page, 'week-dialogues', withVideo)
  await stubSpeech(page)
  await page.route('**/media/week1.mp4', (route) => route.abort())
  await page.goto('/lessons/weeks/1/days/1')

  await expect(page.getByRole('button', { name: 'Play the conversation' })).toBeVisible()
  await expect(page.locator('video')).toHaveCount(0)
  await page.getByRole('button', { name: 'Play the conversation' }).click()
  await expect(next(page)).toBeEnabled()
})

test('a conversation written by the admin opens that week’s Day 1, without a reload', async ({
  context,
  page: adminTab,
}) => {
  await stubSpeech(context)
  await signInAsAdmin(adminTab)
  await adminTab.goto('/admin/lessons')
  await expect(adminTab.getByRole('heading', { level: 1 })).toHaveText('Lessons')

  const learnerTab = await context.newPage()
  await learnerTab.goto('/lessons/weeks/2/days/1')
  await expect(heading(learnerTab)).toHaveText('Week 2 · Day 1')
  await expect(learnerTab.getByText('This day’s lessons are coming soon.')).toBeVisible()

  await adminTab.getByRole('combobox', { name: 'Week' }).selectOption('2')
  await adminTab.getByRole('button', { name: 'Add line' }).click()
  await expect(adminTab.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await adminTab.getByRole('textbox', { name: 'Speaker (Line 1)' }).fill('Meera')
  await adminTab.getByRole('textbox', { name: 'English (Line 1)' }).fill('Where are you from?')
  await adminTab.getByRole('textbox', { name: 'বাংলা (Line 1)' }).fill('আপনি কোথা থেকে এসেছেন?')
  await adminTab.getByRole('button', { name: 'Add line' }).click()
  await adminTab.getByRole('textbox', { name: 'Speaker (Line 2)' }).fill('Arjun')
  await adminTab.getByRole('textbox', { name: 'English (Line 2)' }).fill('I’m from Kolkata.')
  await adminTab.getByRole('button', { name: 'Save changes' }).click()
  await expect(adminTab.getByRole('status')).toContainText('Saved')
  await expectNoHorizontalScroll(adminTab)

  // The learner's open tab turns into the step.
  await expect(heading(learnerTab)).toHaveText('Watch and listen')
  await expect(conversation(learnerTab)).toHaveText([
    'MeeraWhere are you from?',
    'ArjunI’m from Kolkata.',
  ])
  await learnerTab.getByRole('button', { name: 'Play the conversation' }).click()
  await expect(next(learnerTab)).toBeEnabled()

  // Week 1's built-in conversation can be reworded, and put back.
  await adminTab.getByRole('combobox', { name: 'Week' }).selectOption('1')
  await adminTab.getByRole('textbox', { name: 'English (Line 1)' }).fill('Hi! Good morning.')
  await adminTab.getByRole('button', { name: 'Save changes' }).click()
  await expect(adminTab.getByRole('status')).toContainText('Saved')
  await learnerTab.goto('/lessons/weeks/1/days/1')
  await expect(conversation(learnerTab).first()).toContainText('Hi! Good morning.')

  adminTab.once('dialog', (dialog) => dialog.accept())
  await adminTab.getByRole('button', { name: 'Reset to defaults' }).click()
  await expect(conversation(learnerTab).first()).toContainText('Hello! Good morning.')
  await learnerTab.goto('/lessons/weeks/2/days/1')
  await expect(heading(learnerTab)).toHaveText('Week 2 · Day 1')
})
