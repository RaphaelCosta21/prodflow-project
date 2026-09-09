import { Phase, RequestStatus, SubItemStatus, WorkflowKind } from "../models";
import { StrategyKey } from "./strategyOptions";

// Default seed colors — the runtime source of truth is useStatusColors()/useConfigStore (config-driven).
// Components must NOT read these hex values directly; they exist only as fallback config defaults.
export interface IStatusDef<T> {
  key: T;
  label: string;
  color: string;
  phase?: Phase;
  terminal?: boolean;
  /** Workflows the status belongs to; omitted = both. */
  flows?: WorkflowKind[];
}

export interface ISubItemStatusDef extends IStatusDef<SubItemStatus> {
  /** Make/buy strategies the status applies to; omitted = all. */
  strategies?: StrategyKey[];
}

const BUY_KEYS: StrategyKey[] = ["buyRaw", "buyCommercial"];
const MAKE_KEYS: StrategyKey[] = ["makeInHouse", "makeSubcon"];

export const REQUEST_STATUSES: IStatusDef<RequestStatus>[] = [
  {
    key: "InDelineation",
    label: "Em Delineamento",
    color: "#0a58ca",
    phase: 1,
  },
  {
    key: "Submitted",
    label: "Enviado à Petrobras",
    color: "#0ea5e9",
    phase: 1,
  },
  { key: "Approved", label: "Aprovado", color: "#10b981", phase: 1 },
  { key: "Rejected", label: "Reprovado", color: "#ef4444", phase: 1 },
  {
    key: "ReleasedForFabrication",
    label: "Liberado p/ Fabricação",
    color: "#14b8a6",
    phase: 1,
    flows: ["fabrication"],
  },
  {
    key: "ReleasedForProcurement",
    label: "Liberado p/ Compras",
    color: "#14b8a6",
    phase: 1,
    flows: ["parts"],
  },
  {
    key: "InFabrication",
    label: "Em Fabricação",
    color: "#f59e0b",
    phase: 2,
    flows: ["fabrication"],
  },
  {
    key: "InProcurement",
    label: "Em Compras",
    color: "#f59e0b",
    phase: 2,
    flows: ["parts"],
  },
  {
    key: "ExternalService",
    label: "Serviço Externo",
    color: "#8b5cf6",
    phase: 2,
  },
  {
    key: "Delivered",
    label: "Entregue",
    color: "#10b981",
    phase: 2,
    terminal: true,
  },
  { key: "OnHold", label: "Paralisado", color: "#f59e0b" },
  { key: "Cancelled", label: "Cancelado", color: "#ef4444", terminal: true },
];

export const SUB_ITEM_STATUSES: ISubItemStatusDef[] = [
  { key: "NotStarted", label: "Não iniciado", color: "#64748b", phase: 1 },
  {
    key: "InQuotation",
    label: "Em Cotação",
    color: "#0284c7",
    phase: 1,
    strategies: BUY_KEYS,
  },
  {
    key: "Quoted",
    label: "Cotado",
    color: "#0ea5e9",
    phase: 1,
    strategies: BUY_KEYS,
  },
  {
    key: "FabDelineation",
    label: "Delineamento de Fab.",
    color: "#0284c7",
    phase: 1,
    strategies: MAKE_KEYS,
    flows: ["fabrication"],
  },
  {
    key: "Delineated",
    label: "Delineado",
    color: "#0ea5e9",
    phase: 1,
    strategies: MAKE_KEYS,
    flows: ["fabrication"],
  },
  {
    key: "WaitingMaterial",
    label: "Aguardando Material",
    color: "#f59e0b",
    phase: 2,
    strategies: BUY_KEYS,
  },
  {
    key: "InStock",
    label: "Em Estoque",
    color: "#14b8a6",
    phase: 2,
    strategies: BUY_KEYS,
  },
  {
    key: "InFabrication",
    label: "Em Fabricação",
    color: "#f59e0b",
    phase: 2,
    strategies: MAKE_KEYS,
    flows: ["fabrication"],
  },
  {
    key: "ExternalService",
    label: "Serviço Externo",
    color: "#8b5cf6",
    phase: 2,
    strategies: ["makeSubcon"],
    flows: ["fabrication"],
  },
  { key: "InInspection", label: "Em Inspeção", color: "#8b5cf6", phase: 2 },
  {
    key: "Completed",
    label: "Concluído",
    color: "#10b981",
    phase: 2,
    terminal: true,
  },
  { key: "OnHold", label: "Paralisado", color: "#f59e0b", phase: 2 },
];

export const REQUEST_STATUS_MAP: Record<
  RequestStatus,
  IStatusDef<RequestStatus>
> = REQUEST_STATUSES.reduce(
  (acc, s) => {
    acc[s.key] = s;
    return acc;
  },
  {} as Record<RequestStatus, IStatusDef<RequestStatus>>,
);

export const SUB_ITEM_STATUS_MAP: Record<SubItemStatus, ISubItemStatusDef> =
  SUB_ITEM_STATUSES.reduce(
    (acc, s) => {
      acc[s.key] = s;
      return acc;
    },
    {} as Record<SubItemStatus, ISubItemStatusDef>,
  );
