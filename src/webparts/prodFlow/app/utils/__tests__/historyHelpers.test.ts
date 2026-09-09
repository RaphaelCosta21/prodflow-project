import { IFabricationRequest, ISubItem } from "../../models";
import {
  recordStatusChange,
  recordSubItemStatusChange,
} from "../historyHelpers";
import { createEmptyBudget, createEmptyFinancials } from "../requestFactory";

const subItem = (over: Partial<ISubItem> = {}): ISubItem =>
  ({
    id: "s1",
    level: 1,
    pn: "PN-1",
    qtd: 1,
    descricao: "peça",
    drawing: { code: "", revision: "" },
    attendance: "Interna",
    complexity: "Média",
    status: "NotStarted",
    fabChecklist: [],
    ...over,
  }) as ISubItem;

const request = (
  over: Partial<IFabricationRequest> = {},
): IFabricationRequest =>
  ({
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
    status: "InDelineation",
    dates: {},
    budget: createEmptyBudget(),
    financials: createEmptyFinancials(),
    subItems: [],
    history: [],
    attachments: [],
    ...over,
  }) as IFabricationRequest;

describe("recordStatusChange", () => {
  it("registra ordem, de→para, autor e observação", () => {
    const draft = request();
    recordStatusChange(draft, "Submitted", "Ana", "enviado à Petrobras");

    expect(draft.status).toBe("Submitted");
    expect(draft.statusHistory).toHaveLength(1);
    expect(draft.statusHistory?.[0]).toMatchObject({
      id: 1,
      status: "Submitted",
      from: "InDelineation",
      actor: "Ana",
      note: "enviado à Petrobras",
    });
    expect(draft.history).toHaveLength(1);
    expect(draft.history[0].by).toBe("Ana");
  });

  it("fecha o intervalo anterior ao abrir o próximo", () => {
    const draft = request();
    recordStatusChange(draft, "Submitted", "Ana");
    recordStatusChange(draft, "Approved", "Bruno");

    expect(draft.statusHistory?.[0].end).toBeDefined();
    expect(draft.statusHistory?.[1].end).toBeUndefined();
    expect(draft.statusHistory?.[1].id).toBe(2);
  });

  it("sincroniza a fase ao entrar na execução", () => {
    const draft = request({ status: "ReleasedForFabrication" });
    recordStatusChange(draft, "InFabrication", "Ana");

    expect(draft.phase).toBe(2);
    expect(draft.phaseHistory?.[draft.phaseHistory.length - 1].phase).toBe(2);
  });

  it("guarda e limpa o status de retomada no OnHold", () => {
    const draft = request({ status: "InDelineation" });
    recordStatusChange(draft, "OnHold", "Ana", "aguardando cliente");
    expect(draft.resumeStatus).toBe("InDelineation");

    recordStatusChange(draft, "InDelineation", "Ana");
    expect(draft.resumeStatus).toBeUndefined();
  });

  it("ignora transições para o mesmo status", () => {
    const draft = request();
    recordStatusChange(draft, "InDelineation", "Ana");
    expect(draft.history).toHaveLength(0);
  });
});

describe("recordSubItemStatusChange", () => {
  it("registra a mudança no sub-item e no log do FID", () => {
    const item = subItem();
    const draft = request({ subItems: [item] });
    recordSubItemStatusChange(draft, item, "InQuotation", "Ana", "scm");

    expect(item.status).toBe("InQuotation");
    expect(item.ownerTeam).toBe("scm");
    expect(item.statusHistory?.[0]).toMatchObject({
      id: 1,
      status: "InQuotation",
      from: "NotStarted",
      team: "scm",
      actor: "Ana",
    });
    expect(draft.history).toHaveLength(1);
    expect(draft.history[0].type).toBe("subitem:status");
  });

  it("guarda o status de retomada no OnHold do sub-item", () => {
    const item = subItem({ status: "InFabrication" });
    const draft = request({ subItems: [item] });
    recordSubItemStatusChange(draft, item, "OnHold", "Ana");
    expect(item.resumeStatus).toBe("InFabrication");

    recordSubItemStatusChange(draft, item, "InFabrication", "Ana");
    expect(item.resumeStatus).toBeUndefined();
  });
});
