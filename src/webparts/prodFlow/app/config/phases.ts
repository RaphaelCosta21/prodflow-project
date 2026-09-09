import { Phase, WorkflowKind } from "../models";

export interface IPhaseDef {
  phase: Phase;
  key: string;
  label: string;
  color: string;
  description: string;
}

const BUDGETING: IPhaseDef = {
  phase: 1,
  key: "budgeting",
  label: "Orçamentação",
  color: "#0a58ca",
  description:
    "Fase crítica — OS, BOM, make/buy, custos e envio do orçamento à Petrobras.",
};

// Phase 2 splits by workflow: shop-floor fabrication vs. purchase & delivery of parts.
export const PHASES_BY_WORKFLOW: Record<WorkflowKind, IPhaseDef[]> = {
  fabrication: [
    BUDGETING,
    {
      phase: 2,
      key: "fabrication",
      label: "Fabricação & Montagem",
      color: "#14b8a6",
      description:
        "Acompanhamento de status — compras, fabricação, qualidade, entrega e medição.",
    },
  ],
  parts: [
    BUDGETING,
    {
      phase: 2,
      key: "procurement",
      label: "Aquisição & Entrega",
      color: "#8b5cf6",
      description:
        "Acompanhamento de compras — material, estoque, inspeção e entrega das partes e peças.",
    },
  ],
};

export function phasesFor(flow: WorkflowKind): IPhaseDef[] {
  return PHASES_BY_WORKFLOW[flow];
}

export function phaseDef(flow: WorkflowKind, phase: Phase): IPhaseDef {
  return phasesFor(flow).filter((p) => p.phase === phase)[0] ?? BUDGETING;
}

export const PHASES: IPhaseDef[] = PHASES_BY_WORKFLOW.fabrication;
