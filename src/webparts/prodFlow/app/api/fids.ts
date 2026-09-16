import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import {
  IDelineation,
  IFabricationBudget,
  IFabricationRequest,
  IFabricationRequestHeader,
  IPartsBudget,
  IQuotationPackage,
  ISubItem,
  RequestStatus,
  SubItemStatus,
  Strategy,
  BuyType,
  MakeSite,
  BudgetStageKey,
  IBudgetReportReview,
  IBudgetStageState,
} from "../models";
import { TeamKey } from "../config/teams";
import { RequestService } from "../services/RequestService";
import { BudgetService } from "../services/BudgetService";
import { canTransition } from "../utils/statusHelpers";
import {
  executionStatusOf,
  initialSubItemStatus,
  isInternalMake,
  isSubItemCosted,
  workflowOf,
} from "../config/workflows";
import { subItemOwnersOf } from "../config/statusOwners";
import {
  recordStatusChange,
  recordSubItemStatusChange,
} from "../utils/historyHelpers";
import { delineationToBudget } from "../utils/delineationToBudget";
import { derivePartsBudget } from "../utils/partsBudgetBuilder";
import {
  BUDGET_STAGE_LABEL,
  IBudgetReportRef,
  listBudgetReports,
  openRevisions,
  stageState,
} from "../utils/budgetApproval";
import { withDerivedHh } from "../utils/requestFactory";
import { recomputeFinancials } from "../utils/financialsRollup";
import {
  CLASSIFICATION_LABELS,
  ClassificationField,
  recomputeBudgetSla,
  syncAttendanceFromStrategies,
} from "../utils/classification";
import { computeBudgetSla } from "../utils/kpis";
import { formatDate } from "../utils/formatters";
import { queryKeys } from "./queryKeys";

/** Keeps free-text excerpts short in the activity log. */
function truncate(text: string, max = 80): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

export function useFids(): UseQueryResult<IFabricationRequestHeader[]> {
  return useQuery({
    queryKey: queryKeys.fids,
    queryFn: () => RequestService.getAllHeaders(),
  });
}

// Full documents for dashboards/boards (financials, dates, sub-items).
export function useFidsFull(): UseQueryResult<IFabricationRequest[]> {
  return useQuery({
    queryKey: queryKeys.fidsFull,
    queryFn: () => RequestService.getAllFull(),
  });
}

export function useFid(fid: string): UseQueryResult<IFabricationRequest> {
  return useQuery({
    queryKey: queryKeys.fid(fid),
    queryFn: async () => {
      const request = await RequestService.getByFid(fid);
      if (!request) throw new Error(`FID ${fid} não encontrado.`);
      return request;
    },
    enabled: !!fid,
  });
}

export function useCreateFid(): UseMutationResult<
  IFabricationRequest,
  unknown,
  Omit<IFabricationRequest, "fid">
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (request: Omit<IFabricationRequest, "fid">) =>
      RequestService.create(request),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.fids });
      await qc.invalidateQueries({ queryKey: queryKeys.fidsFull });
    },
  });
}

export type IClassificationChanges = Partial<
  Pick<IFabricationRequest, ClassificationField>
>;

interface IUpdateClassificationVars {
  changes: IClassificationChanges;
  by: string;
}

interface IUpdateClassificationContext {
  previous?: IFabricationRequest;
}

// Complexidade/atendimento seguem editáveis após a criação — cada troca recalcula o prazo de envio.
export function useUpdateClassification(
  fid: string,
): UseMutationResult<
  IFabricationRequest,
  unknown,
  IUpdateClassificationVars,
  IUpdateClassificationContext
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IUpdateClassificationVars) =>
      RequestService.updateSection(fid, (draft) => {
        const changed = (
          Object.keys(vars.changes) as ClassificationField[]
        ).filter((key) => vars.changes[key] !== draft[key]);
        if (changed.length === 0) return;

        const messages = changed.map(
          (key) =>
            `${CLASSIFICATION_LABELS[key]}: ${draft[key]} → ${vars.changes[key]}`,
        );
        Object.assign(draft, vars.changes);
        recomputeBudgetSla(draft);
        draft.history.push({
          ts: new Date().toISOString(),
          by: vars.by,
          type: "classification:update",
          message: messages.join(" · "),
        });
      }),
    onMutate: async (vars): Promise<IUpdateClassificationContext> => {
      await qc.cancelQueries({ queryKey: queryKeys.fid(fid) });
      const previous = qc.getQueryData<IFabricationRequest>(queryKeys.fid(fid));
      if (previous) {
        qc.setQueryData(queryKeys.fid(fid), {
          ...previous,
          ...vars.changes,
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        qc.setQueryData(queryKeys.fid(fid), context.previous);
    },
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.fid(fid) }),
        qc.invalidateQueries({ queryKey: queryKeys.fidsFull }),
      ]),
  });
}

