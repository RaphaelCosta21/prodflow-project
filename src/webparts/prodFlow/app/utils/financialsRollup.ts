import { IFabricationRequest, ISubItem } from "../models";
import { SlaService } from "../services/SlaService";
import { BudgetService } from "../services/BudgetService";
import { computeSubItemCusto } from "./costCalculations";
import { selectedLineFor } from "./quotationHelpers";

/** Orçamento cobrado da Petrobras = N relatórios de fabricação + 1 de partes e peças. */
export function totalOrcamentoOceaneering(
  request: IFabricationRequest,
): number {
  const fabricacao = request.subItems.reduce(
    (sum, s) => sum + (s.fabricationBudget?.totalValor ?? 0),
    0,
  );
  return fabricacao + (request.partsBudget?.total ?? 0);
}

function costBuckets(
  request: IFabricationRequest,
  subItem: ISubItem,
): Partial<ISubItem> {
  const line = selectedLineFor(request, subItem);
  if (!line) return {};
  if (subItem.strategy === "Buy") return { partesEPecas: line.valorTotal };
  if (subItem.strategy === "Make" && subItem.makeSite === "Subcon")
    return { orcamentoUsinando: line.valorTotal };
  return {};
}

/**
 * Re-derives every money field of the FID from its sources of truth: the winning quotation
 * package feeds the sub-item cost buckets, the per-item fabrication mask feeds what is charged,
 * and the parts report covers the Buy lines. Call it after anything that touches those.
 */
export function recomputeFinancials(draft: IFabricationRequest): void {
  const partsByItem: { [subItemId: string]: number } = {};
  for (const line of draft.partsBudget?.lines ?? []) {
    partsByItem[line.subItemId] = line.total;
  }

  draft.subItems = draft.subItems.map((s) => {
    const merged: ISubItem = { ...s, ...costBuckets(draft, s) };
    if (merged.fabricationBudget) {
      // Recalculado e reescrito: o total do FID lê este campo.
      merged.fabricationBudget = BudgetService.recalcFabricationBudget(
        merged.fabricationBudget,
      );
      merged.orcamentoOceaneering = merged.fabricationBudget.totalValor;
    } else if (partsByItem[merged.id] !== undefined) {
      merged.orcamentoOceaneering = partsByItem[merged.id];
    }
    merged.custoTotal = computeSubItemCusto(merged);
    merged.receita = (merged.orcamentoOceaneering || 0) - merged.custoTotal;
    return merged;
  });

  draft.financials = SlaService.computeFinancials(
    draft.subItems,
    totalOrcamentoOceaneering(draft),
  );
}
