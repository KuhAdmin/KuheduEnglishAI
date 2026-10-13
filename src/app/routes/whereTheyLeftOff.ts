import { redirect } from 'react-router'
import { hasAnsweredAboutThemselves } from '@/features/onboarding'
import { placementProgress } from '@/features/placement'
import { accountStanding } from '@/shared/lib/account'
import { hasLessonProgress } from '@/shared/lib/learner/lessonProgress'
import { paths } from '@/shared/lib/paths'

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
 * step, the only way on. An account: on from where they left off in this browser, or into
 * onboarding with nothing of theirs here (a new account, or their account on a new phone),
 * since nothing of it is kept on the server yet. `TODO(learner)`: once it is, where their
 * account says.
 *
 * An admin who has not used the app as a learner here is let through to the page: it is theirs
 * to edit, and they need to see it.
 */
export async function openWhereTheyLeftOff() {
  const standing = await accountStanding()
  if (standing.account === 'none') return null
  if (standing.account === 'unverified') throw redirect(paths.verifyEmail)

  const place = leftOffAt({
    lessonsBegun: hasLessonProgress(),
    placement: placementProgress(),
    aboutThemAnswered: hasAnsweredAboutThemselves(),
  })
  if (place) throw redirect(place)
  if (standing.user?.role === 'admin') return null
  throw redirect(paths.onboarding)
}
