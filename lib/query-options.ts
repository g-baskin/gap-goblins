/**
 * Shared React Query option presets.
 *
 * Spread these into `useQuery` options to keep polling and staleness behavior
 * consistent across admin screens.
 */

export const REALTIME = {
  staleTime: 0,
  refetchInterval: 5_000,
} as const;

export const POLL_30S = {
  staleTime: 25_000,
  refetchInterval: 30_000,
} as const;

export const POLL_60S = {
  staleTime: 50_000,
  refetchInterval: 60_000,
} as const;

export const STATIC = {
  staleTime: 5 * 60_000,
  gcTime: 10 * 60_000,
} as const;
