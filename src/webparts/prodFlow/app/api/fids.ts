import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import {
  IBudget,
  IFabricationRequest,
  IFabricationRequestHeader,
  ISubItem,
  RequestStatus,
} from "../models";
import { RequestService } from "../services/RequestService";
import { BudgetService } from "../services/BudgetService";
import { SlaService } from "../services/SlaService";
import { canTransition } from "../utils/statusHelpers";
import {
  computeSubItemCusto,
  computeSubItemReceita,
} from "../utils/costCalculations";
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
          const merged = { ...draft.subItems[idx], ...vars.changes };
          merged.custoTotal = computeSubItemCusto(merged);
          merged.receita = computeSubItemReceita(merged);
          draft.subItems[idx] = merged;
          // Sub-item costs roll up bottom-up into the FID financials.
          draft.financials = SlaService.computeFinancials(
            draft.subItems,
            draft.budget.totalValor,
          );
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

// Replaces the sub-item list (BOM import) as one section update and advances Draft → Budgeting.
export function useImportBom(
  fid: string,
): UseMutationResult<IFabricationRequest, unknown, ISubItem[]> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subItems: ISubItem[]) =>
      RequestService.updateSection(fid, (draft) => {
        draft.subItems = subItems;
        if (draft.status === "Draft") draft.status = "Budgeting";
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.fid(fid) }),
  });
}

interface IUpdateBudgetVars {
  budget: IBudget;
  by: string;
}

interface IMutationContext {
  previous?: IFabricationRequest;
}

// Persists the budget mask (recalc peso/valor) and re-derives financials from the new total.
export function useUpdateBudget(
  fid: string,
): UseMutationResult<
  IFabricationRequest,
  unknown,
  IUpdateBudgetVars,
  IMutationContext
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: IUpdateBudgetVars) =>
      RequestService.updateSection(fid, (draft) => {
        draft.budget = BudgetService.recalcBudget(vars.budget);
        draft.financials = SlaService.computeFinancials(
          draft.subItems,
          draft.budget.totalValor,
        );
        draft.history.push({
          ts: new Date().toISOString(),
          by: vars.by,
          type: "budget-updated",
          message: "Orçamento atualizado.",
        });
      }),
    onMutate: async (vars): Promise<IMutationContext> => {
      await qc.cancelQueries({ queryKey: queryKeys.fid(fid) });
      const previous = qc.getQueryData<IFabricationRequest>(queryKeys.fid(fid));
      if (previous) {
        const budget = BudgetService.recalcBudget(vars.budget);
        qc.setQueryData(queryKeys.fid(fid), {
          ...previous,
          budget,
          financials: SlaService.computeFinancials(
            previous.subItems,
            budget.totalValor,
          ),
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
        const merged = { ...draft.subItems[idx], ...vars.changes };
        merged.custoTotal = computeSubItemCusto(merged);
        merged.receita = computeSubItemReceita(merged);
        draft.subItems[idx] = merged;
        draft.financials = SlaService.computeFinancials(
          draft.subItems,
          draft.budget.totalValor,
        );
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
