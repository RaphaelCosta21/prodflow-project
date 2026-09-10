import { IFabricationRequest, ISubItem } from "../../models";
import {
  isHybridByStrategies,
  pendingDefinitions,
  recomputeBudgetSla,
  subItemAttendanceOf,
  syncAttendanceFromStrategies,
} from "../classification";
import { SlaService } from "../../services/SlaService";
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
  drawing: { code: "", revision: "" },
  descricao: "teste",
  tipoOrcamento: "Fabricação",
  complexidadeUsinagem: "Média",
  complexidadeCaldeiraria: "Média",
  complexidadeGeral: "Média",
  atendimento: "Interna",
  phase: 1,
  status: "InDelineation",
  dates: { solicitacaoOrcamento: "2026-01-05" },
  budget: createEmptyBudget(),
  financials: createEmptyFinancials(),
  subItems: [],
  history: [],
  attachments: [],
  ...over,
});

const inHouse = subItem({ id: "a", strategy: "Make", makeSite: "InHouse" });
const subcon = subItem({ id: "b", strategy: "Make", makeSite: "Subcon" });

describe("SlaService.prazoDiasUteis", () => {
  it("usa o pior caso entre os dois lados quando o atendimento é Híbrido", () => {
    expect(SlaService.prazoDiasUteis("Média", "Híbrido")).toBe(10);
    expect(SlaService.prazoDiasUteis("Alta", "Híbrido")).toBe(15);
  });

  it("não tem prazo enquanto o atendimento estiver A definir", () => {
    expect(SlaService.prazoDiasUteis("Alta", "A definir")).toBe(0);
  });
});

describe("isHybridByStrategies", () => {
  it("exige Make·IH e Make·SUB na mesma BOM", () => {
    expect(isHybridByStrategies([inHouse])).toBe(false);
    expect(isHybridByStrategies([subcon])).toBe(false);
    expect(isHybridByStrategies([inHouse, subcon])).toBe(true);
  });

  it("ignora linhas Buy", () => {
    expect(
      isHybridByStrategies([inHouse, subItem({ id: "c", strategy: "Buy" })]),
    ).toBe(false);
  });
});

describe("syncAttendanceFromStrategies", () => {
  it("define Híbrido e recalcula o prazo quando a regra dispara", () => {
    const draft = request({ subItems: [inHouse, subcon] });
    syncAttendanceFromStrategies(draft, "Tester");

    expect(draft.atendimento).toBe("Híbrido");
    expect(draft.dates.prazoDiasUteis).toBe(10);
    expect(draft.history).toHaveLength(1);
    expect(draft.history[0].type).toBe("classification:auto");
  });

  it("não registra histórico quando já está Híbrido", () => {
    const draft = request({
      atendimento: "Híbrido",
      subItems: [inHouse, subcon],
    });
    syncAttendanceFromStrategies(draft, "Tester");

    expect(draft.history).toHaveLength(0);
  });
});

describe("recomputeBudgetSla", () => {
  it("congela o prazo depois do envio do orçamento", () => {
    const draft = request({
      atendimento: "Externa",
      dates: {
        solicitacaoOrcamento: "2026-01-05",
        dataEnvioPetrobras: "2026-01-08",
        prazoDiasUteis: 3,
      },
      complexidadeUsinagem: "Alta",
    });
    recomputeBudgetSla(draft);

    expect(draft.complexidadeGeral).toBe("Alta");
    expect(draft.dates.prazoDiasUteis).toBe(3);
  });

  it("limpa o prazo quando volta para A definir", () => {
    const draft = request({
      atendimento: "A definir",
      dates: { solicitacaoOrcamento: "2026-01-05", prazoDiasUteis: 3 },
    });
    recomputeBudgetSla(draft);

    expect(draft.dates.prazoDiasUteis).toBe(0);
    expect(draft.dates.prazoEnvioPetrobras).toBeUndefined();
  });
});

describe("pendingDefinitions", () => {
  it("lista apenas os campos ainda como A definir", () => {
    expect(
      pendingDefinitions(
        request({
          complexidadeUsinagem: "A definir",
          atendimento: "A definir",
        }),
      ),
    ).toEqual(["complexidadeUsinagem", "atendimento"]);
    expect(pendingDefinitions(request({}))).toEqual([]);
  });
});

describe("subItemAttendanceOf", () => {
  it("deriva do lado de execução da linha quando há makeSite", () => {
    expect(subItemAttendanceOf("Híbrido", "Subcon")).toBe("Externa");
    expect(subItemAttendanceOf("Externa", "InHouse")).toBe("Interna");
  });

  it("cai para Interna quando o cabeçalho ainda não decidiu", () => {
    expect(subItemAttendanceOf("A definir")).toBe("Interna");
    expect(subItemAttendanceOf("Híbrido")).toBe("Interna");
    expect(subItemAttendanceOf("Externa")).toBe("Externa");
  });
});
