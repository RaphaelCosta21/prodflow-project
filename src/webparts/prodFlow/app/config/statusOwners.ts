import { MakeSite, RequestStatus, Strategy } from "../models";
import { TeamKey } from "./teams";

// Planejamento/Projetos comandam a fase e o status do FID; admin ignora esta matriz.
const FID_OWNERS: TeamKey[] = ["planning", "projects"];

export const REQUEST_STATUS_OWNERS: Record<RequestStatus, TeamKey[]> = {
  InDelineation: FID_OWNERS,
  Submitted: FID_OWNERS,
  Approved: FID_OWNERS,
  Rejected: FID_OWNERS,
  ReleasedForFabrication: FID_OWNERS,
  ReleasedForProcurement: FID_OWNERS,
  InFabrication: FID_OWNERS,
  InProcurement: FID_OWNERS,
  ExternalService: FID_OWNERS,
  Delivered: FID_OWNERS,
  OnHold: FID_OWNERS,
  Cancelled: FID_OWNERS,
};

const BUY_OWNERS: TeamKey[] = ["purchasing", "scm"];
const MAKE_OWNERS: TeamKey[] = ["planning", "industrialEngineering"];

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

/** Compras conduz linhas Buy e Make · SUBCON; Planejamento/Eng. Ind. conduzem o Make in-house. */
export function subItemOwnersOf(
  strategy?: Strategy,
  makeSite?: MakeSite,
): TeamKey[] {
  if (strategy === "Buy") return BUY_OWNERS;
  if (strategy === "Make")
    return makeSite === "Subcon" ? BUY_OWNERS : MAKE_OWNERS;
  return [];
}
