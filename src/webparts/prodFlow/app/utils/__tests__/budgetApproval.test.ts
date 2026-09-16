import { IFabricationRequest, ISubItem } from "../../models";
import {
  allReportsApproved,
  blockingReasons,
  budgetStageNavState,
  canReopenStage,
  listBudgetReports,
  reportEditability,
  stageReadiness,
  stageState,
} from "../budgetApproval";
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
  status: "NotStarted",
  fabChecklist: [],
  ...over,
});

const request = (over: Partial<IFabricationRequest>): IFabricationRequest => ({
  fid: "FID0000001",
  osNumber: "6000000000",
  projeto: "CIDEQ",
  tituloProjeto: "Projeto teste",
  drawing: { code: "", revision: "" },
  descricao: "teste",
  tipoOrcamento: "Fabricação",
  complexidadeUsinagem: "Média",
  complexidadeCaldeiraria: "Média",
  complexidadeGeral: "Média",
  atendimento: "Interna",
  phase: 1,
  status: "InDelineation",
  dates: {},
  budget: createEmptyBudget(),
  financials: createEmptyFinancials(),
  subItems: [],
  history: [],
  attachments: [],
  ...over,
});

const inHouse = subItem({
  id: "m1",
  pn: "PN-MAKE",
  strategy: "Make",
  makeSite: "InHouse",
  startedAt: "2026-01-01T00:00:00.000Z",
  status: "Delineated",
});
const subcon = subItem({
  id: "m2",
  pn: "PN-SUBCON",
  strategy: "Make",
  makeSite: "Subcon",
  startedAt: "2026-01-01T00:00:00.000Z",
  status: "Quoted",
});
const buy = subItem({
  id: "b1",
  pn: "PN-BUY",
  strategy: "Buy",
  startedAt: "2026-01-01T00:00:00.000Z",
  status: "Quoted",
});

const projects = { teams: ["projects" as const], isAdmin: false };
const scm = { teams: ["scm" as const], isAdmin: false };
const planning = { teams: ["planning" as const], isAdmin: false };
const engenharia = {
  teams: ["industrialEngineering" as const],
  isAdmin: false,
};

describe("listBudgetReports", () => {
  it("roteia Make·InHouse para Delin. Fabricação e Make·SUBCON para Cotações", () => {
    const refs = listBudgetReports(
      request({ subItems: [inHouse, subcon, buy] }),
    );
    expect(refs.map((r) => r.key)).toEqual(["fab:m1", "fab:m2", "parts"]);
    expect(refs[0].stage).toBe("delineation");
    expect(refs[1].stage).toBe("quotations");
    expect(refs[2].stage).toBe("quotations");
  });

  it("não gera relatório de partes quando não há linha Buy", () => {
    const refs = listBudgetReports(request({ subItems: [inHouse] }));
    expect(refs).toHaveLength(1);
  });
});

describe("stageState", () => {
  it("trata FID anterior ao fluxo como concluído para não perder o check", () => {
    const legacy = request({ phase: 2, status: "InFabrication" });
    expect(stageState(legacy, "delineation").concluido).toBe(true);
    expect(stageState(legacy, "quotations").concluido).toBe(true);
  });

  it("começa em aberto num FID novo em orçamentação", () => {
    expect(stageState(request({}), "quotations").concluido).toBe(false);
  });

  it("prioriza o registro gravado sobre a regra de compatibilidade", () => {
    const draft = request({
      phase: 2,
      status: "InFabrication",
      budgetStages: { delineation: { concluido: false } },
    });
    expect(stageState(draft, "delineation").concluido).toBe(false);
  });
});

describe("stageReadiness", () => {
  it("cobra a análise da Eng. Industrial e o delineamento dos itens internos", () => {
    const draft = request({
      subItems: [subItem({ ...inHouse, status: "FabDelineation" })],
    });
    const { ok, pendencias } = stageReadiness(draft, "delineation");
    expect(ok).toBe(false);
    expect(pendencias).toHaveLength(2);
  });

  it("libera o delineamento quando a análise marca que não há make interno", () => {
    const draft = request({
      subItems: [buy],
      fabAnalysis: {
        concluidoPor: "Ana",
        concluidoEm: "2026-01-02T00:00:00.000Z",
        semMakeInterno: true,
      },
    });
    expect(stageReadiness(draft, "delineation").ok).toBe(true);
  });

  it("cobra estratégia, início, cotação e o mínimo de cotações na etapa de Cotações", () => {
    const draft = request({
      subItems: [
        subItem({ id: "x1", strategy: undefined }),
        subItem({ id: "x2", strategy: "Buy" }),
        subItem({
          id: "x3",
          strategy: "Buy",
          startedAt: "2026-01-01T00:00:00.000Z",
          status: "InQuotation",
        }),
      ],
    });
    const { pendencias } = stageReadiness(draft, "quotations");
    expect(pendencias).toHaveLength(4);
    expect(pendencias[3]).toContain("menos de 3 cotações");
  });
});

