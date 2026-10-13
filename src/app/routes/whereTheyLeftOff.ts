import { redirect } from 'react-router'
import { hasAnsweredAboutThemselves } from '@/features/onboarding'
import { placementProgress } from '@/features/placement'
import { accountStanding } from '@/shared/lib/account'
import { hasLessonProgress } from '@/shared/lib/learner/lessonProgress'
import { learnerDataSettled } from '@/shared/lib/learnerData/learnerSync'
import { paths } from '@/shared/lib/paths'

/**
 * How long the front door waits for a learner's account to say how far they got, before it goes
 * by what this browser holds. Longer than for who is signed in: on a new phone the browser holds
 * nothing, and deciding too soon sends someone who is weeks in back through onboarding.
 */
const LEARNER_WAIT_MS = 4000

/** What this browser already holds of a learner. All of it empty: nobody has begun here. */
export type Footprint = {
  /** Anything in the lessons was heard or finished. */
  lessonsBegun: boolean
  placement: 'none' | 'started' | 'done'
  /** Onboarding's question about themselves has its answer. */
  aboutThemAnswered: boolean
}

/**
 * Where someone who was here before goes on from, or `null` for someone who was not. The
 * furthest thing they did decides: the journey once it is open to them, else the test they are
 * in the middle of, else the step of onboarding after the last one they answered.
 *
 * The language is not asked about: it can be chosen on the landing page itself, so a visitor who
 * only did that has not begun.
 */
export function leftOffAt({
  lessonsBegun,
  placement,
  aboutThemAnswered,
}: Footprint): string | null {
  if (lessonsBegun || placement === 'done') return paths.home
  if (placement === 'started') return paths.placementTest
  if (aboutThemAnswered) return paths.onboardingPlacement
  return null
}

/**
 * Route loader for the landing page, which is for someone without an account: a first visit, or
 * a browser that is signed out. It is also the address the installed app opens at, so without
 * this a learner met the pitch each time they opened it.
 *
 * There are no guests, so who is signed in decides, and the server says who (it was asked as
 * the app started; `accountStanding` does not wait long for it, and offline goes by this browser
 * having been signed in). Nobody: the page. A sign-up whose code was never entered: the code
 * step, the only way on. An account: on from where they left off, or into onboarding when they
 * have not begun. How far they got is kept with their account and is in this browser's stores
 * once it has been fetched, which this waits for (`learnerDataSettled`), so their account on a
 * new phone opens where they were. With the server unreachable it is what this browser holds.
 *
 * An admin who has not used the app as a learner here is let through to the page: it is theirs
 * to edit, and they need to see it.
 */
export async function openWhereTheyLeftOff() {
  const standing = await accountStanding()
  if (standing.account === 'none') return null
  if (standing.account === 'unverified') throw redirect(paths.verifyEmail)
  // Only when the server said who it is: offline there is nothing to wait for.
  if (standing.user) await learnerDataSettled(LEARNER_WAIT_MS)

  const place = leftOffAt({
    lessonsBegun: hasLessonProgress(),
    placement: placementProgress(),
    aboutThemAnswered: hasAnsweredAboutThemselves(),
  })
  if (place) throw redirect(place)
  if (standing.user?.role === 'admin') return null
  throw redirect(paths.onboarding)
}
