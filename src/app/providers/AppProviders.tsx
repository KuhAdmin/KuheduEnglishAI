import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AppLanguageProvider } from '@/shared/lib/i18n'
import { queryClient } from './queryClient'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppLanguageProvider>{children}</AppLanguageProvider>
    </QueryClientProvider>
  )
}
