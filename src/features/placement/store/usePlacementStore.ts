import { z } from 'zod'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { ASSESSMENT_VERSION, findItem, itemBank } from '../data/itemBank'
import { advance } from '../lib/engine'
import { appendEvents, createEvent, type PlacementEventName } from '../lib/events'
import { buildResult } from '../lib/scoring'
import {
  eventSchema,
  resultSchema,
  sessionSchema,
  type PlacementEvent,
  type PlacementResponse,
  type PlacementResult,
  type PlacementSession,
} from '../lib/sessionSchema'
import type { DeviceType, NotAssessedReason } from '../types'

/** What a question screen reports; the store adds the question's own facts and the verdict. */
export type AnswerInput = Partial<
  Omit<PlacementResponse, 'itemId' | 'stage' | 'level' | 'answeredAt' | 'correct'>
>

type PlacementData = {
  /** The test in progress or just finished; `null` before the first start. */
  session: PlacementSession | null
  /** The latest finished test's outcome. */
  result: PlacementResult | null
  events: PlacementEvent[]
}

type PlacementState = PlacementData & {
  /** Begin a new test, replacing any earlier one. */
  start: (languageSupport: string) => void
  /** The learner has read the current stage's introduction. */
  beginStage: () => void
  /** End the current stage without evidence (no microphone, no audio, or by choice). */
  skipStage: (reason: NotAssessedReason) => void
  submitAnswer: (input: AnswerInput) => void
  track: (event: PlacementEventName) => void
  pause: () => void
  resume: () => void
}

const now = () => new Date().toISOString()

function newSessionId(): string {
  const today = new Date()
  const date = [today.getFullYear(), today.getMonth() + 1, today.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('')
  const random = crypto.getRandomValues(new Uint8Array(3))
  const suffix = Array.from(random, (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 5)
    .toUpperCase()
  return `PL-${date}-${suffix}`
}

function deviceType(): DeviceType {
  const width = window.innerWidth
  return width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop'
}

const isFinished = (session: PlacementSession) =>
  session.status === 'COMPLETED' || session.status === 'ABANDONED'

const emptyAnswer = {
  timeTakenMs: 0,
  answer: null,
  skipped: null,
  playCount: 0,
  slowPlayCount: 0,
  helpOpened: false,
  transcriptShown: false,
  translationOffered: false,
  translationUsed: false,
  modelPlayed: false,
  recordingAttempts: 0,
  recordingDurationMs: 0,
} satisfies AnswerInput

const persistedSchema = z.object({
  session: sessionSchema.nullable().catch(null),
  result: resultSchema.nullable().catch(null),
  events: z.array(eventSchema).catch([]),
})

/** A saved test can only be continued on the questions it was started with. */
function usableSession(session: PlacementSession | null): PlacementSession | null {
  if (!session || isFinished(session)) return session
  const known = (id: string) => findItem(id) !== undefined
  const intact =
    session.version === ASSESSMENT_VERSION &&
    (session.currentItemId === null || known(session.currentItemId)) &&
    session.responses.every((response) => known(response.itemId))
  return intact ? session : null
}

/**
 * The placement test's state, saved in this browser after every change so a closed app, a
 * refresh or a lost connection never costs the learner their answers.
 * TODO(backend): keep sessions and results on the server. TODO(auth): tie them to the learner.
 */
export const usePlacementStore = create<PlacementState>()(
  persist(
    (set, get) => {
      /** Apply a change to the session, logging the events it gives rise to. */
      const update = (
        change: (session: PlacementSession) => PlacementSession,
        ...before: PlacementEventName[]
      ) => {
        const { session, events, result } = get()
        if (!session || isFinished(session)) return

        const time = now()
        const next = change(session)
        const log = before.map((event) => createEvent(session, event, time))
        if (next.stage !== session.stage || next.status === 'COMPLETED') {
          log.push(createEvent(session, 'placement_stage_completed', time))
        }
        if (next.currentItemId && next.currentItemId !== session.currentItemId) {
          log.push(createEvent(next, 'placement_item_viewed', time))
        }
        const completed = next.status === 'COMPLETED'
        if (completed) log.push(createEvent(next, 'placement_completed', time))

        set({
          session: next,
          events: appendEvents(events, ...log),
          result: completed ? buildResult(next, itemBank) : result,
        })
      }

      return {
        session: null,
        result: null,
        events: [],

        start: (languageSupport) => {
          const { session: previous, events } = get()
          const time = now()
          const session: PlacementSession = {
            id: newSessionId(),
            version: ASSESSMENT_VERSION,
            status: 'IN_PROGRESS',
            startedAt: time,
            updatedAt: time,
            completedAt: null,
            languageSupport,
            deviceType: deviceType(),
            stage: 'LISTEN',
            stageStarted: false,
            currentItemId: null,
            responses: [],
            notAssessed: {},
          }
          const abandoned =
            previous && !isFinished(previous)
              ? [createEvent(previous, 'placement_abandoned', time)]
              : []
          set({
            session,
            events: appendEvents(
              events,
              ...abandoned,
              createEvent(session, 'placement_started', time),
            ),
          })
        },

        beginStage: () =>
          update((session) => advance({ ...session, stageStarted: true }, itemBank, now())),

        skipStage: (reason) =>
          update((session) =>
            advance(
              { ...session, notAssessed: { ...session.notAssessed, [session.stage]: reason } },
              itemBank,
              now(),
            ),
          ),

        submitAnswer: (input) =>
          update(
            (session) => {
              const item = findItem(session.currentItemId)
              if (!item) return session

              const answer = { ...emptyAnswer, ...input }
              const time = now()
              const response: PlacementResponse = {
                ...answer,
                itemId: item.id,
                stage: item.stage,
                level: item.level,
                answeredAt: time,
                // Not knowing is "not yet"; a question that could not be played is nothing.
                correct:
                  item.stage === 'SPEAK' || answer.skipped === 'audioFailed'
                    ? null
                    : answer.answer === item.answer,
              }
              return advance(
                { ...session, responses: [...session.responses, response] },
                itemBank,
                time,
              )
            },
            'placement_answer_submitted',
            'placement_item_completed',
          ),

        track: (event) => update((session) => session, event),

        pause: () =>
          update((session) =>
            session.status === 'IN_PROGRESS'
              ? { ...session, status: 'PAUSED', updatedAt: now() }
              : session,
          ),

        resume: () => {
          if (get().session?.status !== 'PAUSED') return
          update(
            (session) => ({ ...session, status: 'IN_PROGRESS', updatedAt: now() }),
            'placement_resumed',
          )
        },
      }
    },
    {
      name: 'kuhedu-placement',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ session, result, events }): PlacementData => ({ session, result, events }),
      merge: (persisted, current) => {
        const saved = persistedSchema.safeParse(persisted ?? {})
        if (!saved.success) return current
        return { ...current, ...saved.data, session: usableSession(saved.data.session) }
      },
    },
  ),
)
