import { z } from 'zod'

/** `GET /api/health`: the server answers, and whether it can reach its database. */
export const healthSchema = z.object({
  status: z.literal('ok'),
  database: z.enum(['ok', 'down']),
  time: z.string(),
})

export type Health = z.infer<typeof healthSchema>
