import { TeamKey } from "./teams";
import { StrategyKey } from "./strategyOptions";

// Routing per sub-item strategy (§7.4): each step → the responsible team. Derived from the make/buy choice.
export interface IPathwayStep {
  label: string;
  team: TeamKey;
}

export const PATHWAYS: Record<StrategyKey, IPathwayStep[]> = {
  buyRaw: [
    { label: "Estratégia", team: "planejamento" },
    { label: "Cotação", team: "scm" },
    { label: "RC/PO", team: "compras" },
    { label: "Recebimento", team: "almoxarifado" },
    { label: "Inspeção", team: "qualidade" },
    { label: "Estoque", team: "almoxarifado" },
  ],
  buyCommercial: [
    { label: "Estratégia", team: "planejamento" },
    { label: "Cotação", team: "scm" },
    { label: "RC/PO", team: "compras" },
    { label: "Recebimento", team: "almoxarifado" },
    { label: "Estoque", team: "almoxarifado" },
  ],
  makeInHouse: [
    { label: "Estratégia", team: "planejamento" },
    { label: "Delineamento", team: "engIndustrial" },
    { label: "Abertura de WO", team: "planejamento" },
    { label: "Fabricação", team: "workshop" },
    { label: "Inspeção/Databook", team: "qualidade" },
    { label: "Serialização/MPT", team: "serviceExcellence" },
  ],
  makeSubcon: [
    { label: "Estratégia", team: "planejamento" },
    { label: "Cotação", team: "scm" },
    { label: "RC/PO", team: "compras" },
    { label: "Fabricação externa", team: "usinando" },
    { label: "Inspeção", team: "qualidade" },
    { label: "Recebimento", team: "almoxarifado" },
  ],
};
