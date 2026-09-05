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
} from "../models";
import { TeamKey } from "../config/teams";
import { RequestService } from "../services/RequestService";
import { BudgetService } from "../services/BudgetService";
import { canTransition } from "../utils/statusHelpers";
import {
  pushStatusHistory,
  pushSubItemStatusHistory,
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
        const idx = draft.subItems.findIndex((s) => s.id === vars.subItemId);
        if (idx >= 0) {
          draft.subItems[idx] = { ...draft.subItems[idx], ...vars.changes };
          recomputeFinancials(draft);
        }
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

// Replaces the sub-item list (BOM import) as one section update.
// Status stays untouched: every transition is a manual, team-owned action.
export function useImportBom(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, ISubItem[]> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subItems: ISubItem[]) =>
      RequestService.updateSection(fid, (draft) => {
        draft.subItems = subItems;
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
          const inHouse =
            item.strategy === "Make" && item.makeSite === "InHouse";
          const to: SubItemStatus = inHouse
            ? "WaitingDelineation"
            : "WaitingQuotation";
          const team: TeamKey = inHouse ? "industrialEngineering" : "scm";
          item.statusHistory = pushSubItemStatusHistory(
            item,
            to,
            vars.by,
            when,
            team,
          );
          item.status = to;
          item.startedAt = when;
          item.startedBy = vars.by;
          item.ownerTeam = team;
          draft.history.push({
            ts: when,
            by: vars.by,
            type: "subitem:start",
            message: `${item.pn} → ${inHouse ? "Delineamento" : "Cotação"}`,
          });
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
          item.statusHistory = pushSubItemStatusHistory(
            item,
            "Costed",
            vars.by,
            when,
            "industrialEngineering",
          );
          item.status = "Costed";
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
            item.statusHistory = pushSubItemStatusHistory(
              item,
              "Costed",
              vars.by,
              when,
              "scm",
            );
            item.status = "Costed";
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

export function useDeleteQuotationPackage(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) =>
      RequestService.updateSection(fid, (draft) => {
        draft.quotationPackages = (draft.quotationPackages ?? []).filter(
          (p) => p.id !== quotationId,
        );
        for (const s of draft.subItems) {
          if (s.selectedQuotationId === quotationId)
            s.selectedQuotationId = undefined;
        }
        draft.partsBudget = derivePartsBudget(draft);
        recomputeFinancials(draft);
      }),
    onSuccess: invalidateFid(qc, fid),
  });
}

interface ISelectQuotationVars {
  subItemId: string;
  quotationId: string;
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
        const idx = draft.subItems.findIndex((s) => s.id === vars.subItemId);
        if (idx < 0) return;
        draft.subItems[idx] = { ...draft.subItems[idx], ...vars.changes };
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
        if (!canTransition(draft.status, vars.to)) {
          throw new Error(`Transição inválida: ${draft.status} → ${vars.to}.`);
        }
        const when = new Date().toISOString();
        draft.status = vars.to;
        if (vars.to === "Submitted") draft.dates.dataEnvioPetrobras = when;
        if (vars.to === "Approved") {
          draft.dates.dataAprovacaoPetrobras = when;
          draft.approval = { by: vars.by, date: when };
        }
        draft.history.push({
          ts: when,
          by: vars.by,
          type: `status:${vars.to}`,
          message: `Status → ${vars.to} (board)`,
        });
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

// Guarded status transition (§12.1) with side-effects (send date / approval) + history trail.
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
        if (!canTransition(draft.status, vars.to)) {
          throw new Error(`Transição inválida: ${draft.status} → ${vars.to}.`);
        }
        const when = vars.dateISO ?? new Date().toISOString();
        draft.status = vars.to;
        if (vars.to === "Submitted") draft.dates.dataEnvioPetrobras = when;
        if (vars.to === "Approved") {
          draft.dates.dataAprovacaoPetrobras = when;
          draft.approval = {
            by: vars.by,
            date: when,
            signatureRef: vars.signatureRef,
          };
        }
        pushStatusHistory(draft, vars.to, vars.by, when);
        draft.history.push({
          ts: new Date().toISOString(),
          by: vars.by,
          type: `status:${vars.to}`,
          message: vars.message ?? `Status → ${vars.to}`,
        });
      }),
    onMutate: async (vars): Promise<IMutationContext> => {
      await qc.cancelQueries({ queryKey: queryKeys.fid(fid) });
      const previous = qc.getQueryData<IFabricationRequest>(queryKeys.fid(fid));
      if (previous && canTransition(previous.status, vars.to)) {
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
