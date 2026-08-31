import { Phase, RequestStatus, SubItemStatus } from "../models";

// Default seed colors — the runtime source of truth is useStatusColors()/useConfigStore (config-driven).
// Components must NOT read these hex values directly; they exist only as fallback config defaults.
export interface IStatusDef<T> {
  key: T;
  label: string;
  color: string;
  phase?: Phase;
  terminal?: boolean;
}

export const REQUEST_STATUSES: IStatusDef<RequestStatus>[] = [
  { key: "Draft", label: "Rascunho", color: "#64748b" },
  { key: "Budgeting", label: "Orçamentação", color: "#0a58ca", phase: 1 },
  {
    key: "BudgetReview",
    label: "Revisão de Orçamento",
    color: "#0284c7",
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
    key: "ReleasedForProduction",
    label: "Liberado p/ Produção",
    color: "#14b8a6",
    phase: 2,
  },
  { key: "InProduction", label: "Em Produção", color: "#f59e0b", phase: 2 },
  {
    key: "FinalInspection",
    label: "Inspeção Final",
    color: "#8b5cf6",
    phase: 2,
  },
  { key: "Delivered", label: "Entregue", color: "#10b981", phase: 2 },
  {
    key: "Completed",
    label: "Concluído",
    color: "#10b981",
    phase: 2,
    terminal: true,
  },
  { key: "Closed", label: "Encerrado", color: "#64748b", terminal: true },
  { key: "OnHold", label: "Paralisado", color: "#f59e0b" },
  { key: "Cancelled", label: "Cancelado", color: "#ef4444", terminal: true },
];

export const SUB_ITEM_STATUSES: IStatusDef<SubItemStatus>[] = [
  { key: "NotStarted", label: "Não iniciado", color: "#64748b" },
  { key: "Strategy", label: "Estratégia", color: "#0a58ca", phase: 1 },
  {
    key: "WaitingDelineation",
    label: "Aguardando Delineamento",
    color: "#0284c7",
    phase: 1,
  },
  {
    key: "WaitingQuotation",
    label: "Aguardando Cotação",
    color: "#0284c7",
    phase: 1,
  },
  { key: "Costed", label: "Custeado", color: "#0ea5e9", phase: 1 },
  {
    key: "WaitingRelease",
    label: "Aguardando Liberação",
    color: "#64748b",
    phase: 2,
  },
  { key: "InProcurement", label: "Em Compras", color: "#f59e0b", phase: 2 },
  {
    key: "WaitingMaterial",
    label: "Aguardando Material",
    color: "#f59e0b",
    phase: 2,
  },
  { key: "InFabrication", label: "Em Fabricação", color: "#f59e0b", phase: 2 },
  { key: "Subcontracted", label: "Subcontratado", color: "#8b5cf6", phase: 2 },
  { key: "InInspection", label: "Em Inspeção", color: "#8b5cf6", phase: 2 },
  { key: "ReadyInStock", label: "Em Estoque", color: "#14b8a6", phase: 2 },
  { key: "InAssembly", label: "Em Montagem", color: "#0a58ca", phase: 2 },
  {
    key: "Completed",
    label: "Concluído",
    color: "#10b981",
    phase: 2,
    terminal: true,
  },
  { key: "OnHold", label: "Paralisado", color: "#f59e0b" },
  { key: "Cancelled", label: "Cancelado", color: "#ef4444", terminal: true },
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

export const SUB_ITEM_STATUS_MAP: Record<
  SubItemStatus,
  IStatusDef<SubItemStatus>
> = SUB_ITEM_STATUSES.reduce(
  (acc, s) => {
    acc[s.key] = s;
    return acc;
  },
  {} as Record<SubItemStatus, IStatusDef<SubItemStatus>>,
);
