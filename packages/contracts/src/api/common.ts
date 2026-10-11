import { z } from 'zod'

/** What a route answers when it has done what was asked and has nothing to say (204). */
export const noContentSchema = z.null()
