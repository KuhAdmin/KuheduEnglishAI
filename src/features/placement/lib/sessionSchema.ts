import { z } from 'zod'
import { STAGES } from '../types'

/**
 * Everything the placement test keeps in browser storage. Storage is untrusted input (an older
 * build, another tab, a curious user), so it is parsed with these schemas before use.
 *
 * The session, its responses and the result are written once, in `@kuhedu/contracts`: the
 * server keeps them with the learner's account in the same shapes. The event log is this
 * browser's only (`TODO(analytics)`).
 */
export {
  placementResponseSchema as responseSchema,
  placementResultSchema as resultSchema,
  placementSessionSchema as sessionSchema,
  type PlacementResponse,
  type PlacementResult,
  type PlacementSession,
  type PlacementSkillResult as SkillResult,
} from '@kuhedu/contracts'

export const eventSchema = z.object({
  event: z.string(),
  sessionId: z.string(),
  itemId: z.string().nullable(),
  stage: z.enum(STAGES).nullable(),
  timestamp: z.string(),
})

export type PlacementEvent = z.infer<typeof eventSchema>
