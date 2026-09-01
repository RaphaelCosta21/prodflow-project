import {
  addBusinessDays,
  businessDaysBetween,
  isBusinessDay,
} from "../businessDays";

const NO_HOLIDAYS = new Set<string>();

describe("businessDays", () => {
  it("treats weekends as non-business days", () => {
    // 2026-01-03 is a Saturday, 2026-01-04 a Sunday, 2026-01-05 a Monday.
    expect(isBusinessDay(new Date("2026-01-03T00:00:00Z"), NO_HOLIDAYS)).toBe(
      false,
    );
    expect(isBusinessDay(new Date("2026-01-04T00:00:00Z"), NO_HOLIDAYS)).toBe(
      false,
    );
    expect(isBusinessDay(new Date("2026-01-05T00:00:00Z"), NO_HOLIDAYS)).toBe(
      true,
    );
  });

  it("skips a configured holiday", () => {
    const holidays = new Set<string>(["2026-01-05"]);
    expect(isBusinessDay(new Date("2026-01-05T00:00:00Z"), holidays)).toBe(
      false,
    );
  });

  it("adds business days jumping over the weekend", () => {
    // Friday 2026-01-02 + 1 business day = Monday 2026-01-05.
    const result = addBusinessDays(
      new Date("2026-01-02T00:00:00Z"),
      1,
      NO_HOLIDAYS,
    );
    expect(result.toISOString().slice(0, 10)).toBe("2026-01-05");
  });

  it("returns the same day when adding zero days", () => {
    const result = addBusinessDays(
      new Date("2026-01-02T00:00:00Z"),
      0,
      NO_HOLIDAYS,
    );
    expect(result.toISOString().slice(0, 10)).toBe("2026-01-02");
  });

  it("skips New Year (national holiday) by default", () => {
    // 2025-12-31 (Wed) + 1 business day must land on 2026-01-02 (Fri), not Jan 1st.
    const result = addBusinessDays(new Date("2025-12-31T00:00:00Z"), 1);
    expect(result.toISOString().slice(0, 10)).toBe("2026-01-02");
  });

  it("counts business days between two dates", () => {
    // Mon 2026-01-05 → Mon 2026-01-12 spans 5 business days.
    expect(
      businessDaysBetween(
        new Date("2026-01-05T00:00:00Z"),
        new Date("2026-01-12T00:00:00Z"),
        NO_HOLIDAYS,
      ),
    ).toBe(5);
  });

  it("returns 0 when the end date is not after the start", () => {
    expect(
      businessDaysBetween(
        new Date("2026-01-12T00:00:00Z"),
        new Date("2026-01-05T00:00:00Z"),
        NO_HOLIDAYS,
      ),
    ).toBe(0);
  });
});
