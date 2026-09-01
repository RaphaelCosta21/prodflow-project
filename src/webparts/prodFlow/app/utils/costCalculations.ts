import { ISubItem, IQuotation } from "../models";
import { StrategyKey } from "../config/strategyOptions";

// Custo total do sub-item = Orçamento Usinando + Partes e Peças + Serviços (§13).
export function computeSubItemCusto(
  subItem: Pick<ISubItem, "orcamentoUsinando" | "partesEPecas" | "servicos">,
): number {
  return (
    (subItem.orcamentoUsinando || 0) +
    (subItem.partesEPecas || 0) +
    (subItem.servicos || 0)
  );
}

// A cotação alimenta o bucket de custo correspondente à estratégia do sub-item.
export function quotationCostPatch(
  strategyKey: StrategyKey | "",
  quotation: IQuotation,
): Partial<ISubItem> {
  if (strategyKey === "makeSubcon")
    return { orcamentoUsinando: quotation.value };
  if (strategyKey === "buyRaw" || strategyKey === "buyCommercial")
    return { partesEPecas: quotation.value };
  return {};
}

// Receita do sub-item = Orçamento Oceaneering − Custo total.
export function computeSubItemReceita(subItem: ISubItem): number {
  return (subItem.orcamentoOceaneering || 0) - computeSubItemCusto(subItem);
}
