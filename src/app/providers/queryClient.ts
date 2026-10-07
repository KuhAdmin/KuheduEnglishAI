import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/lib/api/client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // Serve cached data while offline instead of pausing; refetch when back online.
      networkMode: 'offlineFirst',
      // Client errors won't fix themselves on retry.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) &&
        failureCount < 2,
    },
    mutations: { networkMode: 'offlineFirst' },
  },
})
