import {
  allowedSubItemStatuses,
  executionStatusOf,
  initialSubItemStatus,
  isSubItemCosted,
  requestStatusesFor,
  workflowOf,
} from "../workflows";

describe("workflowOf", () => {
  it("mapeia partes e peças para o fluxo de aquisição", () => {
    expect(workflowOf("Partes e Peças")).toBe("parts");
  });

  it("trata fabricação e tipos customizados como fluxo de fabricação", () => {
    expect(workflowOf("Fabricação")).toBe("fabrication");
    expect(workflowOf("Retrabalho")).toBe("fabrication");
    expect(workflowOf(undefined)).toBe("fabrication");
  });
});

describe("requestStatusesFor", () => {
  it("expõe apenas o portão de liberação do próprio fluxo", () => {
    const fab = requestStatusesFor("fabrication");
    expect(fab.indexOf("ReleasedForFabrication")).toBeGreaterThanOrEqual(0);
    expect(fab.indexOf("ReleasedForProcurement")).toBe(-1);

    const parts = requestStatusesFor("parts");
    expect(parts.indexOf("ReleasedForProcurement")).toBeGreaterThanOrEqual(0);
    expect(parts.indexOf("InFabrication")).toBe(-1);
  });
});

describe("executionStatusOf", () => {
  it("aponta o status que abre a fase 2 de cada fluxo", () => {
    expect(executionStatusOf("fabrication")).toBe("InFabrication");
    expect(executionStatusOf("parts")).toBe("InProcurement");
  });
});

describe("allowedSubItemStatuses", () => {
  it("dá a Buy a mesma trilha nos dois fluxos", () => {
    expect(allowedSubItemStatuses("Buy", undefined, 1)).toEqual([
      "NotStarted",
      "InQuotation",
      "Quoted",
    ]);
    expect(allowedSubItemStatuses("Buy", undefined, 2)).toEqual([
      "WaitingMaterial",
      "InStock",
      "InInspection",
      "Completed",
      "OnHold",
    ]);
  });

  it("usa delineamento na fase 1 de Make", () => {
    expect(allowedSubItemStatuses("Make", "InHouse", 1)).toEqual([
      "NotStarted",
      "FabDelineation",
      "Delineated",
    ]);
  });

  it("só oferece Serviço Externo para Make · SubCon", () => {
    expect(
      allowedSubItemStatuses("Make", "InHouse", 2).indexOf("ExternalService"),
    ).toBe(-1);
    expect(
      allowedSubItemStatuses("Make", "Subcon", 2).indexOf("ExternalService"),
    ).toBeGreaterThanOrEqual(0);
  });

  it("não oferece Em Fabricação para linhas compradas", () => {
    expect(
      allowedSubItemStatuses("Buy", undefined, 2).indexOf("InFabrication"),
    ).toBe(-1);
  });

  it("mantém linhas pai fora do fluxo", () => {
    expect(allowedSubItemStatuses("NA", undefined, 1)).toEqual(["NotStarted"]);
    expect(allowedSubItemStatuses(undefined, undefined, 2)).toEqual([
      "NotStarted",
    ]);
  });
});

describe("initialSubItemStatus", () => {
  it("entrega o primeiro status da fase 2 por estratégia", () => {
    expect(initialSubItemStatus("Buy", undefined, 2)).toBe("WaitingMaterial");
    expect(initialSubItemStatus("Make", "Subcon", 2)).toBe("InFabrication");
  });
});

describe("isSubItemCosted", () => {
  it("reconhece o fim da fase 1 nas duas trilhas", () => {
    expect(isSubItemCosted("Quoted")).toBe(true);
    expect(isSubItemCosted("Delineated")).toBe(true);
    expect(isSubItemCosted("NotStarted")).toBe(false);
    expect(isSubItemCosted("InQuotation")).toBe(false);
  });
});
