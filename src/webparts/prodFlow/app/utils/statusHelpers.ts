import { RequestStatus } from "../models";

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
