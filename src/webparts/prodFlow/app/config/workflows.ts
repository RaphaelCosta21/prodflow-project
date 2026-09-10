import {
  ISubItem,
  MakeSite,
  Phase,
  RequestStatus,
  Strategy,
  SubItemStatus,
  WorkflowKind,
} from "../models";
import { PARTS_BUDGET_TYPE } from "./appConfigDefaults";

// The budget type picked at FID creation decides the whole workflow. Anything that is not
// "Partes e Peças" (including admin-defined types) follows the fabrication flow.
export function workflowOf(tipoOrcamento?: string): WorkflowKind {
  return tipoOrcamento === PARTS_BUDGET_TYPE ? "parts" : "fabrication";
}

const FABRICATION_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  InDelineation: ["Submitted"],
  Submitted: ["Approved", "Rejected"],
  Approved: ["ReleasedForFabrication"],
  Rejected: ["InDelineation"],
  ReleasedForFabrication: ["InFabrication"],
  InFabrication: ["ExternalService", "Delivered"],
  ExternalService: ["InFabrication", "Delivered"],
  ReleasedForProcurement: [],
  InProcurement: [],
  Delivered: [],
  OnHold: [],
  Cancelled: [],
};

const PARTS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  InDelineation: ["Submitted"],
  Submitted: ["Approved", "Rejected"],
  Approved: ["ReleasedForProcurement"],
  Rejected: ["InDelineation"],
  ReleasedForProcurement: ["InProcurement"],
  InProcurement: ["ExternalService", "Delivered"],
  ExternalService: ["InProcurement", "Delivered"],
  ReleasedForFabrication: [],
  InFabrication: [],
  Delivered: [],
  OnHold: [],
  Cancelled: [],
};

export function requestTransitionsFor(
  flow: WorkflowKind,
): Record<RequestStatus, RequestStatus[]> {
  return flow === "parts" ? PARTS_TRANSITIONS : FABRICATION_TRANSITIONS;
}

/** Statuses reachable in a workflow, in pipeline order (transversals last). */
export function requestStatusesFor(flow: WorkflowKind): RequestStatus[] {
  const ordered: RequestStatus[] =
    flow === "parts"
      ? [
          "InDelineation",
          "Submitted",
          "Approved",
          "Rejected",
          "ReleasedForProcurement",
          "InProcurement",
          "ExternalService",
          "Delivered",
        ]
      : [
          "InDelineation",
          "Submitted",
          "Approved",
          "Rejected",
          "ReleasedForFabrication",
          "InFabrication",
          "ExternalService",
          "Delivered",
        ];
  return ordered.concat(["OnHold", "Cancelled"]);
}

/** The status that starts phase 2 in each workflow. */
export function executionStatusOf(flow: WorkflowKind): RequestStatus {
  return flow === "parts" ? "InProcurement" : "InFabrication";
}

const BUY_PHASE1: SubItemStatus[] = ["NotStarted", "InQuotation", "Quoted"];
const BUY_PHASE2: SubItemStatus[] = [
  "WaitingMaterial",
  "InStock",
  "InInspection",
  "Completed",
  "OnHold",
];
const MAKE_PHASE1: SubItemStatus[] = [
  "NotStarted",
  "FabDelineation",
  "Delineated",
];
const MAKE_PHASE2: SubItemStatus[] = [
  "InFabrication",
  "InInspection",
  "Completed",
  "OnHold",
];

// Buy behaves the same in both workflows; Make only exists in fabrication.
// Make · SUBCON é fabricação externa: na fase 1 quem cota é Compras, não a Eng. Industrial.
export function allowedSubItemStatuses(
  strategy: Strategy | undefined,
  makeSite: MakeSite | undefined,
  phase: Phase,
): SubItemStatus[] {
  if (!strategy || strategy === "NA") return ["NotStarted"];
  if (strategy === "Buy") return phase === 1 ? BUY_PHASE1 : BUY_PHASE2;
  if (phase === 1) return makeSite === "Subcon" ? BUY_PHASE1 : MAKE_PHASE1;
  return makeSite === "Subcon"
    ? MAKE_PHASE2.concat("ExternalService")
    : MAKE_PHASE2;
}

/** First status of a phase for a given strategy — used when routing and on go-live. */
export function initialSubItemStatus(
  strategy: Strategy | undefined,
  makeSite: MakeSite | undefined,
  phase: Phase,
): SubItemStatus {
  return allowedSubItemStatuses(strategy, makeSite, phase)[0];
}

/** Phase-1 costing is done: Buy is quoted, Make is delineated. */
export function isSubItemCosted(status: SubItemStatus): boolean {
  return status === "Quoted" || status === "Delineated";
}

type SubItemRoute = Pick<ISubItem, "strategy" | "makeSite">;

/** Fabricado na base — único caso que passa pelo delineamento interno da Eng. Industrial. */
export function isInternalMake(item: SubItemRoute): boolean {
  return item.strategy === "Make" && item.makeSite !== "Subcon";
}

/** Comprado ou fabricado fora — vai para a fila de cotação de Compras/SCM. */
export function isQuotedRoute(item: SubItemRoute): boolean {
  return (
    item.strategy === "Buy" ||
    (item.strategy === "Make" && item.makeSite === "Subcon")
  );
}
