import { describe, expect, it } from "vitest";
import { countBusinessDaysInclusive, formatAhaDate, getLocalDateString } from "../date-utils";

describe("date-utils", () => {
  it("formats date-only strings without shifting the calendar day", () => {
    expect(formatAhaDate("2026-01-01")).toBe("Jan 1, 2026");
  });

  it("uses the local calendar date instead of UTC when formatting today", () => {
    expect(getLocalDateString(new Date("2026-04-08T00:30:00-07:00"))).toBe("2026-04-08");
  });

  it("counts business days inclusively", () => {
    expect(countBusinessDaysInclusive("2024-01-08", "2024-01-19")).toBe(10);
  });

  it("skips weekends when counting inclusive business days", () => {
    expect(countBusinessDaysInclusive("2024-01-12", "2024-01-15")).toBe(2);
  });
});
