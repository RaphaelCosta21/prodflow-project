import { IFabricationRequest, ISubItem } from "../../models";
import { recomputeFinancials } from "../financialsRollup";
import { derivePartsBudget } from "../partsBudgetBuilder";
import { createEmptyBudget, createEmptyFinancials } from "../requestFactory";

const subItem = (over: Partial<ISubItem>): ISubItem => ({
  id: "s1",
  level: 2,
  pn: "PN-1",
  qtd: 1,
  descricao: "peça",
  drawing: { code: "", revision: "" },
  attendance: "Interna",
  complexity: "Média",
  status: "Costed",
  fabChecklist: [],
  ...over,
});

const request = (over: Partial<IFabricationRequest>): IFabricationRequest => ({
  fid: "FID0000001",
  osNumber: "6000000000",
  projeto: "CIDEQ",
  drawing: { code: "", revision: "" },
  descricao: "teste",
  tipoOrcamento: "Fabricação",
  complexidadeUsinagem: "Média",
  complexidadeCaldeiraria: "Média",
  complexidadeGeral: "Média",
  atendimento: "Interna",
  phase: 1,
  status: "Budgeting",
  dates: {},
  budget: createEmptyBudget(),
  financials: createEmptyFinancials(),
  subItems: [],
  history: [],
  attachments: [],
  ...over,
});

describe("recomputeFinancials", () => {
  it("leva o valor do pacote vencedor para o custo do item Buy", () => {
    const draft = request({
      subItems: [subItem({ id: "b1", strategy: "Buy", qtd: 2 })],
      quotationPackages: [
        {
          id: "q1",
          supplier: "Fornecedor A",
          moeda: "BRL",
          attachments: [],
          coveredSubItemIds: ["b1"],
          lines: [{ subItemId: "b1", qtd: 2, valorUnit: 100, valorTotal: 200 }],
        },
      ],
    });
    draft.partsBudget = derivePartsBudget(draft);
    recomputeFinancials(draft);

    expect(draft.subItems[0].partesEPecas).toBe(200);
    expect(draft.subItems[0].custoTotal).toBe(200);
    // 100 × 0,9075 × 1,1125 × 2
    expect(draft.financials.orcamentoOceaneering).toBeCloseTo(201.92, 2);
  });

  it("usa a cotação SUBCON como orçamento usinando", () => {
    const draft = request({
      subItems: [
        subItem({ id: "m1", strategy: "Make", makeSite: "Subcon", qtd: 1 }),
      ],
      quotationPackages: [
        {
          id: "q1",
          supplier: "Usinando",
          moeda: "BRL",
          attachments: [],
          coveredSubItemIds: ["m1"],
          lines: [
            { subItemId: "m1", qtd: 1, valorUnit: 5000, valorTotal: 5000 },
          ],
        },
      ],
    });
    recomputeFinancials(draft);

    expect(draft.subItems[0].orcamentoUsinando).toBe(5000);
    expect(draft.subItems[0].custoTotal).toBe(5000);
  });

  it("soma os relatórios de fabricação com o de partes e peças", () => {
    const draft = request({
      subItems: [
        subItem({
          id: "m1",
          strategy: "Make",
          makeSite: "InHouse",
          fabricationBudget: {
            subItemId: "m1",
            contrato: "x",
            numeroOrcamento: "1",
            tabela1: [],
            tabela2Materiais: [
              { descricao: "aço", qtd: 1, peso: 1, pesoTotal: 1 },
            ],
            tabela2Labor: [],
            totalValor: 0,
          },
        }),
        subItem({ id: "b1", strategy: "Buy", qtd: 1 }),
      ],
      quotationPackages: [
        {
          id: "q1",
          supplier: "A",
          moeda: "BRL",
          attachments: [],
          coveredSubItemIds: ["b1"],
          lines: [{ subItemId: "b1", qtd: 1, valorUnit: 100, valorTotal: 100 }],
        },
      ],
    });
    draft.partsBudget = derivePartsBudget(draft);
    recomputeFinancials(draft);

    // Tabela 2 = peso 1 × 19093 + partes e peças (100 × 1,00959375)
    expect(draft.financials.orcamentoOceaneering).toBeCloseTo(19193.96, 2);
    expect(draft.financials.multaExposicao30).toBeCloseTo(
      0.3 * draft.financials.orcamentoOceaneering,
      2,
    );
  });

  it("ignora itens N/A no orçamento", () => {
    const draft = request({
      subItems: [subItem({ id: "p1", level: 1, strategy: "NA" })],
    });
    draft.partsBudget = derivePartsBudget(draft);
    recomputeFinancials(draft);

    expect(draft.partsBudget.lines).toHaveLength(0);
    expect(draft.financials.orcamentoOceaneering).toBe(0);
  });
});
