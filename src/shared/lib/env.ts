import { z } from 'zod'

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default('/api'),

  // Local admin sign-in — for testing while there is no backend. See features/auth/lib/localAdmin.
  VITE_LOCAL_ADMIN: z.enum(['true', 'false']).default('true'),
  VITE_LOCAL_ADMIN_USERNAME: z.string().min(1).default('admin'),
  VITE_LOCAL_ADMIN_PASSWORD: z.string().min(1).default('Kuhedu@123'),
})

export const env = envSchema.parse(import.meta.env)