interface IUpdateSubItemVars {
  subItemId: string;
  changes: Partial<ISubItem>;
  by: string;
  /** Optional activity-log entry for changes the status timeline doesn't cover (e.g. drawings). */
  log?: { type: string; message: string };
}

interface IUpdateSubItemContext {
  previous?: IFabricationRequest;
}

// Optimistic update + rollback + invalidate — the client half of the concurrency strategy.
export function useUpdateSubItem(
  fid: string,
): UseMutationResult<
  IFabricationRequest,
  unknown,
  IUpdateSubItemVars,
  IUpdateSubItemContext
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IUpdateSubItemVars) =>
      RequestService.updateSection(fid, (draft) => {
        const item = draft.subItems.filter((s) => s.id === vars.subItemId)[0];
        if (!item) return;
        const { status, ...fields } = vars.changes;
        Object.assign(item, fields);
        if (Object.prototype.hasOwnProperty.call(vars.changes, "strategy")) {
          item.engAnalysis = undefined;
        }
        if (vars.log) {
          draft.history.push({
            ts: new Date().toISOString(),
            by: vars.by,
            type: vars.log.type,
            message: vars.log.message,
          });
        }
        if (status) {
          recordSubItemStatusChange(
            draft,
            item,
            status,
            vars.by,
            subItemOwnersOf(item.strategy, item.makeSite)[0],
          );
        }
        recomputeFinancials(draft);
        syncAttendanceFromStrategies(draft, vars.by);
      }),
    onMutate: async (vars): Promise<IUpdateSubItemContext> => {
      await qc.cancelQueries({ queryKey: queryKeys.fid(fid) });
      const previous = qc.getQueryData<IFabricationRequest>(queryKeys.fid(fid));
      if (previous) {
        const optimistic: IFabricationRequest = {
          ...previous,
          subItems: previous.subItems.map((s) =>
            s.id === vars.subItemId ? { ...s, ...vars.changes } : s,
          ),
        };
        qc.setQueryData(queryKeys.fid(fid), optimistic);
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        qc.setQueryData(queryKeys.fid(fid), context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.fid(fid) }),
  });
}

interface IReplicateStrategyVars {
  targetIds: string[];
  by: string;
  changes: { strategy: Strategy; buyType?: BuyType; makeSite?: MakeSite };
}

// Applies one strategy to a set of sub-items (children of a parent, or all descendants) in a
// single section update — used by the "replicar estratégia" action on parent BOM lines.
export function useReplicateStrategy(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, IReplicateStrategyVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IReplicateStrategyVars) =>
      RequestService.updateSection(fid, (draft) => {
        const ids = new Set(vars.targetIds);
        for (const item of draft.subItems) {
          if (!ids.has(item.id)) continue;
          item.strategy = vars.changes.strategy;
          item.buyType = vars.changes.buyType;
          item.makeSite = vars.changes.makeSite;
          item.engAnalysis = undefined;
          recordSubItemStatusChange(
            draft,
            item,
            "NotStarted",
            vars.by,
            subItemOwnersOf(item.strategy, item.makeSite)[0],
          );
        }
        recomputeFinancials(draft);
        syncAttendanceFromStrategies(draft, vars.by);
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.fid(fid) }),
  });
}

// Appends a manually-created BOM line (flat level/parentId) as one section update.
export function useAddSubItem(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, ISubItem> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subItem: ISubItem) =>
      RequestService.updateSection(fid, (draft) => {
        draft.subItems.push(subItem);
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.fid(fid) }),
  });
}

// Removes a manually-built BOM line and every descendant below it, in one section update.
export function useDeleteSubItem(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subItemId: string) =>
      RequestService.updateSection(fid, (draft) => {
        const remove = new Set<string>([subItemId]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const s of draft.subItems) {
            if (s.parentId && remove.has(s.parentId) && !remove.has(s.id)) {
              remove.add(s.id);
              changed = true;
            }
          }
        }
        draft.subItems = draft.subItems.filter((s) => !remove.has(s.id));
        recomputeFinancials(draft);
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.fid(fid) }),
  });
}

// Replaces the sub-item list (BOM import) as one section update. Re-imported lines keep the
// status and audit trail they already had; every transition stays a manual, team-owned action.
export function useImportBom(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, ISubItem[]> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subItems: ISubItem[]) =>
      RequestService.updateSection(fid, (draft) => {
        const previous = new Map(draft.subItems.map((s) => [s.pn, s]));
        draft.subItems = subItems.map((s) => {
          const old = previous.get(s.pn);
          return old
            ? {
                ...s,
                status: old.status,
                resumeStatus: old.resumeStatus,
                statusHistory: old.statusHistory,
                startedAt: old.startedAt,
                startedBy: old.startedBy,
                ownerTeam: old.ownerTeam,
              }
            : s;
        });
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.fid(fid) }),
  });
}

