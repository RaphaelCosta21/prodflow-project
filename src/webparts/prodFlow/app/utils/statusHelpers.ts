import { Phase, RequestStatus, WorkflowKind } from "../models";
import { REQUEST_STATUSES } from "../config/statuses";
import { requestTransitionsFor } from "../config/workflows";
import { ownersOf } from "../config/statusOwners";
import { TeamKey } from "../config/teams";

// OnHold/Cancelled are reachable from any non-terminal state.
const TRANSVERSAL: RequestStatus[] = ["OnHold", "Cancelled"];

const TERMINAL: RequestStatus[] = ["Delivered", "Cancelled"];

/** Allowed moves out of `from`. Resuming from OnHold goes back to the exact stored status. */
export function nextRequestStatuses(
  from: RequestStatus,
  flow: WorkflowKind,
  resumeStatus?: RequestStatus,
): RequestStatus[] {
  if (TERMINAL.indexOf(from) >= 0) return [];
  if (from === "OnHold") {
    const resume = resumeStatus ? [resumeStatus] : [];
    return resume.concat("Cancelled");
  }
  const base = requestTransitionsFor(flow)[from] ?? [];
  return base.concat(TRANSVERSAL.filter((s) => s !== from));
}

export function canTransition(
  from: RequestStatus,
  to: RequestStatus,
  flow: WorkflowKind,
  resumeStatus?: RequestStatus,
): boolean {
  return nextRequestStatuses(from, flow, resumeStatus).indexOf(to) >= 0;
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
