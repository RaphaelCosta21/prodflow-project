import { Attendance, Complexity, SlaAttendance } from "../models";

// Valor sentinela: o campo foi criado sem decisão e precisa ser definido antes do orçamento.
export const UNDEFINED_CLASSIFICATION = "A definir";

export const COMPLEXITY_OPTIONS: Complexity[] = [
  "Baixa",
  "Média",
  "Alta",
  "N/A",
  UNDEFINED_CLASSIFICATION,
];

export const ATTENDANCE_OPTIONS: Attendance[] = [
  "Interna",
  "Externa",
  "Híbrido",
  UNDEFINED_CLASSIFICATION,
];

// Colunas da matriz de prazo (§10.1) — "Híbrido"/"A definir" são derivados, não configuráveis.
export const SLA_ATTENDANCE_OPTIONS: SlaAttendance[] = ["Interna", "Externa"];

export const ATTENDANCE_HINTS: Record<Attendance, string> = {
  Interna: "Execução na base (in-house).",
  Externa: "Execução fora da base (subcontratada).",
  Híbrido: "Parte na base, parte subcontratada.",
  "A definir":
    "Ainda não decidido — necessário definir antes do envio do orçamento.",
};
