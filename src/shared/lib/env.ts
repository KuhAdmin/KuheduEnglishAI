import { z } from 'zod'

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default('/api'),

  /**
   * The app's Google sign-in id, which is public. Here it only says that the server is set up
   * for Google (it has the id and the secret): without it "Continue with Google" says it is
   * not available.
   */
  VITE_GOOGLE_CLIENT_ID: z.string().min(1).optional(),
})

export const env = envSchema.parse(import.meta.env)