interface IMutationContext {
  previous?: IFabricationRequest;
}

function invalidateFid(
  qc: ReturnType<typeof useQueryClient>,
  fid: string,
): () => Promise<void> {
  return () => qc.invalidateQueries({ queryKey: queryKeys.fid(fid) });
}

/**
 * The one place a FID status moves: guards the transition against the workflow, stamps the
 * milestone dates and hands the costed sub-items over to phase 2.
 */
function applyStatusTransition(
  draft: IFabricationRequest,
  to: RequestStatus,
  by: string,
  note?: string,
  dateISO?: string,
  signatureRef?: string,
): void {
  const flow = workflowOf(draft.tipoOrcamento);
  if (!canTransition(draft.status, to, flow, draft.resumeStatus)) {
    throw new Error(`Transição inválida: ${draft.status} → ${to}.`);
  }
  const when = dateISO ?? new Date().toISOString();
  const sla =
    to === "Submitted"
      ? computeBudgetSla(draft.dates.prazoEnvioPetrobras, when)
      : undefined;
  if (to === "Submitted") draft.dates.dataEnvioPetrobras = when;
  if (sla && draft.dates.prazoEnvioPetrobras) {
    draft.slaOrcamento = {
      prazo: draft.dates.prazoEnvioPetrobras,
      envio: when,
      ...sla,
      registradoEm: when,
      registradoPor: by,
    };
  }
  if (to === "Approved") {
    draft.dates.dataAprovacaoPetrobras = when;
    draft.approval = { by, date: when, signatureRef };
  }
  recordStatusChange(draft, to, by, note, when);

  if (sla) {
    const prazoLabel = formatDate(draft.dates.prazoEnvioPetrobras);
    draft.history.push({
      ts: when,
      by,
      type: "sla:budget",
      message: sla.onTime
        ? `Orçamento enviado no prazo (prazo ${prazoLabel}).`
        : `Orçamento enviado com ${sla.atrasoDiasUteis} ${
            sla.atrasoDiasUteis === 1 ? "dia útil" : "dias úteis"
          } de atraso (prazo ${prazoLabel}).`,
    });
  }

  if (to === executionStatusOf(flow)) {
    for (const item of draft.subItems) {
      if (!isSubItemCosted(item.status)) continue;
      recordSubItemStatusChange(
        draft,
        item,
        initialSubItemStatus(item.strategy, item.makeSite, 2),
        by,
        subItemOwnersOf(item.strategy, item.makeSite)[0],
        "Liberado para a fase 2",
        when,
      );
    }
  }
}

interface IStartSubItemsVars {
  subItemIds: string[];
  by: string;
}

interface IRequestFabAnalysisVars {
  subItemIds: string[];
  by: string;
}

interface ISetMakeDecisionVars {
  subItemIds: string[];
  makeSite: MakeSite;
  by: string;
  reset?: boolean;
}

interface IConcludeFabAnalysisVars {
  by: string;
  semMakeInterno: boolean;
}

function canRequestAnalysis(item: ISubItem): boolean {
  return (
    !item.strategy &&
    !item.startedAt &&
    !item.engAnalysis?.requestedAt &&
    !hasWorkToReset(item)
  );
}

function hasWorkToReset(item: ISubItem): boolean {
  return (
    !!item.startedAt ||
    !!item.delineation ||
    !!item.quotation ||
    !!item.selectedQuotationId ||
    item.status !== "NotStarted"
  );
}

function resetSubItemExecution(item: ISubItem): void {
  item.delineation = undefined;
  item.quotation = undefined;
  item.selectedQuotationId = undefined;
  item.fabricationBudget = undefined;
  item.startedAt = undefined;
  item.startedBy = undefined;
  item.ownerTeam = undefined;
  item.resumeStatus = undefined;
}

export function useRequestFabAnalysis(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, IRequestFabAnalysisVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IRequestFabAnalysisVars) =>
      RequestService.updateSection(fid, (draft) => {
        const when = new Date().toISOString();
        const ids = new Set(vars.subItemIds);
        const requested: string[] = [];
        for (const item of draft.subItems) {
          if (!ids.has(item.id) || !canRequestAnalysis(item)) continue;
          item.engAnalysis = {
            requestedBy: vars.by,
            requestedAt: when,
          };
          requested.push(item.pn);
          draft.history.push({
            ts: when,
            by: vars.by,
            type: "subitem:analysis-request",
            message: `Análise de fabricação solicitada — ${item.pn}`,
          });
        }
        if (requested.length === 0) {
          throw new Error("Nenhuma linha elegível para solicitar análise.");
        }
      }),
    onSuccess: invalidateFid(qc, fid),
  });
}

