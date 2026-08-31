import { Phase } from "../models";

export interface IPhaseDef {
  phase: Phase;
  key: string;
  label: string;
  color: string;
  description: string;
}

export const PHASES: IPhaseDef[] = [
  {
    phase: 1,
    key: "budgeting",
    label: "Orçamentação",
    color: "#0a58ca",
    description:
      "Fase crítica — OS, BOM, make/buy, custos e envio do orçamento à Petrobras.",
  },
  {
    phase: 2,
    key: "fabrication",
    label: "Fabricação & Montagem",
    color: "#14b8a6",
    description:
      "Acompanhamento de status — compras, fabricação, qualidade, entrega e medição.",
  },
];
