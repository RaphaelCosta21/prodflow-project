import { RequestStatus } from "../models";
import { TeamKey } from "./teams";

// Quem pode mover cada status (§4 do plano de projeto). Admin ignora esta matriz.
export const REQUEST_STATUS_OWNERS: Record<RequestStatus, TeamKey[]> = {
  Draft: ["projects"],
  Budgeting: ["projects", "planning"],
  BudgetReview: ["planning"],
  Submitted: ["projects"],
  Approved: ["projects"],
  Rejected: ["projects"],
  ReleasedForProduction: ["projects", "planning"],
  InProduction: ["planning", "workshop"],
  FinalInspection: ["quality"],
  Delivered: ["serviceExcellence", "warehouse", "planning"],
  Completed: ["projects"],
  Closed: ["projects"],
  OnHold: ["projects", "planning"],
  Cancelled: ["projects"],
};

export type SubItemAction =
  | "start"
  | "delineation"
  | "quotation"
  | "release"
  | "fabrication"
  | "inspection";

export const SUBITEM_ACTION_OWNERS: Record<SubItemAction, TeamKey[]> = {
  start: ["planning"],
  delineation: ["industrialEngineering"],
  quotation: ["scm", "purchasing"],
  release: ["planning"],
  fabrication: ["workshop"],
  inspection: ["quality"],
};

export function ownersOf(status: RequestStatus): TeamKey[] {
  return REQUEST_STATUS_OWNERS[status] ?? [];
}
