import { IBudget, IBudgetLine } from "../models";
import { CONTRACT_WEIGHTS } from "../config/contractWeights";

// Budget math: only QTD/HH is user-editable; Peso is fixed (CONTRACT_WEIGHTS); totals are computed.
// Valor per table uses the contract unit prices baked into the template (Tabela 2 = 19093,
// Tabela 1 = 46071, Tabela 3 = direct value).
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

  private static sumPeso(lines: IBudgetLine[]): number {
    return lines.reduce(
      (acc, line) => acc + BudgetService.computePesoTotal(line),
      0,
    );
  }

  // Tabela 2 (matéria-prima + usinagem/caldeiraria) peso total.
  public static pesoTotalTable2(budget: IBudget): number {
    return (
      BudgetService.sumPeso(budget.tabela2Materiais) +
      BudgetService.sumPeso(budget.tabela2Labor)
    );
  }

  // Tabela 1 (serviços adicionais) peso total.
  public static pesoTotalTable1(budget: IBudget): number {
    return BudgetService.sumPeso(budget.tabela1);
  }

  public static valorTable2(budget: IBudget): number {
    return (
      BudgetService.pesoTotalTable2(budget) *
      CONTRACT_WEIGHTS.unitPriceTable2BRL
    );
  }

  public static valorTable1(budget: IBudget): number {
    return (
      BudgetService.pesoTotalTable1(budget) *
      CONTRACT_WEIGHTS.unitPriceTable1BRL
    );
  }

  public static valorTable3(budget: IBudget): number {
    return budget.tabela3.reduce((acc, line) => acc + (line.valor || 0), 0);
  }

  // Valor Final = Valor(T2) + Valor(T1) + Valor(T3).
  public static computeTotal(budget: IBudget): number {
    return (
      BudgetService.valorTable2(budget) +
      BudgetService.valorTable1(budget) +
      BudgetService.valorTable3(budget)
    );
  }

  public static recalcBudget(budget: IBudget): IBudget {
    const recalculated: IBudget = {
      ...budget,
      tabela1: BudgetService.recalcLines(budget.tabela1),
      tabela2Materiais: BudgetService.recalcLines(budget.tabela2Materiais),
      tabela2Labor: BudgetService.recalcLines(budget.tabela2Labor),
    };
    recalculated.totalValor = BudgetService.computeTotal(recalculated);
    return recalculated;
  }
}
