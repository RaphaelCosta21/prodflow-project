import { QueryClient } from "@tanstack/react-query";

// TanStack Query v4 is the only door to remote data (server-state).
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
