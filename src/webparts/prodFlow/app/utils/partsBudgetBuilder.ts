import { IFabricationRequest, IPartsBudget, ISubItem } from "../models";
import { calcPartsCost, sumPartsBudget } from "./partsBudgetCalc";
import { selectedLineFor, selectedPackageFor } from "./quotationHelpers";

export function buyLeaves(request: IFabricationRequest): ISubItem[] {
  return request.subItems.filter((s) => s.strategy === "Buy");
}

export function makeItems(request: IFabricationRequest): ISubItem[] {
  return request.subItems.filter((s) => s.strategy === "Make");
}

/** Derives the "Relatório de Partes e Peças" from the winning quote of every Buy sub-item. */
export function derivePartsBudget(request: IFabricationRequest): IPartsBudget {
  const saved = request.partsBudget;
  const lines = buyLeaves(request).map((s, i) => {
    const pkg = selectedPackageFor(request, s);
    const quote = selectedLineFor(request, s);
    const valorUnit = quote?.valorUnit ?? 0;
    const qtd = quote?.qtd ?? s.qtd;
    const cost = calcPartsCost(valorUnit, qtd);
    return {
      subItemId: s.id,
      item: i + 1,
      descricao: s.descricao,
      pn: s.pn,
      material: s.delineation?.rawMaterial,
      qtd,
      unidade: s.unit || "Und.",
      fornecedor: pkg?.supplier,
      quotationId: pkg?.id,
      valorUnit,
      pisCofinsUnit: cost.pisCofinsUnit,
      issUnit: cost.issUnit,
      impostosUnit: cost.impostosUnit,
      custoTotalUnit: cost.custoTotalUnit,
      total: cost.total,
      prazoEntrega: quote?.prazoEntrega,
    };
  });

  return {
    contrato: saved?.contrato ?? request.budget?.contrato ?? "4600684130",
    numeroOrcamento: saved?.numeroOrcamento ?? "",
    revisao: saved?.revisao,
    data: saved?.data,
    validadeDias: saved?.validadeDias ?? 5,
    observacoes: saved?.observacoes,
    lines,
    total: sumPartsBudget(lines),
  };
}
