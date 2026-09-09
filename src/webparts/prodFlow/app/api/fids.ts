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
import { queryKeys } from "./queryKeys";

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

interface IUpdateSubItemVars {
  subItemId: string;
  changes: Partial<ISubItem>;
  by: string;
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
        if (status) {
          recordSubItemStatusChange(
            draft,
            item,
            status,
            vars.by,
            subItemOwnersOf(item.strategy)[0],
          );
        }
        recomputeFinancials(draft);
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
            subItemOwnersOf(item.strategy)[0],
          );
        }
        recomputeFinancials(draft);
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
  if (to === "Submitted") draft.dates.dataEnvioPetrobras = when;
  if (to === "Approved") {
    draft.dates.dataAprovacaoPetrobras = when;
    draft.approval = { by, date: when, signatureRef };
  }
  recordStatusChange(draft, to, by, note, when);

  if (to === executionStatusOf(flow)) {
    for (const item of draft.subItems) {
      if (!isSubItemCosted(item.status)) continue;
      recordSubItemStatusChange(
        draft,
        item,
        initialSubItemStatus(item.strategy, item.makeSite, 2),
        by,
        subItemOwnersOf(item.strategy)[0],
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
          const isMake = item.strategy === "Make";
          const to: SubItemStatus = isMake ? "FabDelineation" : "InQuotation";
          const team: TeamKey = isMake ? "industrialEngineering" : "scm";
          item.startedAt = when;
          item.startedBy = vars.by;
          recordSubItemStatusChange(
            draft,
            item,
            to,
            vars.by,
            team,
            isMake ? "Roteado p/ delineamento" : "Roteado p/ cotação",
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
  subItemId: string;
  quotationId: string;
  by: string;
}

export function useSelectQuotation(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, ISelectQuotationVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: ISelectQuotationVars) =>
      RequestService.updateSection(fid, (draft) => {
        const item = draft.subItems.filter((s) => s.id === vars.subItemId)[0];
        if (item) item.selectedQuotationId = vars.quotationId;
        draft.partsBudget = derivePartsBudget(draft);
        recomputeFinancials(draft);
        draft.history.push({
          ts: new Date().toISOString(),
          by: vars.by,
          type: "quotation:select",
          message: `Cotação selecionada — ${item?.pn ?? vars.subItemId}`,
        });
      }),
    onSuccess: invalidateFid(qc, fid),
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
        draft.comments = (draft.comments ?? []).concat({
          id: `c-${Date.now()}`,
          author: vars.author,
          text: vars.text,
          ts: new Date().toISOString(),
          section: vars.section,
        });
      }),
    onSuccess: invalidateFid(qc, fid),
  });
}

interface ISaveNotesVars {
  section: string;
  text: string;
}

export function useSaveNotes(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, ISaveNotesVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: ISaveNotesVars) =>
      RequestService.updateSection(fid, (draft) => {
        draft.notes = { ...(draft.notes ?? {}), [vars.section]: vars.text };
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
            subItemOwnersOf(item.strategy)[0],
          );
        }
        recomputeFinancials(draft);
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
