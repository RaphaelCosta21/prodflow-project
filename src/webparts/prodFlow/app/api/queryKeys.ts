// Stable query keys for TanStack Query (server-state cache).
export const queryKeys = {
  fids: ["fids"] as const,
  fid: (fid: string) => ["fid", fid] as const,
  config: ["config"] as const,
};
