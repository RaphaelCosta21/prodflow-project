import { canTeamTransition, phaseOfStatus } from "../statusHelpers";

describe("canTeamTransition", () => {
  it("permite quando o usuário está no time dono", () => {
    expect(canTeamTransition("Budgeting", ["planning"], false)).toBe(true);
  });

  it("bloqueia quando o usuário não é do time dono", () => {
    expect(canTeamTransition("BudgetReview", ["quality"], false)).toBe(false);
  });

  it("libera admin em qualquer transição", () => {
    expect(canTeamTransition("Submitted", ["workshop"], true)).toBe(true);
  });

  it("aceita qualquer time quando o status não tem dono declarado", () => {
    expect(canTeamTransition("FinalInspection", ["quality"], false)).toBe(true);
  });
});

describe("phaseOfStatus", () => {
  it("mapeia status de orçamentação para a fase 1", () => {
    expect(phaseOfStatus("Budgeting")).toBe(1);
  });

  it("mapeia status de produção para a fase 2", () => {
    expect(phaseOfStatus("InProduction")).toBe(2);
  });
});
