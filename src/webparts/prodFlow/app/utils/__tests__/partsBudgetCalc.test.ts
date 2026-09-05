import { calcPartsCost, sumPartsBudget } from "../partsBudgetCalc";
import { IPartsBudgetLine } from "../../models";

const line = (over: Partial<IPartsBudgetLine>): IPartsBudgetLine => ({
  subItemId: "s1",
  item: 1,
  descricao: "item",
  qtd: 1,
  unidade: "Und.",
  valorUnit: 0,
  pisCofinsUnit: 0,
  issUnit: 0,
  impostosUnit: 0,
  custoTotalUnit: 0,
  total: 0,
  ...over,
});

describe("partsBudgetCalc", () => {
  // Valores conferidos contra o docx "Relatório de Orçamento de Partes e Peças - OS".
  it("reproduz a linha de R$ 14,49 × 24 do relatório oficial", () => {
    const r = calcPartsCost(14.49, 24);
    expect(r.pisCofinsUnit).toBeCloseTo(1.22, 2);
    expect(r.issUnit).toBeCloseTo(0.26, 2);
    expect(r.impostosUnit).toBeCloseTo(1.48, 2);
    expect(r.custoTotalUnit).toBeCloseTo(14.63, 2);
    expect(r.total).toBeCloseTo(351.1, 1);
  });

  it("reproduz a linha do anodo de R$ 412,00 × 12", () => {
    const r = calcPartsCost(412, 12);
    expect(r.custoTotalUnit).toBeCloseTo(415.95, 2);
    expect(r.total).toBeCloseTo(4991.43, 2);
  });

  it("aplica o multiplicador único 0,9075 × 1,1125", () => {
    expect(calcPartsCost(10, 1).total).toBeCloseTo(10.0959375, 7);
  });

  it("zera quando não há valor cotado", () => {
    const r = calcPartsCost(0, 5);
    expect(r.total).toBe(0);
    expect(r.impostosUnit).toBe(0);
  });

  it("soma o total do relatório", () => {
    expect(
      sumPartsBudget([line({ total: 351.1 }), line({ total: 4991.43 })]),
    ).toBeCloseTo(5342.53, 2);
  });
});
