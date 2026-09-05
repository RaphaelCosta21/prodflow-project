import { Phase, RequestStatus } from "../models";
import { REQUEST_STATUSES } from "../config/statuses";
import { ownersOf } from "../config/statusOwners";
import { TeamKey } from "../config/teams";

// Allowed FID status transitions (§12.1). OnHold/Cancelled are reachable from any non-terminal state.
const TRANSVERSAL: RequestStatus[] = ["OnHold", "Cancelled"];

export const REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  Draft: ["Budgeting"],
  Budgeting: ["BudgetReview"],
  BudgetReview: ["Submitted", "Budgeting"],
  Submitted: ["Approved", "Rejected"],
  Approved: ["ReleasedForProduction"],
  Rejected: ["Budgeting"],
  ReleasedForProduction: ["InProduction"],
  InProduction: ["FinalInspection"],
  FinalInspection: ["Delivered"],
  Delivered: ["Completed"],
  Completed: ["Closed"],
  Closed: [],
  OnHold: [],
  Cancelled: [],
};

const TERMINAL: RequestStatus[] = ["Closed", "Cancelled"];

export function nextRequestStatuses(from: RequestStatus): RequestStatus[] {
  const base = REQUEST_TRANSITIONS[from] ?? [];
  if (TERMINAL.indexOf(from) >= 0 || from === "OnHold") return base;
  return base.concat(TRANSVERSAL.filter((s) => s !== from));
}

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return nextRequestStatuses(from).indexOf(to) >= 0;
}

export function isTerminalStatus(status: RequestStatus): boolean {
  return TERMINAL.indexOf(status) >= 0;
}

export function phaseOfStatus(status: RequestStatus): Phase | undefined {
  return REQUEST_STATUSES.filter((s) => s.key === status)[0]?.phase;
}

/** RBAC: only the owning team (or an admin) may perform a transition. */
export function canTeamTransition(
  to: RequestStatus,
  teams: TeamKey[],
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  const owners = ownersOf(to);
  if (owners.length === 0) return true;
  return owners.some((o) => teams.indexOf(o) >= 0);
}