export function useSetMakeDecision(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, ISetMakeDecisionVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: ISetMakeDecisionVars) =>
      RequestService.updateSection(fid, (draft) => {
        const when = new Date().toISOString();
        const ids = new Set(vars.subItemIds);
        let changed = 0;
        for (const item of draft.subItems) {
          if (!ids.has(item.id)) continue;
          const wasRequested = !!item.engAnalysis?.requestedAt;
          const workStarted = hasWorkToReset(item);
          if (!wasRequested && !vars.reset) continue;
          if (workStarted && !vars.reset) {
            throw new Error(
              `O item ${item.pn} já possui trabalho iniciado. Use reabertura com reset.`,
            );
          }
          if (vars.reset) resetSubItemExecution(item);

          item.strategy = "Make";
          item.buyType = undefined;
          item.makeSite = vars.makeSite;
          item.engAnalysis = {
            requestedBy: item.engAnalysis?.requestedBy ?? vars.by,
            requestedAt: item.engAnalysis?.requestedAt ?? when,
            decision: vars.makeSite,
            decidedBy: vars.by,
            decidedAt: when,
          };

          if (vars.makeSite === "InHouse") {
            item.startedAt = when;
            item.startedBy = vars.by;
            recordSubItemStatusChange(
              draft,
              item,
              "FabDelineation",
              vars.by,
              "industrialEngineering",
              "Análise Eng. Industrial: Make · In-House",
              when,
            );
          } else {
            item.ownerTeam = undefined;
            item.startedAt = undefined;
            item.startedBy = undefined;
            if (item.status !== "NotStarted") {
              recordSubItemStatusChange(
                draft,
                item,
                "NotStarted",
                vars.by,
                "planning",
                "Análise Eng. Industrial: Make · SUBCON",
                when,
              );
            }
          }

          changed += 1;
          draft.history.push({
            ts: when,
            by: vars.by,
            type: "subitem:analysis",
            message: `${item.pn}: Make · ${vars.makeSite === "InHouse" ? "In-House" : "SUBCON"}`,
          });
        }

        if (changed === 0) {
          throw new Error(
            "Nenhuma linha foi atualizada na análise de fabricação.",
          );
        }

        recomputeFinancials(draft);
        syncAttendanceFromStrategies(draft, vars.by);
      }),
    onSuccess: invalidateFid(qc, fid),
  });
}

export function useConcludeFabAnalysis(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, IConcludeFabAnalysisVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IConcludeFabAnalysisVars) =>
      RequestService.updateSection(fid, (draft) => {
        const pending = draft.subItems.some(
          (s) => !!s.engAnalysis?.requestedAt && !s.engAnalysis?.decidedAt,
        );
        if (pending) {
          throw new Error(
            "Ainda existem linhas pendentes de decisão da Engenharia Industrial.",
          );
        }
        const when = new Date().toISOString();
        draft.fabAnalysis = {
          concluidoPor: vars.by,
          concluidoEm: when,
          semMakeInterno: vars.semMakeInterno,
        };
        draft.history.push({
          ts: when,
          by: vars.by,
          type: "analysis:concluded",
          message: vars.semMakeInterno
            ? "Análise de fabricação concluída sem itens Make · In-House."
            : "Análise de fabricação concluída com itens Make · In-House.",
        });
      }),
    onSuccess: invalidateFid(qc, fid),
  });
}

export function useReopenFabAnalysis(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, { by: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { by: string }) =>
      RequestService.updateSection(fid, (draft) => {
        draft.fabAnalysis = undefined;
        draft.history.push({
          ts: new Date().toISOString(),
          by: vars.by,
          type: "analysis:reopen",
          message: "Análise de fabricação reaberta para revisão.",
        });
      }),
    onSuccess: invalidateFid(qc, fid),
  });
}

// Planning routes each defined sub-item to Eng. Industrial (delineation) or SCM (quotation).
export function useStartSubItems(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, IStartSubItemsVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IStartSubItemsVars) =>
      RequestService.updateSection(fid, (draft) => {
        const when = new Date().toISOString();
        for (const id of vars.subItemIds) {
          const item = draft.subItems.filter((s) => s.id === id)[0];
          if (!item || !item.strategy || item.strategy === "NA") continue;
          const internal = isInternalMake(item);
          const to: SubItemStatus = internal ? "FabDelineation" : "InQuotation";
          const team: TeamKey = internal ? "industrialEngineering" : "scm";
          item.startedAt = when;
          item.startedBy = vars.by;
          recordSubItemStatusChange(
            draft,
            item,
            to,
            vars.by,
            team,
            internal ? "Roteado p/ delineamento" : "Roteado p/ cotação",
            when,
          );
        }
      }),
    onSuccess: invalidateFid(qc, fid),
  });
}

interface IUpdateDelineationVars {
  subItemId: string;
  delineation: IDelineation;
  by: string;
  concluir?: boolean;
}

