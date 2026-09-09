import { canTeamTransition, phaseOfStatus } from "../statusHelpers";
import { subItemOwnersOf } from "../../config/statusOwners";

describe("canTeamTransition", () => {
  it("permite quando o usuário está no time dono", () => {
    expect(canTeamTransition("InDelineation", ["planning"], false)).toBe(true);
    expect(canTeamTransition("Submitted", ["projects"], false)).toBe(true);
  });

  it("bloqueia quando o usuário não é do time dono", () => {
    expect(canTeamTransition("Approved", ["quality"], false)).toBe(false);
  });

  it("libera admin em qualquer transição", () => {
    expect(canTeamTransition("Submitted", ["workshop"], true)).toBe(true);
  });
});

describe("subItemOwnersOf", () => {
  it("entrega os status de compra ao time de Compras", () => {
    expect(subItemOwnersOf("Buy")).toEqual(["purchasing", "scm"]);
  });

  it("entrega os status de fabricação ao Planejamento/Eng. Industrial", () => {
    expect(subItemOwnersOf("Make")).toEqual([
      "planning",
      "industrialEngineering",
    ]);
  });

  it("não atribui dono para linhas pai", () => {
    expect(subItemOwnersOf("NA")).toHaveLength(0);
  });
});

describe("phaseOfStatus", () => {
  it("mapeia status de orçamentação para a fase 1", () => {
    expect(phaseOfStatus("InDelineation")).toBe(1);
    expect(phaseOfStatus("ReleasedForFabrication")).toBe(1);
    expect(phaseOfStatus("ReleasedForProcurement")).toBe(1);
  });

  it("mapeia status de execução para a fase 2", () => {
    expect(phaseOfStatus("InFabrication")).toBe(2);
    expect(phaseOfStatus("InProcurement")).toBe(2);
    expect(phaseOfStatus("Delivered")).toBe(2);
  });

  it("não força fase nos status transversais", () => {
    expect(phaseOfStatus("OnHold")).toBeUndefined();
  });
});
