const MS_PER_HOUR = 1000 * 60 * 60;

export function calcDurationHours(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / MS_PER_HOUR;
}

export function calcElapsedDays(start?: string, until?: number): number {
  if (!start) return 0;
  const ms = (until ?? Date.now()) - new Date(start).getTime();
  return Math.max(0, Math.floor(ms / (MS_PER_HOUR * 24)));
}

export function formatDurationFromHours(hours: number): string {
  if (!isFinite(hours) || hours <= 0) return "0h";
  const days = Math.floor(hours / 24);
  const rest = Math.floor(hours % 24);
  if (days > 0) return rest > 0 ? `${days}d ${rest}h` : `${days}d`;
  if (hours >= 1) return `${Math.floor(hours)}h`;
  return `${Math.max(1, Math.round(hours * 60))}min`;
}

/** Contador ao vivo (d/h/m/s) usado nos cartões de Cronograma. */
export function formatLiveElapsed(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));
  if (days > 0) return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
