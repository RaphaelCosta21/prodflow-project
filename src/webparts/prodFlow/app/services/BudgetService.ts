import { IBudget, IBudgetLine } from "../models";
import { CONTRACT_WEIGHTS } from "../config/contractWeights";

// Budget math: only QTD/HH is user-editable; Peso is fixed (CONTRACT_WEIGHTS); totals are computed.
export class BudgetService {
  public static computePesoTotal(line: IBudgetLine): number {
    return (line.qtd || 0) * (line.peso || 0);
  }

  public static recalcLines(lines: IBudgetLine[]): IBudgetLine[] {
    return lines.map((line) => ({
      ...line,
      pesoTotal: BudgetService.computePesoTotal(line),
    }));
  }

  // Valor Final = Σ pesoTotal (T1 + T2 materiais + T2 labor) × preço unitário + Σ valores diretos (T3/COTS).
  public static computeTotal(
    budget: IBudget,
    unitPriceBRL: number = CONTRACT_WEIGHTS.unitPriceBRL,
  ): number {
    const sumPeso = (arr: IBudgetLine[]): number =>
      arr.reduce((acc, line) => acc + BudgetService.computePesoTotal(line), 0);
    const pesoTotal =
      sumPeso(budget.tabela1) +
      sumPeso(budget.tabela2Materiais) +
      sumPeso(budget.tabela2Labor);
    const cots = budget.tabela3.reduce(
      (acc, line) => acc + (line.valor || 0),
      0,
    );
    return pesoTotal * unitPriceBRL + cots;
  }

  public static recalcBudget(budget: IBudget, unitPriceBRL?: number): IBudget {
    const recalculated: IBudget = {
      ...budget,
      tabela1: BudgetService.recalcLines(budget.tabela1),
      tabela2Materiais: BudgetService.recalcLines(budget.tabela2Materiais),
      tabela2Labor: BudgetService.recalcLines(budget.tabela2Labor),
    };
    recalculated.totalValor = BudgetService.computeTotal(
      recalculated,
      unitPriceBRL,
    );
    return recalculated;
  }
}
