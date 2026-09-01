import { IBudget, IBudgetLine } from "../../models";
import { BudgetService } from "../BudgetService";
import { CONTRACT_WEIGHTS } from "../../config/contractWeights";

const line = (qtd: number, peso: number): IBudgetLine => ({
  descricao: "linha",
  qtd,
  peso,
  pesoTotal: 0,
});

const budget = (over: Partial<IBudget> = {}): IBudget => ({
  contrato: "4600684130",
  numeroOrcamento: "1.2026",
  tabela1: [],
  tabela2Materiais: [],
  tabela2Labor: [],
  tabela3: [],
  totalValor: 0,
  ...over,
});

describe("BudgetService", () => {
  it("computes pesoTotal as qtd × peso", () => {
    expect(BudgetService.computePesoTotal(line(75, 0.003552))).toBeCloseTo(
      0.2664,
      6,
    );
  });

  it("treats empty quantities as zero", () => {
    expect(BudgetService.computePesoTotal(line(0, 0.5))).toBe(0);
  });

  it("sums table 2 from materials + labor", () => {
    const b = budget({
      tabela2Materiais: [line(75, 0.003552)],
      tabela2Labor: [line(197, 0.02183)],
    });
    expect(BudgetService.pesoTotalTable2(b)).toBeCloseTo(0.2664 + 4.30051, 5);
  });

  it("prices each table with its own contract unit price", () => {
    const b = budget({
      tabela2Materiais: [line(1, 1)],
      tabela1: [line(1, 1)],
    });
    expect(BudgetService.valorTable2(b)).toBe(
      CONTRACT_WEIGHTS.unitPriceTable2BRL,
    );
    expect(BudgetService.valorTable1(b)).toBe(
      CONTRACT_WEIGHTS.unitPriceTable1BRL,
    );
  });

  it("adds COTS as a direct value", () => {
    const b = budget({
      tabela3: [{ categoria: "Sensor", valor: 1500 }],
    });
    expect(BudgetService.valorTable3(b)).toBe(1500);
    expect(BudgetService.computeTotal(b)).toBe(1500);
  });

  it("recalculates every line and the grand total", () => {
    const b = budget({
      tabela2Materiais: [line(2, 0.5)],
      tabela3: [{ categoria: "COTS", valor: 100 }],
    });
    const result = BudgetService.recalcBudget(b);
    expect(result.tabela2Materiais[0].pesoTotal).toBe(1);
    expect(result.totalValor).toBe(
      1 * CONTRACT_WEIGHTS.unitPriceTable2BRL + 100,
    );
  });

  it("reproduces the reference budget from the official template", () => {
    // Quantities from the sample report; pesos come from the immutable .xlsx.
    const b = budget({
      tabela2Materiais: [
        line(75, 0.003552),
        line(5, 0.002086),
        line(38, 0.006563),
        line(8, 0.004671),
        line(2, 0.006517),
      ],
      tabela2Labor: [line(197, 0.02183), line(22, 0.016227)],
    });
    expect(BudgetService.pesoTotalTable2(b)).toBeCloseTo(5.23413, 5);
    expect(BudgetService.computeTotal(b)).toBeCloseTo(99935.24, 1);
  });
});
