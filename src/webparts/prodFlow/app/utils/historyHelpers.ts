import {
  IFabricationRequest,
  ISubItem,
  ISubItemStatusHistoryEntry,
  RequestStatus,
  SubItemStatus,
} from "../models";
import { TeamKey } from "../config/teams";
import { phaseOfStatus } from "./statusHelpers";
import { calcDurationHours } from "./durationHelpers";

function closeOpen<
  T extends { end?: string; durationHours?: number; start: string },
>(entries: T[], when: string): T[] {
  return entries.map((e, i) =>
    i === entries.length - 1 && !e.end
      ? { ...e, end: when, durationHours: calcDurationHours(e.start, when) }
      : e,
  );
}

/** Closes the open status interval and opens a new one, keeping the phase timeline in sync. */
export function pushStatusHistory(
  draft: IFabricationRequest,
  to: RequestStatus,
  actor: string,
  when: string,
): void {
  const phase = phaseOfStatus(to) ?? draft.phase;

  const statusHistory = closeOpen(draft.statusHistory ?? [], when);
  draft.statusHistory = statusHistory.concat({
    id: statusHistory.length + 1,
    status: to,
    phase,
    start: when,
    actor,
  });

  const phaseHistory = draft.phaseHistory ?? [];
  const currentPhase = phaseHistory[phaseHistory.length - 1];
  if (!currentPhase || currentPhase.phase !== phase) {
    draft.phaseHistory = closeOpen(phaseHistory, when).concat({
      id: phaseHistory.length + 1,
      phase,
      start: when,
      actor,
    });
  }
  draft.phase = phase;
}

export function pushSubItemStatusHistory(
  subItem: ISubItem,
  to: SubItemStatus,
  actor: string,
  when: string,
  team?: TeamKey,
): ISubItemStatusHistoryEntry[] {
  const history = closeOpen(subItem.statusHistory ?? [], when);
  const next: ISubItemStatusHistoryEntry = {
    id: history.length + 1,
    status: to,
    team,
    start: when,
    actor,
  };
  return history.concat(next);
}

/** Duration of a timeline entry; open intervals measure up to `now` (or the frozen time). */
export function entryDurationHours(
  entry: { start: string; end?: string; durationHours?: number },
  frozenTime?: number,
): number {
  if (entry.durationHours !== undefined) return entry.durationHours;
  if (entry.end) return calcDurationHours(entry.start, entry.end);
  const ref = frozenTime ?? Date.now();
  return Math.max(0, (ref - new Date(entry.start).getTime()) / 3600000);
}
