import { IPartsBudgetLine } from "../models";

// Constantes da planilha "Cálculo de Orçamento de Partes e Peças" (linha 4).
export const PARTS_OII_FACTOR = 0.9075; // valor pago pela OII sobre o valor do fornecedor
export const PARTS_PIS_COFINS_RATE = 0.0925;
export const PARTS_ISS_RATE = 0.02;

export interface IPartsCostBreakdown {
  baseOii: number;
  pisCofinsUnit: number;
  issUnit: number;
  impostosUnit: number;
  custoTotalUnit: number;
  total: number;
}

/** Reproduz a memória de cálculo do Excel: base OII → impostos → custo unitário → total. */
export function calcPartsCost(
  valorFornecedor: number,
  qtd: number,
): IPartsCostBreakdown {
  const baseOii = valorFornecedor * PARTS_OII_FACTOR;
  const pisCofinsUnit = baseOii * PARTS_PIS_COFINS_RATE;
  const issUnit = baseOii * PARTS_ISS_RATE;
  const impostosUnit = pisCofinsUnit + issUnit;
  const custoTotalUnit = baseOii + impostosUnit;
  return {
    baseOii,
    pisCofinsUnit,
    issUnit,
    impostosUnit,
    custoTotalUnit,
    total: custoTotalUnit * qtd,
  };
}

export function applyPartsCost<
  T extends Pick<IPartsBudgetLine, "valorUnit" | "qtd">,
>(line: T): T & IPartsCostBreakdown {
  return { ...line, ...calcPartsCost(line.valorUnit, line.qtd) };
}

export function sumPartsBudget(lines: IPartsBudgetLine[]): number {
  return lines.reduce((sum, l) => sum + (l.total || 0), 0);
}