export function useUpdateDelineation(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, IUpdateDelineationVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IUpdateDelineationVars) =>
      RequestService.updateSection(fid, (draft) => {
        const item = draft.subItems.filter((s) => s.id === vars.subItemId)[0];
        if (!item) return;
        const when = new Date().toISOString();
        const wasConcluded = item.delineation?.concluido === true;
        item.delineation = withDerivedHh(vars.delineation);
        if (vars.concluir) {
          item.delineation.concluido = true;
          item.delineation.concluidoPor = vars.by;
          item.delineation.concluidoEm = when;
          recordSubItemStatusChange(
            draft,
            item,
            "Delineated",
            vars.by,
            "industrialEngineering",
            undefined,
            when,
          );
        } else if (wasConcluded) {
          // Editar um delineamento já fechado o reabre — precisa ser concluído de novo.
          item.delineation.concluido = false;
          item.delineation.concluidoPor = undefined;
          item.delineation.concluidoEm = undefined;
          if (item.status === "Delineated") {
            recordSubItemStatusChange(
              draft,
              item,
              "FabDelineation",
              vars.by,
              "industrialEngineering",
              "Delineamento reaberto para revisão",
              when,
            );
          }
        }
        item.fabricationBudget = BudgetService.recalcFabricationBudget(
          delineationToBudget(draft, item),
        );
        recomputeFinancials(draft);
        draft.history.push({
          ts: when,
          by: vars.by,
          type: "subitem:delineation",
          message: `Delineamento ${vars.concluir ? "concluído" : "salvo"} — ${item.pn}`,
        });
      }),
    onSuccess: invalidateFid(qc, fid),
  });
}

interface IUpsertQuotationVars {
  quotation: IQuotationPackage;
  by: string;
  concluir?: boolean;
}

// A package is one supplier quoting N sub-items at once (a single PDF covers them all).
export function useUpsertQuotationPackage(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, IUpsertQuotationVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IUpsertQuotationVars) =>
      RequestService.updateSection(fid, (draft) => {
        const when = new Date().toISOString();
        const packages = draft.quotationPackages ?? [];
        const idx = packages.findIndex((p) => p.id === vars.quotation.id);
        const saved = { ...vars.quotation, by: vars.by };
        if (idx >= 0) packages[idx] = saved;
        else packages.push(saved);
        draft.quotationPackages = packages;

        if (vars.concluir) {
          for (const id of saved.coveredSubItemIds) {
            const item = draft.subItems.filter((s) => s.id === id)[0];
            if (!item) continue;
            if (!item.selectedQuotationId) item.selectedQuotationId = saved.id;
            recordSubItemStatusChange(
              draft,
              item,
              "Quoted",
              vars.by,
              "scm",
              `Cota\u00e7\u00e3o ${saved.supplier}`,
              when,
            );
          }
        }
        draft.partsBudget = derivePartsBudget(draft);
        recomputeFinancials(draft);
        draft.history.push({
          ts: when,
          by: vars.by,
          type: "quotation:upsert",
          message: `Cotação ${saved.supplier} — ${saved.coveredSubItemIds.length} item(ns)`,
        });
      }),
    onSuccess: invalidateFid(qc, fid),
  });
}

interface IDeleteQuotationVars {
  quotationId: string;
  by: string;
}

export function useDeleteQuotationPackage(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, IDeleteQuotationVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IDeleteQuotationVars) =>
      RequestService.updateSection(fid, (draft) => {
        const removed = (draft.quotationPackages ?? []).filter(
          (p) => p.id === vars.quotationId,
        )[0];
        draft.quotationPackages = (draft.quotationPackages ?? []).filter(
          (p) => p.id !== vars.quotationId,
        );
        for (const s of draft.subItems) {
          if (s.selectedQuotationId === vars.quotationId)
            s.selectedQuotationId = undefined;
        }
        draft.partsBudget = derivePartsBudget(draft);
        recomputeFinancials(draft);
        draft.history.push({
          ts: new Date().toISOString(),
          by: vars.by,
          type: "quotation:delete",
          message: `Cotação removida — ${removed?.supplier ?? vars.quotationId}`,
        });
      }),
    onSuccess: invalidateFid(qc, fid),
  });
}

interface ISelectQuotationVars {
  subItemIds: string[];
  quotationId: string;
  by: string;
}

interface ISelectQuotationContext {
  previous?: IFabricationRequest;
}

