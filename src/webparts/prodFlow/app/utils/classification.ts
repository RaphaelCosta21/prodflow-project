import {
  Attendance,
  IFabricationRequest,
  ISubItem,
  MakeSite,
  SubItemAttendance,
} from "../models";
import { UNDEFINED_CLASSIFICATION } from "../config/classificationOptions";
import { SlaService } from "../services/SlaService";

export type ClassificationField =
  | "complexidadeUsinagem"
  | "complexidadeCaldeiraria"
  | "atendimento";

export const CLASSIFICATION_LABELS: Record<ClassificationField, string> = {
  complexidadeUsinagem: "Complexidade de Usinagem",
  complexidadeCaldeiraria: "Complexidade de Caldeiraria/Soldagem",
  atendimento: "Atendimento",
};

const has = (subItems: ISubItem[], site: MakeSite): boolean =>
  subItems.some((s) => s.strategy === "Make" && s.makeSite === site);

/** Make·IH + Make·SUB na mesma BOM ⇒ o atendimento é obrigatoriamente híbrido. */
export function isHybridByStrategies(subItems: ISubItem[]): boolean {
  return has(subItems, "InHouse") && has(subItems, "Subcon");
}

/** Enquanto a regra vale, o campo de atendimento é derivado e não pode ser editado à mão. */
export const isAttendanceLocked = isHybridByStrategies;

/** Uma linha da BOM roda de um lado só — valores de cabeçalho caem para "Interna". */
export function subItemAttendanceOf(
  attendance: Attendance,
  makeSite?: MakeSite,
): SubItemAttendance {
  if (makeSite) return makeSite === "Subcon" ? "Externa" : "Interna";
  return attendance === "Externa" ? "Externa" : "Interna";
}

export function pendingDefinitions(
  request: Pick<IFabricationRequest, ClassificationField>,
): ClassificationField[] {
  const fields: ClassificationField[] = [
    "complexidadeUsinagem",
    "complexidadeCaldeiraria",
    "atendimento",
  ];
  return fields.filter((f) => request[f] === UNDEFINED_CLASSIFICATION);
}

export function pendingDefinitionLabels(
  request: Pick<IFabricationRequest, ClassificationField>,
): string[] {
  return pendingDefinitions(request).map((f) => CLASSIFICATION_LABELS[f]);
}

/**
 * Recalcula complexidade geral + prazo de envio. O prazo congela assim que o orçamento
 * é enviado à Petrobras — depois disso o SLA já foi medido.
 */
export function recomputeBudgetSla(draft: IFabricationRequest): void {
  draft.complexidadeGeral = SlaService.complexidadeGeral(
    draft.complexidadeUsinagem,
    draft.complexidadeCaldeiraria,
  );
  if (draft.dates.dataEnvioPetrobras) return;

  const dias = SlaService.prazoDiasUteis(
    draft.complexidadeGeral,
    draft.atendimento,
  );
  draft.dates.prazoDiasUteis = dias;
  draft.dates.prazoEnvioPetrobras =
    draft.dates.solicitacaoOrcamento && dias > 0
      ? SlaService.prazoEnvio(
          new Date(draft.dates.solicitacaoOrcamento),
          draft.complexidadeGeral,
          draft.atendimento,
        ).toISOString()
      : undefined;
}

/** Aplica a regra do auto-híbrido no draft; sem efeito se o atendimento já estiver correto. */
export function syncAttendanceFromStrategies(
  draft: IFabricationRequest,
  by: string,
): void {
  if (!isHybridByStrategies(draft.subItems)) return;
  if (draft.atendimento === "Híbrido") return;

  const from = draft.atendimento;
  draft.atendimento = "Híbrido";
  recomputeBudgetSla(draft);
  draft.history.push({
    ts: new Date().toISOString(),
    by,
    type: "classification:auto",
    message: `Atendimento ${from} → Híbrido (sub-itens Make·IH e Make·SUB na mesma BOM)`,
  });
}
