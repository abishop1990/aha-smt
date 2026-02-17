import { describe, it, expect, test } from "vitest";
import { getSuggestedPoints, getPointScale, type EstimationCriteria } from "@/lib/constants";

describe("constants", () => {
  describe("getSuggestedPoints", () => {
    // Test all 27 renamed combinations of S/M/L for scope, complexity, unknowns
    test.each([
      // Small scope combinations
      { scope: "S", complexity: "S", unknowns: "S", expected: 1 },
      { scope: "S", complexity: "S", unknowns: "M", expected: 2 },
      { scope: "S", complexity: "S", unknowns: "L", expected: 3 },
      { scope: "S", complexity: "M", unknowns: "S", expected: 2 },
      { scope: "S", complexity: "M", unknowns: "M", expected: 3 },
      { scope: "S", complexity: "M", unknowns: "L", expected: 5 },
      { scope: "S", complexity: "L", unknowns: "S", expected: 3 },
      { scope: "S", complexity: "L", unknowns: "M", expected: 5 },
      { scope: "S", complexity: "L", unknowns: "L", expected: 8 },
      // Medium scope combinations
      { scope: "M", complexity: "S", unknowns: "S", expected: 3 },
      { scope: "M", complexity: "S", unknowns: "M", expected: 5 },
      { scope: "M", complexity: "S", unknowns: "L", expected: 5 },
      { scope: "M", complexity: "M", unknowns: "S", expected: 5 },
      { scope: "M", complexity: "M", unknowns: "M", expected: 8 },
      { scope: "M", complexity: "M", unknowns: "L", expected: 8 },
      { scope: "M", complexity: "L", unknowns: "S", expected: 8 },
      { scope: "M", complexity: "L", unknowns: "M", expected: 13 },
      { scope: "M", complexity: "L", unknowns: "L", expected: 13 },
      // Large scope combinations
      { scope: "L", complexity: "S", unknowns: "S", expected: 5 },
      { scope: "L", complexity: "S", unknowns: "M", expected: 8 },
      { scope: "L", complexity: "S", unknowns: "L", expected: 13 },
      { scope: "L", complexity: "M", unknowns: "S", expected: 8 },
      { scope: "L", complexity: "M", unknowns: "M", expected: 13 },
      { scope: "L", complexity: "M", unknowns: "L", expected: 13 },
      { scope: "L", complexity: "L", unknowns: "S", expected: 13 },
      { scope: "L", complexity: "L", unknowns: "M", expected: 21 },
      { scope: "L", complexity: "L", unknowns: "L", expected: 21 },
      // Extra Large scope
      { scope: "XL", complexity: "XL", unknowns: "XL", expected: 21 },
    ] as Array<EstimationCriteria & { expected: number }>)(
      "returns $expected for scope=$scope, complexity=$complexity, unknowns=$unknowns",
      ({ scope, complexity, unknowns, expected }) => {
        const criteria: EstimationCriteria = { scope, complexity, unknowns };
        expect(getSuggestedPoints(criteria)).toBe(expected);
      }
    );

    it("returns 1 for S-S-S (minimum)", () => {
      expect(getSuggestedPoints({ scope: "S", complexity: "S", unknowns: "S" })).toBe(1);
    });

    it("returns 8 for M-M-M (median)", () => {
      expect(getSuggestedPoints({ scope: "M", complexity: "M", unknowns: "M" })).toBe(8);
    });

    it("returns 21 for L-L-L (maximum)", () => {
      expect(getSuggestedPoints({ scope: "L", complexity: "L", unknowns: "L" })).toBe(21);
    });

    it("returns default 5 for invalid criteria key", () => {
      const invalidCriteria = { scope: "X", complexity: "Y", unknowns: "Z" } as unknown as EstimationCriteria;
      expect(getSuggestedPoints(invalidCriteria)).toBe(5);
    });
  });

  describe("getPointScale", () => {
    it("returns the default Fibonacci-like scale", () => {
      expect(getPointScale()).toEqual([1, 2, 3, 5, 8, 13, 21]);
    });

    it("has exactly 7 elements", () => {
      expect(getPointScale()).toHaveLength(7);
    });
  });
});
