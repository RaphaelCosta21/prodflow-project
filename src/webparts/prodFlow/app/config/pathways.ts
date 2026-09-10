import { TeamKey } from "./teams";
import { StrategyKey } from "./strategyOptions";
import { Phase, SubItemStatus } from "../models";

// Routing per sub-item strategy (§7.4): each step → the responsible team. Derived from the make/buy choice.
export interface IPathwayStep {
  label: string;
  team: TeamKey;
  /** 1 = Orçamentação · 2 = Fabricação & Entrega. */
  phase: Phase;
}

export const PATHWAYS: Record<StrategyKey, IPathwayStep[]> = {
  buyRaw: [
    { label: "Estratégia", team: "planning", phase: 1 },
    { label: "Cotação", team: "scm", phase: 1 },
    { label: "RC/PO", team: "purchasing", phase: 2 },
    { label: "Recebimento", team: "warehouse", phase: 2 },
    { label: "Inspeção", team: "quality", phase: 2 },
    { label: "Estoque", team: "warehouse", phase: 2 },
  ],
  buyCommercial: [
    { label: "Estratégia", team: "planning", phase: 1 },
    { label: "Cotação", team: "scm", phase: 1 },
    { label: "RC/PO", team: "purchasing", phase: 2 },
    { label: "Recebimento", team: "warehouse", phase: 2 },
    { label: "Estoque", team: "warehouse", phase: 2 },
  ],
  makeInHouse: [
    { label: "Estratégia", team: "planning", phase: 1 },
    { label: "Delineamento", team: "industrialEngineering", phase: 1 },
    { label: "Abertura de WO", team: "planning", phase: 2 },
    { label: "Fabricação", team: "workshop", phase: 2 },
    { label: "Inspeção/Databook", team: "quality", phase: 2 },
    { label: "Serialização/MPT", team: "serviceExcellence", phase: 2 },
  ],
  // Fabricação externa é cotada por Compras na fase 1, como qualquer linha comprada.
  makeSubcon: [
    { label: "Estratégia", team: "planning", phase: 1 },
    { label: "Cotação", team: "scm", phase: 1 },
    { label: "RC/PO", team: "purchasing", phase: 2 },
    { label: "Fabricação externa", team: "machining", phase: 2 },
    { label: "Inspeção", team: "quality", phase: 2 },
    { label: "Recebimento", team: "warehouse", phase: 2 },
  ],
  // Linha pai: não tem roteiro próprio — quem percorre as etapas são os filhos.
  na: [],
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
    InQuotation: 1,
    Quoted: 2,
    // Legado: FIDs anteriores roteavam SUBCON para o delineamento interno.
    FabDelineation: 1,
    Delineated: 2,
    WaitingMaterial: 2,
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

/** Índice do primeiro passo da fase 2 — separa o roteiro nas duas abas. */
export function fabricationStartIndex(strategyKey: StrategyKey): number {
  const steps = PATHWAYS[strategyKey] ?? [];
  const index = steps.findIndex((s) => s.phase === 2);
  return index < 0 ? steps.length : index;
}
