import type { SessionUser } from '@kuhedu/contracts'
import { loadSession, onSigningOut } from '../account/session'
import { useSessionStore } from '../account/useSessionStore'
import { fetchLearnerData } from './api'
import { learnerParts } from './parts'
import { syncRecord } from './syncRecord'
// The parts whose stores are shared; a feature registers its own from beside its store.
import './photoPart'
import './profileFields'
import './progressPart'

/**
 * Keeping what a learner sets and does with their account. **Screens go on reading the stores
 * as before**, and never wait for this: it fills the stores from the account when someone signs
 * in, sends each change they make, and empties the stores when the server says nobody is signed
 * in, so that the next person on the phone starts from their own.
 *
 * | The server says | What is stored here is | Then |
 * | --- | --- | --- |
 * | a learner | an account's | the account's replaces it, save for changes not sent yet |
 * | a learner | nobody's yet | it fills what the account lacks, and becomes the account's |
 * | nobody | an account's | it is cleared |
 * | nobody | nobody's | nothing: a visitor's own choices stay |
 *
 * Whose account it is, is never stored: only that it is one (`syncRecord`).
 */

/** How long a change waits for others before it is sent: an answer, then the next question. */
const SEND_AFTER_MS = 400
/** After a send that failed while there is a connection: when it is tried again. */
const RETRY_AFTER_MS = 30_000
/** The longest signing out waits for what is unsent to go. */
const LEAVE_WAIT_MS = 3_000

/** The learner whose data is being kept, for as long as the page is open. Never stored. */
let whose: string | null = null
/** Done when the account's data is in the stores (or could not be fetched) for `whose`. */
let settling: Promise<void> = Promise.resolve()
/** The account could not be asked yet: what is here has not been brought together with it. */
let unsettled = false
let stopWatching: (() => void) | null = null
let sendTimer: ReturnType<typeof setTimeout> | undefined
let sending: Promise<void> | null = null
let sendAgain = false
let stopFollowing: (() => void) | null = null

/** Send whatever the account has not got. Never throws: what fails is tried again later. */
function sendAll(): Promise<void> {
  if (sending) {
    // Something changed while the last send was on its way: once more when it is back.
    sendAgain = true
    return sending
  }
  sending = (async () => {
    let failed = false
    do {
      sendAgain = false
      for (const part of learnerParts()) {
        try {
          await part.send()
        } catch {
          failed = true
        }
      }
    } while (sendAgain && !failed)
    sending = null
    // With a connection it was the server that did not answer; without one, `online` says when.
    if (failed && whose !== null && navigator.onLine) later(RETRY_AFTER_MS)
  })()
  return sending
}

function later(wait: number) {
  clearTimeout(sendTimer)
  sendTimer = setTimeout(() => {
    if (whose !== null && !unsettled) void sendAll()
  }, wait)
}

function watch() {
  if (stopWatching) return
  const stops = learnerParts().map((part) => part.watch(() => later(SEND_AFTER_MS)))
  stopWatching = () => stops.forEach((stop) => stop())
}

function unwatch() {
  stopWatching?.()
  stopWatching = null
  clearTimeout(sendTimer)
}

function clearAll() {
  for (const part of learnerParts()) part.clear()
  syncRecord.reset()
}

async function settle(): Promise<void> {
  const forWhom = whose
  let account
  try {
    account = await fetchLearnerData()
  } catch {
    // Not now (no connection, no server): the stores stand as they are, and it is asked again.
    unsettled = true
    return
  }
  // They signed out, or someone else signed in, while the account was being asked.
  if (whose !== forWhom) return

  const adopting = !syncRecord.ofAccount()
  for (const part of learnerParts()) {
    try {
      await part.settle(account, { adopting })
    } catch {
      // One part that could not be settled (a photo that would not come) does not stop the rest.
    }
  }
  syncRecord.markOfAccount()
  unsettled = false
  await sendAll()
}

function follow({ loaded, user }: { loaded: boolean; user: SessionUser | null }) {
  if (!loaded) {
    // The server has not said who is signed in (it may be unreachable). What is here is an
    // account's if it was one's before: changes made meanwhile are to be sent, not overwritten.
    if (syncRecord.ofAccount()) watch()
    return
  }
  if (!user) {
    unwatch()
    whose = null
    unsettled = false
    settling = Promise.resolve()
    if (syncRecord.ofAccount()) clearAll()
    return
  }
  // A sign-up whose code is not entered yet has no account: nothing is kept for it, and what
  // the visitor chose on the way in stays.
  if (!user.emailVerified || user.id === whose) return
  // Another account took this browser over with no sign-out between: what is here is not theirs.
  if (whose !== null) clearAll()
  whose = user.id
  watch()
  settling = settle()
}

function onOnline() {
  if (!useSessionStore.getState().loaded) void loadSession()
  else if (whose !== null && unsettled) settling = settle()
  else if (whose !== null) void sendAll()
}

/**
 * Start keeping the learner's data with their account. Called once by the app shell, before it
 * asks who is signed in. Without it (every unit test of a store or a screen) the stores are
 * this browser's alone, as they always were.
 */
export function startLearnerSync() {
  if (stopFollowing) return
  const stopSession = useSessionStore.subscribe(follow)
  const stopLeaving = onSigningOut(sendBeforeLeaving)
  window.addEventListener('online', onOnline)
  stopFollowing = () => {
    stopSession()
    stopLeaving()
    window.removeEventListener('online', onOnline)
  }
  follow(useSessionStore.getState())
}

/** Stop, and forget whose data it was: for tests, which start it afresh. */
export function stopLearnerSync() {
  stopFollowing?.()
  stopFollowing = null
  unwatch()
  whose = null
  unsettled = false
  sending = null
  sendAgain = false
  settling = Promise.resolve()
}

/**
 * Done once the data of whoever is signed in is in the stores, or after `maxMs` at the latest:
 * a server that is slow or cannot be reached must not hold a screen back. For the loader that
 * decides where someone opens the app, which reads how far they got.
 */
export function learnerDataSettled(maxMs: number): Promise<void> {
  let giveUp: ReturnType<typeof setTimeout> | undefined
  const patience = new Promise<void>((resolve) => {
    giveUp = setTimeout(resolve, maxMs)
  })
  return Promise.race([settling, patience]).finally(() => clearTimeout(giveUp))
}

/** Send what is unsent before the browser stops being signed in, for as long as that is worth waiting. */
async function sendBeforeLeaving() {
  if (whose === null) return
  clearTimeout(sendTimer)
  let giveUp: ReturnType<typeof setTimeout> | undefined
  const patience = new Promise<void>((resolve) => {
    giveUp = setTimeout(resolve, LEAVE_WAIT_MS)
  })
  await Promise.race([settling.then(sendAll), patience])
  clearTimeout(giveUp)
}

/** Everything changed here has reached the account. For tests. */
export async function learnerDataSent() {
  clearTimeout(sendTimer)
  await settling
  await sendAll()
}
