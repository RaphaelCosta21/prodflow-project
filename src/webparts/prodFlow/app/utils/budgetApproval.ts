import {
  BudgetStageKey,
  IBudgetReportReview,
  IBudgetReportRevision,
  IBudgetStageState,
  IFabricationRequest,
  ISubItem,
} from "../models";
import { TeamKey } from "../config/teams";
import { FidTabKey } from "../config/fidDetailNav";
import {
  isInternalMake,
  isQuotedRoute,
  isSubItemCosted,
} from "../config/workflows";
import { buyLeaves, makeItems } from "./partsBudgetBuilder";

export const PARTS_REPORT_KEY = "parts";

export const BUDGET_STAGE_LABEL: Record<BudgetStageKey, string> = {
  delineation: "Delin. Fabricação",
  quotations: "Cotações",
};

/** Um card da aba Relatórios de Orçamento. */
export interface IBudgetReportRef {
  key: string;
  kind: "fabrication" | "parts";
  subItem?: ISubItem;
  /** Aba responsável por corrigir o dado de origem quando Projetos pede revisão. */
  stage: BudgetStageKey;
  label: string;
}

export interface IStageReadiness {
  ok: boolean;
  pendencias: string[];
}

export interface IReportEditability {
  headerEditable: boolean;
  tablesEditable: boolean;
  /** Motivo do bloqueio da máscara, quando houver. */
  reason?: string;
}

export interface IActor {
  teams: TeamKey[];
  isAdmin: boolean;
}

export type BudgetNavState = "done" | "revision";

export function reportKeyOf(subItem: ISubItem): string {
  return `fab:${subItem.id}`;
}

export function isSubconItem(
  item: Pick<ISubItem, "strategy" | "makeSite">,
): boolean {
  return item.strategy === "Make" && item.makeSite === "Subcon";
}

/** Cada Make gera um relatório de fabricação; todas as linhas Buy compartilham o de partes. */
export function listBudgetReports(
  request: IFabricationRequest,
): IBudgetReportRef[] {
  const refs: IBudgetReportRef[] = makeItems(request).map((s) => ({
    key: reportKeyOf(s),
    kind: "fabrication" as const,
    subItem: s,
    stage: isInternalMake(s)
      ? ("delineation" as const)
      : ("quotations" as const),
    label: `Fabricação · ${s.pn}`,
  }));
  if (buyLeaves(request).length > 0) {
    refs.push({
      key: PARTS_REPORT_KEY,
      kind: "parts",
      stage: "quotations",
      label: "Partes e peças",
    });
  }
  return refs;
}

function legacyConcluded(request: IFabricationRequest): boolean {
  const effective =
    request.status === "OnHold"
      ? (request.resumeStatus ?? request.status)
      : request.status;
  return request.phase >= 2 || effective !== "InDelineation";
}

/** FIDs anteriores ao fluxo de aprovação não perdem o check já conquistado. */
export function stageState(
  request: IFabricationRequest,
  stage: BudgetStageKey,
): IBudgetStageState {
  const stored = request.budgetStages?.[stage];
  if (stored) return stored;
  return { concluido: legacyConcluded(request) };
}

export function stageIsLocked(
  request: IFabricationRequest,
  stage: BudgetStageKey,
): boolean {
  return (
    stageState(request, stage).concluido &&
    openRevisions(request, stage).length === 0
  );
}

export function reviewFor(
  request: IFabricationRequest,
  ref: IBudgetReportRef,
): IBudgetReportReview {
  const stored = (request.budgetReviews ?? []).filter(
    (r) => r.key === ref.key,
  )[0];
  if (!stored) {
    return {
      key: ref.key,
      kind: ref.kind,
      subItemId: ref.subItem?.id,
      stage: ref.stage,
      status: "pending",
    };
  }
  // A estratégia do sub-item pode ter mudado depois do registro — a rota atual manda.
  return { ...stored, stage: ref.stage };
}

export interface IOpenRevision {
  ref: IBudgetReportRef;
  revisao: IBudgetReportRevision;
}

export function openRevisions(
  request: IFabricationRequest,
  stage?: BudgetStageKey,
): IOpenRevision[] {
  const out: IOpenRevision[] = [];
  for (const ref of listBudgetReports(request)) {
    if (stage && ref.stage !== stage) continue;
    const review = reviewFor(request, ref);
    if (review.status === "revision" && review.revisaoAtual) {
      out.push({ ref, revisao: review.revisaoAtual });
    }
  }
  return out;
}

function countRouted(
  request: IFabricationRequest,
  match: (s: ISubItem) => boolean,
): number {
  return request.subItems.filter(
    (s) =>
      !!s.strategy &&
      s.strategy !== "NA" &&
      !!s.startedAt &&
      match(s) &&
      !isSubItemCosted(s.status),
  ).length;
}

