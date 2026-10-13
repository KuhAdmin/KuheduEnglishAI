import { placementSaveSchema } from '@kuhedu/contracts'
import { isRefusedForGood, savePlacement } from '@/shared/lib/learnerData/api'
import { registerLearnerPart } from '@/shared/lib/learnerData/parts'
import type { PlacementSession } from '../lib/sessionSchema'
import { usableSession, usePlacementStore } from './usePlacementStore'

/** A test as it stood at one moment: the same test saved later is another stamp. */
const stampOf = (session: PlacementSession) => `${session.id}@${session.updatedAt}`

const later = (one: string, other: string) => Date.parse(one) > Date.parse(other)

// What the account is known to hold of the test here, for as long as the page is open.
let held: string | null = null

/**
 * The placement test, kept with the learner's account. Between a phone and the account, **the
 * test touched later is the one that stands**, and a result is the latest one finished: a test
 * begun on one phone can be finished on another, and a level, once there is one, follows the
 * learner.
 *
 * The event log is not kept there (`TODO(analytics)`): it stays in this browser and goes with it.
 * `TODO(placement)`: a result whose own test has since been replaced by a new one here cannot be
 * sent, because the server keeps a result with its test.
 */
registerLearnerPart({
  name: 'placement',

  settle(account) {
    const { session: theirs, result: theirResult } = account.placement
    const { session: ours, result: ourResult } = usePlacementStore.getState()
    held = theirs ? stampOf(theirs) : null

    const next: Partial<Pick<ReturnType<typeof usePlacementStore.getState>, 'session' | 'result'>> =
      {}
    if (theirs && (!ours || later(theirs.updatedAt, ours.updatedAt))) {
      // One begun on a question bank this build no longer has cannot be gone on with.
      const usable = usableSession(theirs)
      if (usable) next.session = usable
    }
    if (theirResult && (!ourResult || later(theirResult.completedAt, ourResult.completedAt))) {
      next.result = theirResult
    }
    if (Object.keys(next).length > 0) usePlacementStore.setState(next)
  },

  async send() {
    const { session, result } = usePlacementStore.getState()
    if (!session || stampOf(session) === held) return
    const stamp = stampOf(session)
    const save = placementSaveSchema.safeParse({
      session,
      // A result travels with the finished test it is the result of.
      result: session.status === 'COMPLETED' && result?.sessionId === session.id ? result : null,
    })
    // Not something the server keeps (a test from an older build): it stays here only.
    if (save.success) {
      try {
        await savePlacement(save.data)
      } catch (error) {
        // Finished already as far as the account knows, or not a test it will take.
        if (!isRefusedForGood(error)) throw error
      }
    }
    held = stamp
  },

  watch: (changed) =>
    usePlacementStore.subscribe((state, previous) => {
      if (state.session !== previous.session || state.result !== previous.result) changed()
    }),

  clear() {
    held = null
    usePlacementStore.setState({ session: null, result: null, events: [] })
  },
})
