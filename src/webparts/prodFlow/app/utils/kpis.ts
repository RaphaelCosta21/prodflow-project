import { IFabricationRequest, ISubItem } from "../models";
import { strategyKeyOf, StrategyKey } from "../config/strategyOptions";

export interface IRatio {
  onTime: number;
  total: number;
  ratio: number; // 0..1
}

export interface IFinancialTotals {
  custoTotal: number;
  orcamentoOceaneering: number;
  receita: number;
  multaExposicao30: number;
}

const toTime = (iso?: string): number | undefined => {
  if (!iso) return undefined;
  const t = new Date(iso).getTime();
  return isNaN(t) ? undefined : t;
};

export function leavesOf(subItems: ISubItem[]): ISubItem[] {
  const parents: { [id: string]: true } = {};
  for (const s of subItems) if (s.parentId) parents[s.parentId] = true;
  return subItems.filter((s) => !parents[s.id]);
}

// KPI 1 — % de orçamentos enviados dentro do prazo de SLA.
export function budgetSlaRatio(requests: IFabricationRequest[]): IRatio {
  let onTime = 0;
  let total = 0;
  for (const r of requests) {
    const envio = toTime(r.dates.dataEnvioPetrobras);
    const prazo = toTime(r.dates.prazoEnvioPetrobras);
    if (envio === undefined || prazo === undefined) continue;
    total++;
    if (envio <= prazo) onTime++;
  }
  return { onTime, total, ratio: total ? onTime / total : 0 };
}

// KPI 2 — % de fabricações concluídas dentro do prazo previsto.
export function fabricationSlaRatio(requests: IFabricationRequest[]): IRatio {
  let onTime = 0;
  let total = 0;
  for (const r of requests) {
    for (const s of leavesOf(r.subItems)) {
      const real = toTime(s.dataTerminoReal);
      const previsto = toTime(s.dataFimFab);
      if (real === undefined || previsto === undefined) continue;
      total++;
      if (real <= previsto) onTime++;
    }
  }
  return { onTime, total, ratio: total ? onTime / total : 0 };
}

// KPI 3 — fabricações iniciadas por tipo de atendimento (Workshop × Usinando).
export function startedByAttendance(requests: IFabricationRequest[]): {
  interna: number;
  externa: number;
} {
  let interna = 0;
  let externa = 0;
  for (const r of requests) {
    for (const s of leavesOf(r.subItems)) {
      if (!s.dataInicioFab) continue;
      if (s.attendance === "Externa") externa++;
      else interna++;
    }
  }
  return { interna, externa };
}

// KPI 4/5 — custo × receita e exposição de multa dos FIDs atrasados.
export function financialTotals(
  requests: IFabricationRequest[],
): IFinancialTotals {
  const totals: IFinancialTotals = {
    custoTotal: 0,
    orcamentoOceaneering: 0,
    receita: 0,
    multaExposicao30: 0,
  };
  for (const r of requests) {
    totals.custoTotal += r.financials.custoTotal || 0;
    totals.orcamentoOceaneering += r.financials.orcamentoOceaneering || 0;
    totals.receita += r.financials.receita || 0;
    if (isBudgetOverdue(r))
      totals.multaExposicao30 += r.financials.multaExposicao30 || 0;
  }
  return totals;
}

// Atrasado = passou do prazo de envio sem ter enviado, ou enviou depois do prazo.
export function isBudgetOverdue(r: IFabricationRequest): boolean {
  const prazo = toTime(r.dates.prazoEnvioPetrobras);
  if (prazo === undefined) return false;
  const envio = toTime(r.dates.dataEnvioPetrobras);
  return envio === undefined ? Date.now() > prazo : envio > prazo;
}

export function countByStatus(requests: IFabricationRequest[]): {
  [status: string]: number;
} {
  const map: { [status: string]: number } = {};
  for (const r of requests) map[r.status] = (map[r.status] || 0) + 1;
  return map;
}

// Mix make/buy das folhas da BOM (todas as estratégias definidas).
export function makeBuyMix(requests: IFabricationRequest[]): {
  [key in StrategyKey]: number;
} {
  const mix = {
    buyRaw: 0,
    buyCommercial: 0,
    makeInHouse: 0,
    makeSubcon: 0,
    na: 0,
  };
  for (const r of requests) {
    for (const s of leavesOf(r.subItems)) {
      const key = strategyKeyOf(s.strategy, s.buyType, s.makeSite);
      if (key) mix[key]++;
    }
  }
  return mix;
}
