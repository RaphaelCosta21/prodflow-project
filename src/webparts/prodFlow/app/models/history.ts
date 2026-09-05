import { TeamKey } from "../config/teams";
import { Phase, RequestStatus, SubItemStatus } from "./enums";

// Timeline entries leave `end` unset for the current step so the UI can render a
// live timer; `durationHours` is frozen when the interval closes.
export interface IPhaseHistoryEntry {
  id: number;
  phase: Phase;
  start: string;
  end?: string;
  durationHours?: number;
  actor: string;
}

export interface IStatusHistoryEntry {
  id: number;
  status: RequestStatus;
  phase: Phase;
  start: string;
  end?: string;
  durationHours?: number;
  actor: string;
}

export interface ISubItemStatusHistoryEntry {
  id: number;
  status: SubItemStatus;
  team?: TeamKey;
  start: string;
  end?: string;
  durationHours?: number;
  actor: string;
}
