import type { PlacementEvent, PlacementSession } from './sessionSchema'

/** Everything the test reports about itself. */
export type PlacementEventName =
  | 'placement_started'
  | 'placement_item_viewed'
  | 'placement_audio_played'
  | 'placement_audio_replayed'
  | 'placement_answer_submitted'
  | 'placement_hint_used'
  | 'placement_translation_used'
  | 'placement_speech_started'
  | 'placement_speech_completed'
  | 'placement_item_completed'
  | 'placement_stage_completed'
  | 'placement_completed'
  | 'placement_abandoned'
  | 'placement_resumed'

/** The local log keeps only the most recent events; it is a stand-in, not an archive. */
export const MAX_STORED_EVENTS = 300

/**
 * One event about the session as it stands. Events say what happened and when — never audio,
 * and never what a learner said or typed.
 * TODO(analytics): this is the single place to forward events once there is somewhere to send
 * them; until then they only go into the local log kept by the store.
 */
export function createEvent(
  session: PlacementSession,
  event: PlacementEventName,
  now: string,
): PlacementEvent {
  return {
    event,
    sessionId: session.id,
    itemId: session.currentItemId,
    stage: session.status === 'COMPLETED' ? null : session.stage,
    timestamp: now,
  }
}

export function appendEvents(
  log: readonly PlacementEvent[],
  ...events: PlacementEvent[]
): PlacementEvent[] {
  return [...log, ...events].slice(-MAX_STORED_EVENTS)
}
