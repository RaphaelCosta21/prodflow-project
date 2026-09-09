import { canTransition, nextRequestStatuses } from "../statusHelpers";

describe("statusHelpers — fluxo de fabricação", () => {
  it("allows the happy path through both phases", () => {
    expect(canTransition("InDelineation", "Submitted", "fabrication")).toBe(
      true,
    );
    expect(canTransition("Submitted", "Approved", "fabrication")).toBe(true);
    expect(
      canTransition("Approved", "ReleasedForFabrication", "fabrication"),
    ).toBe(true);
    expect(
      canTransition("ReleasedForFabrication", "InFabrication", "fabrication"),
    ).toBe(true);
    expect(canTransition("InFabrication", "Delivered", "fabrication")).toBe(
      true,
    );
  });

  it("blocks skipping steps", () => {
    expect(canTransition("InDelineation", "Approved", "fabrication")).toBe(
      false,
    );
    expect(canTransition("Approved", "InFabrication", "fabrication")).toBe(
      false,
    );
  });

  it("allows reworking a rejected budget", () => {
    expect(canTransition("Rejected", "InDelineation", "fabrication")).toBe(
      true,
    );
  });

  it("treats Serviço Externo as a reversible phase-2 step", () => {
    expect(
      canTransition("InFabrication", "ExternalService", "fabrication"),
    ).toBe(true);
    expect(
      canTransition("ExternalService", "InFabrication", "fabrication"),
    ).toBe(true);
  });

  it("does not offer the parts release gate", () => {
    expect(
      canTransition("Approved", "ReleasedForProcurement", "fabrication"),
    ).toBe(false);
  });
});

describe("statusHelpers — fluxo de partes e peças", () => {
  it("routes approval to the procurement track", () => {
    expect(canTransition("Approved", "ReleasedForProcurement", "parts")).toBe(
      true,
    );
    expect(
      canTransition("ReleasedForProcurement", "InProcurement", "parts"),
    ).toBe(true);
    expect(canTransition("InProcurement", "Delivered", "parts")).toBe(true);
  });

  it("never reaches the fabrication track", () => {
    expect(canTransition("Approved", "ReleasedForFabrication", "parts")).toBe(
      false,
    );
    expect(
      canTransition("ReleasedForProcurement", "InFabrication", "parts"),
    ).toBe(false);
  });
});

describe("statusHelpers — transversais", () => {
  it("exposes OnHold/Cancelled from active states", () => {
    const next = nextRequestStatuses("InDelineation", "fabrication");
    expect(next.indexOf("OnHold")).toBeGreaterThanOrEqual(0);
    expect(next.indexOf("Cancelled")).toBeGreaterThanOrEqual(0);
  });

  it("resumes from OnHold back to the stored status", () => {
    const next = nextRequestStatuses("OnHold", "fabrication", "InFabrication");
    expect(next).toEqual(["InFabrication", "Cancelled"]);
    expect(
      canTransition("OnHold", "Delivered", "fabrication", "InFabrication"),
    ).toBe(false);
  });

  it("does not allow leaving terminal states", () => {
    expect(nextRequestStatuses("Delivered", "fabrication")).toHaveLength(0);
    expect(nextRequestStatuses("Cancelled", "fabrication")).toHaveLength(0);
    expect(canTransition("Delivered", "InDelineation", "fabrication")).toBe(
      false,
    );
  });
});
