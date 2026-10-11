import { z } from 'zod'

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default('/api'),

  /**
   * The app's Google sign-in id. It is public (Google's own script needs it in the page);
   * without it "Continue with Google" says it is not available. The server has the same id.
   */
  VITE_GOOGLE_CLIENT_ID: z.string().min(1).optional(),
})

export const env = envSchema.parse(import.meta.env)