// Aceita vários itens de uma vez (seleção em massa) e reflete a escolha na hora — o rollup
// financeiro chega no refetch.
export function useSelectQuotation(
  fid: string,
): UseMutationResult<
  IFabricationRequest,
  unknown,
  ISelectQuotationVars,
  ISelectQuotationContext
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: ISelectQuotationVars) =>
      RequestService.updateSection(fid, (draft) => {
        const ids = new Set(vars.subItemIds);
        const touched: string[] = [];
        for (const item of draft.subItems) {
          if (!ids.has(item.id)) continue;
          item.selectedQuotationId = vars.quotationId;
          touched.push(item.pn);
        }
        if (touched.length === 0) return;
        draft.partsBudget = derivePartsBudget(draft);
        recomputeFinancials(draft);
        const supplier = (draft.quotationPackages ?? []).filter(
          (p) => p.id === vars.quotationId,
        )[0]?.supplier;
        draft.history.push({
          ts: new Date().toISOString(),
          by: vars.by,
          type: "quotation:select",
          message: `Cotação selecionada${supplier ? ` (${supplier})` : ""} — ${touched.join(", ")}`,
        });
      }),
    onMutate: async (vars): Promise<ISelectQuotationContext> => {
      await qc.cancelQueries({ queryKey: queryKeys.fid(fid) });
      const previous = qc.getQueryData<IFabricationRequest>(queryKeys.fid(fid));
      if (previous) {
        const ids = new Set(vars.subItemIds);
        qc.setQueryData(queryKeys.fid(fid), {
          ...previous,
          subItems: previous.subItems.map((s) =>
            ids.has(s.id) ? { ...s, selectedQuotationId: vars.quotationId } : s,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        qc.setQueryData(queryKeys.fid(fid), context.previous);
    },
    onSettled: invalidateFid(qc, fid),
  });
}

interface IUpdateFabricationBudgetVars {
  subItemId: string;
  budget: IFabricationBudget;
  by: string;
}

export function useUpdateFabricationBudget(
  fid: string,
): UseMutationResult<
  IFabricationRequest,
  unknown,
  IUpdateFabricationBudgetVars
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IUpdateFabricationBudgetVars) =>
      RequestService.updateSection(fid, (draft) => {
        const item = draft.subItems.filter((s) => s.id === vars.subItemId)[0];
        if (!item) return;
        item.fabricationBudget = BudgetService.recalcFabricationBudget(
          vars.budget,
        );
        recomputeFinancials(draft);
        draft.history.push({
          ts: new Date().toISOString(),
          by: vars.by,
          type: "budget:fabrication",
          message: `Orçamento de fabricação salvo — ${item.pn}`,
        });
      }),
    onSuccess: invalidateFid(qc, fid),
  });
}

interface IUpdatePartsBudgetVars {
  partsBudget: IPartsBudget;
  by: string;
}

export function useUpdatePartsBudget(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, IUpdatePartsBudgetVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IUpdatePartsBudgetVars) =>
      RequestService.updateSection(fid, (draft) => {
        draft.partsBudget = vars.partsBudget;
        recomputeFinancials(draft);
        draft.history.push({
          ts: new Date().toISOString(),
          by: vars.by,
          type: "budget:parts",
          message: "Orçamento de partes e peças salvo",
        });
      }),
    onSuccess: invalidateFid(qc, fid),
  });
}

function stageRecord(
  draft: IFabricationRequest,
  stage: BudgetStageKey,
): IBudgetStageState {
  draft.budgetStages = draft.budgetStages ?? {};
  const current = draft.budgetStages[stage] ?? stageState(draft, stage);
  draft.budgetStages[stage] = current;
  return current;
}

function ensureReview(
  draft: IFabricationRequest,
  ref: IBudgetReportRef,
): IBudgetReportReview {
  draft.budgetReviews = draft.budgetReviews ?? [];
  let review = draft.budgetReviews.filter((r) => r.key === ref.key)[0];
  if (!review) {
    review = {
      key: ref.key,
      kind: ref.kind,
      subItemId: ref.subItem?.id,
      stage: ref.stage,
      status: "pending",
    };
    draft.budgetReviews.push(review);
  }
  review.stage = ref.stage;
  return review;
}

interface IBudgetStageVars {
  stage: BudgetStageKey;
  by: string;
}

/** "Concluído" explícito: trava a aba e libera a aprovação do time de Projects. */
export function useConcludeBudgetStage(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, IBudgetStageVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IBudgetStageVars) =>
      RequestService.updateSection(fid, (draft) => {
        const when = new Date().toISOString();
        const state = stageRecord(draft, vars.stage);
        state.concluido = true;
        state.concluidoPor = vars.by;
        state.concluidoEm = when;
        state.reabertoPor = undefined;
        state.reabertoEm = undefined;
        const atendidas = openRevisions(draft, vars.stage);
        for (const { ref } of atendidas) {
          const review = ensureReview(draft, ref);
          if (review.revisaoAtual) {
            review.revisaoHistory = (review.revisaoHistory ?? []).concat({
              ...review.revisaoAtual,
              atendidoPor: vars.by,
              atendidoEm: when,
            });
            review.revisaoAtual = undefined;
          }
          review.status = "pending";
        }
        draft.history.push({
          ts: when,
          by: vars.by,
          type: "budget:stage-concluded",
          message: atendidas.length
            ? `Etapa ${BUDGET_STAGE_LABEL[vars.stage]} concluída — ${atendidas.length} revisão(ões) atendida(s).`
            : `Etapa ${BUDGET_STAGE_LABEL[vars.stage]} concluída.`,
        });
      }),
    onSuccess: invalidateFid(qc, fid),
  });
}