/** Condições que liberam o botão "Concluir etapa" (antes o check verde era automático). */
export function stageReadiness(
  request: IFabricationRequest,
  stage: BudgetStageKey,
): IStageReadiness {
  const pendencias: string[] = [];
  if (stage === "delineation") {
    if (!request.fabAnalysis?.concluidoEm) {
      pendencias.push("Análise da Eng. Industrial ainda não foi concluída.");
    }
    if (request.fabAnalysis?.semMakeInterno !== true) {
      const pending = countRouted(request, isInternalMake);
      if (pending > 0) {
        pendencias.push(
          `${pending} item(ns) de fabricação interna sem delineamento concluído.`,
        );
      }
    }
  } else {
    const semEstrategia = request.subItems.filter((s) => !s.strategy).length;
    if (semEstrategia > 0) {
      pendencias.push(`${semEstrategia} sub-item(ns) sem estratégia definida.`);
    }
    const naoIniciados = request.subItems.filter(
      (s) => !!s.strategy && s.strategy !== "NA" && !s.startedAt,
    ).length;
    if (naoIniciados > 0) {
      pendencias.push(`${naoIniciados} sub-item(ns) ainda não iniciado(s).`);
    }
    const pending = countRouted(request, isQuotedRoute);
    if (pending > 0) {
      pendencias.push(`${pending} item(ns) sem cotação concluída.`);
    }
  }
  return { ok: pendencias.length === 0, pendencias };
}

export function canEditStage(stage: BudgetStageKey, actor: IActor): boolean {
  if (actor.isAdmin) return true;
  const owners: TeamKey[] =
    stage === "delineation" ? ["industrialEngineering"] : ["scm", "purchasing"];
  return owners.filter((t) => actor.teams.indexOf(t) >= 0).length > 0;
}

/** Reabrir só é permitido enquanto nenhum relatório da etapa tiver sido aprovado. */
export function canReopenStage(
  request: IFabricationRequest,
  stage: BudgetStageKey,
  actor: IActor,
): boolean {
  if (!canEditStage(stage, actor)) return false;
  if (!stageState(request, stage).concluido) return false;
  return !listBudgetReports(request).some(
    (ref) =>
      ref.stage === stage && reviewFor(request, ref).status === "approved",
  );
}

export function canApproveReports(actor: IActor): boolean {
  return actor.isAdmin || actor.teams.indexOf("projects") >= 0;
}

function canEditSubconMask(actor: IActor): boolean {
  return (
    actor.isAdmin ||
    actor.teams.indexOf("planning") >= 0 ||
    actor.teams.indexOf("projects") >= 0
  );
}

/**
 * Só a máscara do Make·SUBCON é editável no relatório: o fornecedor manda o preço via SCM,
 * mas os valores ainda precisam ser delineados na máscara. O resto vem das abas de origem.
 */
export function reportEditability(
  request: IFabricationRequest,
  ref: IBudgetReportRef,
  actor: IActor,
): IReportEditability {
  const review = reviewFor(request, ref);
  if (review.status === "approved") {
    return {
      headerEditable: false,
      tablesEditable: false,
      reason: "Relatório aprovado pelo time de Projetos.",
    };
  }
  const subcon =
    ref.kind === "fabrication" && !!ref.subItem && isSubconItem(ref.subItem);
  if (!subcon) {
    return {
      headerEditable: true,
      tablesEditable: false,
      reason: `Valores carregados de ${BUDGET_STAGE_LABEL[ref.stage]}.`,
    };
  }
  if (!canEditSubconMask(actor)) {
    return {
      headerEditable: true,
      tablesEditable: false,
      reason: "Máscara editável pelos times Planejamento e Projects.",
    };
  }
  const liberado =
    stageState(request, "quotations").concluido || review.status === "revision";
  return {
    headerEditable: true,
    tablesEditable: liberado,
    reason: liberado
      ? undefined
      : "Aguardando a conclusão da etapa de Cotações para delinear a máscara.",
  };
}

export function allReportsApproved(request: IFabricationRequest): boolean {
  const refs = listBudgetReports(request);
  if (refs.length === 0) return false;
  return refs.every((ref) => reviewFor(request, ref).status === "approved");
}

/** Motivos que travam o envio do orçamento à Petrobras. */
export function blockingReasons(request: IFabricationRequest): string[] {
  const reasons: string[] = [];
  const stages: BudgetStageKey[] = ["delineation", "quotations"];
  for (const stage of stages) {
    if (!stageState(request, stage).concluido) {
      reasons.push(`Etapa ${BUDGET_STAGE_LABEL[stage]} não foi concluída.`);
    }
  }
  const refs = listBudgetReports(request);
  if (refs.length === 0) {
    reasons.push("Nenhum relatório de orçamento foi gerado.");
    return reasons;
  }
  const emRevisao = refs.filter(
    (r) => reviewFor(request, r).status === "revision",
  ).length;
  const pendentes = refs.filter(
    (r) => reviewFor(request, r).status === "pending",
  ).length;
  if (emRevisao > 0) {
    reasons.push(`${emRevisao} relatório(s) em revisão.`);
  }
  if (pendentes > 0) {
    reasons.push(
      `${pendentes} relatório(s) aguardando aprovação do time de Projects.`,
    );
  }
  return reasons;
}

/** Estado do check da barra lateral para as abas de orçamentação. */
export function budgetStageNavState(
  request: IFabricationRequest,
): Partial<Record<FidTabKey, BudgetNavState>> {
  const out: Partial<Record<FidTabKey, BudgetNavState>> = {};
  const stages: BudgetStageKey[] = ["delineation", "quotations"];
  for (const stage of stages) {
    if (openRevisions(request, stage).length > 0) {
      out[stage] = "revision";
    } else if (stageState(request, stage).concluido) {
      out[stage] = "done";
    }
  }
  if (openRevisions(request).length > 0) {
    out.reports = "revision";
  } else if (allReportsApproved(request)) {
    out.reports = "done";
  }
  return out;
}
