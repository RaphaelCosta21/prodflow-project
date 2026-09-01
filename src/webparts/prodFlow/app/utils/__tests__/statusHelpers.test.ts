import { canTransition, nextRequestStatuses } from "../statusHelpers";

describe("statusHelpers", () => {
  it("allows the happy path through phase 1", () => {
    expect(canTransition("Draft", "Budgeting")).toBe(true);
    expect(canTransition("Budgeting", "BudgetReview")).toBe(true);
    expect(canTransition("BudgetReview", "Submitted")).toBe(true);
    expect(canTransition("Submitted", "Approved")).toBe(true);
  });

  it("blocks skipping steps", () => {
    expect(canTransition("Draft", "Submitted")).toBe(false);
    expect(canTransition("Budgeting", "Approved")).toBe(false);
  });

  it("allows reworking a rejected budget", () => {
    expect(canTransition("Rejected", "Budgeting")).toBe(true);
  });

  it("exposes OnHold/Cancelled from active states", () => {
    const next = nextRequestStatuses("Budgeting");
    expect(next.indexOf("OnHold")).toBeGreaterThanOrEqual(0);
    expect(next.indexOf("Cancelled")).toBeGreaterThanOrEqual(0);
  });

  it("does not allow leaving terminal states", () => {
    expect(nextRequestStatuses("Closed")).toHaveLength(0);
    expect(nextRequestStatuses("Cancelled")).toHaveLength(0);
    expect(canTransition("Closed", "Budgeting")).toBe(false);
  });
});
