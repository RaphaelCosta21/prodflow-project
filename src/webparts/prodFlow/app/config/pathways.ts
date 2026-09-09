import { TeamKey } from "./teams";
import { StrategyKey } from "./strategyOptions";
import { SubItemStatus } from "../models";

// Routing per sub-item strategy (§7.4): each step → the responsible team. Derived from the make/buy choice.
export interface IPathwayStep {
  label: string;
  team: TeamKey;
}

export const PATHWAYS: Record<StrategyKey, IPathwayStep[]> = {
  buyRaw: [
    { label: "Estratégia", team: "planning" },
    { label: "Cotação", team: "scm" },
    { label: "RC/PO", team: "purchasing" },
    { label: "Recebimento", team: "warehouse" },
    { label: "Inspeção", team: "quality" },
    { label: "Estoque", team: "warehouse" },
  ],
  buyCommercial: [
    { label: "Estratégia", team: "planning" },
    { label: "Cotação", team: "scm" },
    { label: "RC/PO", team: "purchasing" },
    { label: "Recebimento", team: "warehouse" },
    { label: "Estoque", team: "warehouse" },
  ],
  makeInHouse: [
    { label: "Estratégia", team: "planning" },
    { label: "Delineamento", team: "industrialEngineering" },
    { label: "Abertura de WO", team: "planning" },
    { label: "Fabricação", team: "workshop" },
    { label: "Inspeção/Databook", team: "quality" },
    { label: "Serialização/MPT", team: "serviceExcellence" },
  ],
  makeSubcon: [
    { label: "Estratégia", team: "planning" },
    { label: "Cotação", team: "scm" },
    { label: "RC/PO", team: "purchasing" },
    { label: "Fabricação externa", team: "machining" },
    { label: "Inspeção", team: "quality" },
    { label: "Recebimento", team: "warehouse" },
  ],
  // Linha pai: o roteiro real acontece nos filhos.
  na: [{ label: "Estratégia", team: "planning" }],
};

// Where each status sits on its strategy's pathway.
const STEP_BY_STRATEGY: Record<
  StrategyKey,
  Partial<Record<SubItemStatus, number>>
> = {
  buyRaw: {
    NotStarted: 0,
    InQuotation: 1,
    Quoted: 2,
    WaitingMaterial: 3,
    InInspection: 4,
    InStock: 5,
    Completed: 5,
  },
  buyCommercial: {
    NotStarted: 0,
    InQuotation: 1,
    Quoted: 2,
    WaitingMaterial: 3,
    InInspection: 3,
    InStock: 4,
    Completed: 4,
  },
  makeInHouse: {
    NotStarted: 0,
    FabDelineation: 1,
    Delineated: 2,
    InFabrication: 3,
    InInspection: 4,
    Completed: 5,
  },
  makeSubcon: {
    NotStarted: 0,
    FabDelineation: 1,
    Delineated: 2,
    InFabrication: 3,
    ExternalService: 3,
    InInspection: 4,
    Completed: 5,
  },
  na: { NotStarted: 0 },
};

export function pathwayStepOf(
  strategyKey: StrategyKey,
  status: SubItemStatus,
): number {
  return STEP_BY_STRATEGY[strategyKey]?.[status] ?? 0;
}