export function useReopenBudgetStage(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, IBudgetStageVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IBudgetStageVars) =>
      RequestService.updateSection(fid, (draft) => {
        const aprovado = listBudgetReports(draft).filter(
          (ref) =>
            ref.stage === vars.stage &&
            ensureReview(draft, ref).status === "approved",
        );
        if (aprovado.length > 0) {
          throw new Error(
            "Etapa já tem relatório aprovado — peça uma revisão ao time de Projects.",
          );
        }
        const when = new Date().toISOString();
        const state = stageRecord(draft, vars.stage);
        state.concluido = false;
        state.reabertoPor = vars.by;
        state.reabertoEm = when;
        draft.history.push({
          ts: when,
          by: vars.by,
          type: "budget:stage-reopened",
          message: `Etapa ${BUDGET_STAGE_LABEL[vars.stage]} reaberta para ajustes.`,
        });
      }),
    onSuccess: invalidateFid(qc, fid),
  });
}

interface IApproveReportsVars {
  keys: string[];
  by: string;
}

export function useApproveBudgetReports(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, IApproveReportsVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IApproveReportsVars) =>
      RequestService.updateSection(fid, (draft) => {
        const when = new Date().toISOString();
        const refs = listBudgetReports(draft).filter(
          (ref) => vars.keys.indexOf(ref.key) >= 0,
        );
        const aprovados: string[] = [];
        for (const ref of refs) {
          if (!stageState(draft, ref.stage).concluido) {
            throw new Error(
              `Etapa ${BUDGET_STAGE_LABEL[ref.stage]} ainda não foi concluída.`,
            );
          }
          const review = ensureReview(draft, ref);
          if (review.status === "approved") continue;
          review.status = "approved";
          review.aprovadoPor = vars.by;
          review.aprovadoEm = when;
          aprovados.push(ref.label);
        }
        if (aprovados.length === 0) return;
        draft.history.push({
          ts: when,
          by: vars.by,
          type: "budget:report-approved",
          message:
            aprovados.length === 1
              ? `Relatório aprovado — ${aprovados[0]}`
              : `${aprovados.length} relatórios aprovados — ${aprovados.join(", ")}`,
        });
      }),
    onSuccess: invalidateFid(qc, fid),
  });
}

interface IRequestRevisionVars {
  key: string;
  motivo: string;
  by: string;
}

/** Devolve o relatório para a aba de origem e marca o FID como revisado na orçamentação. */
export function useRequestBudgetReportRevision(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, IRequestRevisionVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IRequestRevisionVars) =>
      RequestService.updateSection(fid, (draft) => {
        const motivo = vars.motivo.trim();
        if (!motivo) throw new Error("Informe o motivo da revisão.");
        const ref = listBudgetReports(draft).filter(
          (r) => r.key === vars.key,
        )[0];
        if (!ref) throw new Error("Relatório não encontrado.");
        if (!stageState(draft, ref.stage).concluido) {
          throw new Error(
            `Etapa ${BUDGET_STAGE_LABEL[ref.stage]} ainda não foi concluída.`,
          );
        }

        const when = new Date().toISOString();
        const review = ensureReview(draft, ref);
        review.status = "revision";
        review.aprovadoPor = undefined;
        review.aprovadoEm = undefined;
        review.revisaoAtual = {
          motivo,
          solicitadoPor: vars.by,
          solicitadoEm: when,
          stage: ref.stage,
        };

        const state = stageRecord(draft, ref.stage);
        state.concluido = false;
        state.revisionCount = (state.revisionCount ?? 0) + 1;

        const stats = draft.revisaoOrcamento ?? {
          houve: false,
          total: 0,
          porEtapa: { delineation: 0, quotations: 0 },
        };
        draft.revisaoOrcamento = {
          houve: true,
          total: stats.total + 1,
          porEtapa: {
            delineation:
              (stats.porEtapa?.delineation ?? 0) +
              (ref.stage === "delineation" ? 1 : 0),
            quotations:
              (stats.porEtapa?.quotations ?? 0) +
              (ref.stage === "quotations" ? 1 : 0),
          },
          primeiraEm: stats.primeiraEm ?? when,
          ultimaEm: when,
        };

        draft.history.push({
          ts: when,
          by: vars.by,
          type: "budget:report-revision",
          message: `Revisão solicitada — ${ref.label} → ${BUDGET_STAGE_LABEL[ref.stage]}: “${truncate(motivo)}”`,
        });
      }),
    onSuccess: invalidateFid(qc, fid),
  });
}