describe("reportEditability", () => {
  const draft = request({
    subItems: [inHouse, subcon, buy],
    budgetStages: { quotations: { concluido: true } },
  });
  const refs = listBudgetReports(draft);
  const [fabInHouse, fabSubcon, parts] = refs;

  it("bloqueia a máscara do Make·InHouse e a tabela de partes", () => {
    expect(reportEditability(draft, fabInHouse, planning).tablesEditable).toBe(
      false,
    );
    expect(reportEditability(draft, parts, planning).tablesEditable).toBe(
      false,
    );
  });

  it("libera a máscara do SUBCON para Planejamento após Cotações concluída", () => {
    expect(reportEditability(draft, fabSubcon, planning).tablesEditable).toBe(
      true,
    );
    expect(reportEditability(draft, fabSubcon, projects).tablesEditable).toBe(
      true,
    );
    expect(reportEditability(draft, fabSubcon, scm).tablesEditable).toBe(false);
  });

  it("segura a máscara do SUBCON enquanto Cotações não fecha", () => {
    const aberto = request({ subItems: [subcon] });
    const ref = listBudgetReports(aberto)[0];
    const edit = reportEditability(aberto, ref, planning);
    expect(edit.tablesEditable).toBe(false);
    expect(edit.reason).toContain("Cotações");
  });

  it("reabre a máscara do SUBCON quando o relatório entra em revisão", () => {
    const emRevisao = request({
      subItems: [subcon],
      budgetReviews: [
        {
          key: "fab:m2",
          kind: "fabrication",
          subItemId: "m2",
          stage: "quotations",
          status: "revision",
          revisaoAtual: {
            motivo: "Preço acima do previsto",
            solicitadoPor: "Bruno",
            solicitadoEm: "2026-02-01T00:00:00.000Z",
            stage: "quotations",
          },
        },
      ],
    });
    const ref = listBudgetReports(emRevisao)[0];
    expect(reportEditability(emRevisao, ref, planning).tablesEditable).toBe(
      true,
    );
  });

  it("trava tudo depois de aprovado", () => {
    const aprovado = request({
      subItems: [subcon],
      budgetStages: { quotations: { concluido: true } },
      budgetReviews: [
        {
          key: "fab:m2",
          kind: "fabrication",
          subItemId: "m2",
          stage: "quotations",
          status: "approved",
          aprovadoPor: "Bruno",
          aprovadoEm: "2026-02-01T00:00:00.000Z",
        },
      ],
    });
    const edit = reportEditability(aprovado, listBudgetReports(aprovado)[0], {
      teams: [],
      isAdmin: true,
    });
    expect(edit.headerEditable).toBe(false);
    expect(edit.tablesEditable).toBe(false);
  });
});

describe("aprovação e navegação", () => {
  const base = request({
    subItems: [inHouse, buy],
    budgetStages: {
      delineation: { concluido: true },
      quotations: { concluido: true },
    },
  });

  it("marca as abas concluídas como done e bloqueia o envio até aprovar", () => {
    expect(budgetStageNavState(base)).toEqual({
      delineation: "done",
      quotations: "done",
    });
    expect(allReportsApproved(base)).toBe(false);
    expect(blockingReasons(base)).toEqual([
      "2 relatório(s) aguardando aprovação do time de Projects.",
    ]);
  });

  it("aprova tudo e libera o envio", () => {
    const aprovado = {
      ...base,
      budgetReviews: listBudgetReports(base).map((ref) => ({
        key: ref.key,
        kind: ref.kind,
        subItemId: ref.subItem?.id,
        stage: ref.stage,
        status: "approved" as const,
      })),
    };
    expect(allReportsApproved(aprovado)).toBe(true);
    expect(blockingReasons(aprovado)).toEqual([]);
    expect(budgetStageNavState(aprovado).reports).toBe("done");
  });

  it("troca o check pela revisão na aba de origem", () => {
    const emRevisao = {
      ...base,
      budgetStages: {
        delineation: { concluido: false, revisionCount: 1 },
        quotations: { concluido: true },
      },
      budgetReviews: [
        {
          key: "fab:m1",
          kind: "fabrication" as const,
          subItemId: "m1",
          stage: "delineation" as const,
          status: "revision" as const,
          revisaoAtual: {
            motivo: "HH de usinagem subestimado",
            solicitadoPor: "Bruno",
            solicitadoEm: "2026-02-01T00:00:00.000Z",
            stage: "delineation" as const,
          },
        },
      ],
    };
    const nav = budgetStageNavState(emRevisao);
    expect(nav.delineation).toBe("revision");
    expect(nav.quotations).toBe("done");
    expect(nav.reports).toBe("revision");
    expect(blockingReasons(emRevisao)).toEqual([
      "Etapa Delin. Fabricação não foi concluída.",
      "1 relatório(s) em revisão.",
      "1 relatório(s) aguardando aprovação do time de Projects.",
    ]);
  });
});

describe("canReopenStage", () => {
  const base = request({
    subItems: [inHouse, buy],
    budgetStages: {
      delineation: { concluido: true },
      quotations: { concluido: true },
    },
  });

  it("permite ao dono da etapa reabrir antes de qualquer aprovação", () => {
    expect(canReopenStage(base, "delineation", engenharia)).toBe(true);
    expect(canReopenStage(base, "quotations", scm)).toBe(true);
    expect(canReopenStage(base, "delineation", scm)).toBe(false);
  });

  it("bloqueia a reabertura depois que um relatório da etapa foi aprovado", () => {
    const aprovado = {
      ...base,
      budgetReviews: [
        {
          key: "fab:m1",
          kind: "fabrication" as const,
          subItemId: "m1",
          stage: "delineation" as const,
          status: "approved" as const,
        },
      ],
    };
    expect(canReopenStage(aprovado, "delineation", engenharia)).toBe(false);
    expect(canReopenStage(aprovado, "quotations", scm)).toBe(true);
  });
});
