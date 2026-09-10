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