interface IAddCommentVars {
  text: string;
  author: { name: string; email: string };
  section?: string;
}

export function useAddComment(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, IAddCommentVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IAddCommentVars) =>
      RequestService.updateSection(fid, (draft) => {
        const when = new Date().toISOString();
        draft.comments = (draft.comments ?? []).concat({
          id: `c-${Date.now()}`,
          author: vars.author,
          text: vars.text,
          ts: when,
          section: vars.section,
        });
        draft.history.push({
          ts: when,
          by: vars.author.name,
          type: "comment:add",
          message: `Comentário adicionado: “${truncate(vars.text)}”`,
        });
      }),
    onSuccess: invalidateFid(qc, fid),
  });
}

interface ISaveNotesVars {
  section: string;
  /** Human label of the section, used in the activity log. */
  sectionLabel: string;
  text: string;
  by: string;
}

export function useSaveNotes(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, ISaveNotesVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: ISaveNotesVars) =>
      RequestService.updateSection(fid, (draft) => {
        const when = new Date().toISOString();
        draft.notes = { ...(draft.notes ?? {}), [vars.section]: vars.text };
        draft.notesMeta = {
          ...(draft.notesMeta ?? {}),
          [vars.section]: { by: vars.by, at: when },
        };
        draft.history.push({
          ts: when,
          by: vars.by,
          type: "notes:save",
          message: vars.text.trim()
            ? `${vars.sectionLabel} atualizada: “${truncate(vars.text)}”`
            : `${vars.sectionLabel} limpa.`,
        });
      }),
    onSuccess: invalidateFid(qc, fid),
  });
}

interface IMoveFidVars {
  fid: string;
  to: RequestStatus;
  by: string;
}

interface IPatchSubItemVars {
  fid: string;
  subItemId: string;
  changes: Partial<ISubItem>;
  by: string;
}

// Cross-FID views edit sub-items from many FIDs, so the fid travels with the mutation.
export function usePatchSubItem(): UseMutationResult<
  IFabricationRequest,
  unknown,
  IPatchSubItemVars
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IPatchSubItemVars) =>
      RequestService.updateSection(vars.fid, (draft) => {
        const item = draft.subItems.filter((s) => s.id === vars.subItemId)[0];
        if (!item) return;
        const { status, ...fields } = vars.changes;
        Object.assign(item, fields);
        if (status) {
          recordSubItemStatusChange(
            draft,
            item,
            status,
            vars.by,
            subItemOwnersOf(item.strategy, item.makeSite)[0],
          );
        }
        recomputeFinancials(draft);
        syncAttendanceFromStrategies(draft, vars.by);
      }),
    onSuccess: (_d, vars) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.fidsFull }),
        qc.invalidateQueries({ queryKey: queryKeys.fid(vars.fid) }),
      ]),
  });
}

// Board drag-and-drop: the FID is a parameter (a per-fid hook can't be called inside a list).
export function useMoveFidStatus(): UseMutationResult<
  IFabricationRequest,
  unknown,
  IMoveFidVars
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IMoveFidVars) =>
      RequestService.updateSection(vars.fid, (draft) => {
        applyStatusTransition(draft, vars.to, vars.by, "movido no board");
      }),
    onSuccess: (_d, vars) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.fidsFull }),
        qc.invalidateQueries({ queryKey: queryKeys.fids }),
        qc.invalidateQueries({ queryKey: queryKeys.fid(vars.fid) }),
      ]),
  });
}

interface IUpdateStatusVars {
  to: RequestStatus;
  by: string;
  message?: string;
  signatureRef?: string;
  dateISO?: string;
}

// Guarded status transition with side-effects (send date / approval / phase-2 hand-off).
export function useUpdateStatus(
  fid: string,
): UseMutationResult<
  IFabricationRequest,
  unknown,
  IUpdateStatusVars,
  IMutationContext
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IUpdateStatusVars) =>
      RequestService.updateSection(fid, (draft) => {
        applyStatusTransition(
          draft,
          vars.to,
          vars.by,
          vars.message,
          vars.dateISO,
          vars.signatureRef,
        );
      }),
    onMutate: async (vars): Promise<IMutationContext> => {
      await qc.cancelQueries({ queryKey: queryKeys.fid(fid) });
      const previous = qc.getQueryData<IFabricationRequest>(queryKeys.fid(fid));
      if (
        previous &&
        canTransition(
          previous.status,
          vars.to,
          workflowOf(previous.tipoOrcamento),
          previous.resumeStatus,
        )
      ) {
        qc.setQueryData(queryKeys.fid(fid), {
          ...previous,
          status: vars.to,
        });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.fid(fid), ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.fid(fid) }),
  });
}
