import {
  IFabricationRequest,
  ISubItem,
  ISubItemStatusHistoryEntry,
  RequestStatus,
  SubItemStatus,
} from "../models";
import { TeamKey } from "../config/teams";
import { REQUEST_STATUS_MAP, SUB_ITEM_STATUS_MAP } from "../config/statuses";
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
  note?: string,
): void {
  const phase = phaseOfStatus(to) ?? draft.phase;
  const from = draft.status;

  const statusHistory = closeOpen(draft.statusHistory ?? [], when);
  draft.statusHistory = statusHistory.concat({
    id: statusHistory.length + 1,
    status: to,
    from: from === to ? undefined : from,
    phase,
    start: when,
    actor,
    note,
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
  note?: string,
): ISubItemStatusHistoryEntry[] {
  const history = closeOpen(subItem.statusHistory ?? [], when);
  const next: ISubItemStatusHistoryEntry = {
    id: history.length + 1,
    status: to,
    from: subItem.status === to ? undefined : subItem.status,
    team,
    start: when,
    actor,
    note,
  };
  return history.concat(next);
}

/**
 * Single entry point for every FID status change: timeline, phase sync, hold/resume bookkeeping
 * and activity log. Never assign `draft.status` directly.
 */
export function recordStatusChange(
  draft: IFabricationRequest,
  to: RequestStatus,
  actor: string,
  note?: string,
  whenISO?: string,
): void {
  const when = whenISO ?? new Date().toISOString();
  const from = draft.status;
  if (from === to) return;

  const fromLabel = REQUEST_STATUS_MAP[from]?.label ?? from;
  const toLabel = REQUEST_STATUS_MAP[to]?.label ?? to;

  if (to === "OnHold") draft.resumeStatus = from;
  else if (from === "OnHold") draft.resumeStatus = undefined;

  pushStatusHistory(draft, to, actor, when, note);
  draft.status = to;
  draft.history.push({
    ts: when,
    by: actor,
    type: `status:${to}`,
    message: note
      ? `${fromLabel} → ${toLabel} — ${note}`
      : `${fromLabel} → ${toLabel}`,
  });
}

/** Same contract as `recordStatusChange`, for a single BOM line. */
export function recordSubItemStatusChange(
  draft: IFabricationRequest,
  subItem: ISubItem,
  to: SubItemStatus,
  actor: string,
  team?: TeamKey,
  note?: string,
  whenISO?: string,
): void {
  const when = whenISO ?? new Date().toISOString();
  const from = subItem.status;
  if (from === to) return;

  const fromLabel = SUB_ITEM_STATUS_MAP[from]?.label ?? from;
  const toLabel = SUB_ITEM_STATUS_MAP[to]?.label ?? to;

  if (to === "OnHold") subItem.resumeStatus = from;
  else if (from === "OnHold") subItem.resumeStatus = undefined;

  subItem.statusHistory = pushSubItemStatusHistory(
    subItem,
    to,
    actor,
    when,
    team,
    note,
  );
  subItem.status = to;
  if (team) subItem.ownerTeam = team;
  draft.history.push({
    ts: when,
    by: actor,
    type: `subitem:status`,
    message: note
      ? `${subItem.pn}: ${fromLabel} → ${toLabel} — ${note}`
      : `${subItem.pn}: ${fromLabel} → ${toLabel}`,
  });
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
