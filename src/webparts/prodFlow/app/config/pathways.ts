import { TeamKey } from "./teams";
import { StrategyKey } from "./strategyOptions";

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
