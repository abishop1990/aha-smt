import { describe, it, expect } from "vitest";
import { calculateMemberCapacities, type DayOffEntry } from "../capacity";
import type { AhaFeature } from "../aha-types";

function makeFeature(
  userId: string,
  userName: string,
  overrides: Partial<AhaFeature> = {}
): AhaFeature {
  return {
    id: `feat-${userId}`,
    reference_num: `FEAT-${userId}`,
    name: "Test Feature",
    position: 0,
    created_at: "2024-01-01",
    assigned_to_user: { id: userId, name: userName, email: `${userId}@test.com` },
    ...overrides,
  };
}

describe("calculateMemberCapacities", () => {
  it("returns empty object when startDate is null", () => {
    const result = calculateMemberCapacities(null, "2024-01-19", [], [], 1);
    expect(result).toEqual({});
  });

  it("returns empty object when endDate is null", () => {
    const result = calculateMemberCapacities("2024-01-08", null, [], [], 1);
    expect(result).toEqual({});
  });

  it("returns empty object when no features", () => {
    const result = calculateMemberCapacities("2024-01-08", "2024-01-19", [], [], 1);
    expect(result).toEqual({});
  });

  it("calculates capacity for one member with no days off", () => {
    const features = [makeFeature("u1", "Alice")];
    // Mon Jan 8 to Fri Jan 19 = 9 business days (differenceInBusinessDays)
    const result = calculateMemberCapacities(
      "2024-01-08",
      "2024-01-19",
      features,
      [],
      1
    );

    expect(result).toHaveProperty("u1");
    expect(result["u1"].name).toBe("Alice");
    expect(result["u1"].capacity).toBe(9); // 9 biz days * 1 pt/day
    expect(result["u1"].pointsPerDay).toBe(1);
    expect(result["u1"].daysOff).toBe(0);
  });

  it("applies pointsPerDay multiplier", () => {
    const features = [makeFeature("u1", "Alice")];
    const result = calculateMemberCapacities(
      "2024-01-08",
      "2024-01-19",
      features,
      [],
      2
    );

    expect(result["u1"].capacity).toBe(18); // 9 * 2
    expect(result["u1"].pointsPerDay).toBe(2);
  });

  it("deducts personal days off", () => {
    const features = [makeFeature("u1", "Alice")];
    const daysOff: DayOffEntry[] = [
      { userId: "u1", isHoliday: false },
      { userId: "u1", isHoliday: false },
    ];
    const result = calculateMemberCapacities(
      "2024-01-08",
      "2024-01-19",
      features,
      daysOff,
      1
    );

    expect(result["u1"].capacity).toBe(7); // 9 - 2
    expect(result["u1"].daysOff).toBe(2);
  });

  it("deducts holidays from all members", () => {
    const features = [
      makeFeature("u1", "Alice"),
      makeFeature("u2", "Bob"),
    ];
    const daysOff: DayOffEntry[] = [
      { userId: null, isHoliday: true }, // company holiday
    ];
    const result = calculateMemberCapacities(
      "2024-01-08",
      "2024-01-19",
      features,
      daysOff,
      1
    );

    expect(result["u1"].capacity).toBe(8); // 9 - 1 holiday
    expect(result["u1"].daysOff).toBe(1);
    expect(result["u2"].capacity).toBe(8);
    expect(result["u2"].daysOff).toBe(1);
  });

  it("combines personal days off and holidays", () => {
    const features = [makeFeature("u1", "Alice")];
    const daysOff: DayOffEntry[] = [
      { userId: "u1", isHoliday: false }, // 1 personal day
      { userId: null, isHoliday: true },  // 1 holiday
    ];
    const result = calculateMemberCapacities(
      "2024-01-08",
      "2024-01-19",
      features,
      daysOff,
      1
    );

    expect(result["u1"].capacity).toBe(7); // 9 - 1 - 1
    expect(result["u1"].daysOff).toBe(2);
  });

  it("clamps capacity to 0 when days off exceed business days", () => {
    const features = [makeFeature("u1", "Alice")];
    const daysOff: DayOffEntry[] = Array.from({ length: 15 }, () => ({
      userId: "u1" as string,
      isHoliday: false,
    }));
    const result = calculateMemberCapacities(
      "2024-01-08",
      "2024-01-19",
      features,
      daysOff,
      1
    );

    expect(result["u1"].capacity).toBe(0);
  });

  it("only creates entries for assigned members", () => {
    const features = [
      makeFeature("u1", "Alice"),
      {
        ...makeFeature("u2", "Bob"),
        assigned_to_user: null,
      } as AhaFeature,
    ];
    const result = calculateMemberCapacities(
      "2024-01-08",
      "2024-01-19",
      features,
      [],
      1
    );

    expect(Object.keys(result)).toEqual(["u1"]);
  });

  it("deduplicates members across multiple features", () => {
    const features = [
      makeFeature("u1", "Alice"),
      { ...makeFeature("u1", "Alice"), id: "feat-u1-2", reference_num: "FEAT-U1-2" } as AhaFeature,
    ];
    const result = calculateMemberCapacities(
      "2024-01-08",
      "2024-01-19",
      features,
      [],
      1
    );

    expect(Object.keys(result)).toEqual(["u1"]);
  });

  it("does not count other users' days off against a member", () => {
    const features = [
      makeFeature("u1", "Alice"),
      makeFeature("u2", "Bob"),
    ];
    const daysOff: DayOffEntry[] = [
      { userId: "u2", isHoliday: false },
      { userId: "u2", isHoliday: false },
      { userId: "u2", isHoliday: false },
    ];
    const result = calculateMemberCapacities(
      "2024-01-08",
      "2024-01-19",
      features,
      daysOff,
      1
    );

    expect(result["u1"].capacity).toBe(9);
    expect(result["u1"].daysOff).toBe(0);
    expect(result["u2"].capacity).toBe(6);
    expect(result["u2"].daysOff).toBe(3);
  });
});
