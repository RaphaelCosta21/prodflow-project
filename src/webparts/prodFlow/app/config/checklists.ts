import { IChecklistStep } from "../models";

// Micro-etapas com data + autor (§12.3).
export interface IChecklistDef {
  key: string;
  label: string;
}

// Delineamento (Fase 1) — Eng. Industrial.
export const DELINEATION_CHECKLIST: IChecklistDef[] = [
  { key: "desenho", label: "Desenho aberto" },
  { key: "hh", label: "HH definido" },
  { key: "eps", label: "EPS / inspeções" },
  { key: "custo", label: "Custo fechado" },
];

// Fabricação (Fase 2) — Workshop/Qualidade.
export const FABRICATION_CHECKLIST: IChecklistDef[] = [
  { key: "mp", label: "Chegada da MP" },
  { key: "usinagem", label: "Usinagem / torno" },
  { key: "marcacao", label: "Marcação" },
  { key: "revestimento", label: "Revestimento" },
  { key: "pintura", label: "Pintura" },
  { key: "inspecao", label: "Inspeção" },
  { key: "montagem", label: "Montagem" },
  { key: "entrega", label: "Entrega" },
];

// Materializes a checklist from its definition, preserving any already-recorded steps.
export function buildChecklist(
  def: IChecklistDef[],
  existing: IChecklistStep[] = [],
): IChecklistStep[] {
  return def.map((d) => {
    const prev = existing.filter((e) => e.key === d.key)[0];
    return prev
      ? { ...prev, label: d.label }
      : { key: d.key, label: d.label, done: false };
  });
}

export function checklistProgress(steps: IChecklistStep[]): number {
  if (steps.length === 0) return 0;
  return steps.filter((s) => s.done).length / steps.length;
}
