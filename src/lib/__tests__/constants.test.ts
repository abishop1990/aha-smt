import { describe, it, expect, test } from "vitest";
import { getSuggestedPoints, getPointScale, type EstimationCriteria } from "@/lib/constants";

describe("constants", () => {
  describe("getSuggestedPoints", () => {
    // Test all 27 combinations of L/M/H for scope, complexity, unknowns
    test.each([
      // Low scope combinations
      { scope: "L", complexity: "L", unknowns: "L", expected: 1 },
      { scope: "L", complexity: "L", unknowns: "M", expected: 2 },
      { scope: "L", complexity: "L", unknowns: "H", expected: 3 },
      { scope: "L", complexity: "M", unknowns: "L", expected: 2 },
      { scope: "L", complexity: "M", unknowns: "M", expected: 3 },
      { scope: "L", complexity: "M", unknowns: "H", expected: 5 },
      { scope: "L", complexity: "H", unknowns: "L", expected: 3 },
      { scope: "L", complexity: "H", unknowns: "M", expected: 5 },
      { scope: "L", complexity: "H", unknowns: "H", expected: 8 },
      // Medium scope combinations
      { scope: "M", complexity: "L", unknowns: "L", expected: 3 },
      { scope: "M", complexity: "L", unknowns: "M", expected: 5 },
      { scope: "M", complexity: "L", unknowns: "H", expected: 5 },
      { scope: "M", complexity: "M", unknowns: "L", expected: 5 },
      { scope: "M", complexity: "M", unknowns: "M", expected: 8 },
      { scope: "M", complexity: "M", unknowns: "H", expected: 8 },
      { scope: "M", complexity: "H", unknowns: "L", expected: 8 },
      { scope: "M", complexity: "H", unknowns: "M", expected: 13 },
      { scope: "M", complexity: "H", unknowns: "H", expected: 13 },
      // High scope combinations
      { scope: "H", complexity: "L", unknowns: "L", expected: 5 },
      { scope: "H", complexity: "L", unknowns: "M", expected: 8 },
      { scope: "H", complexity: "L", unknowns: "H", expected: 13 },
      { scope: "H", complexity: "M", unknowns: "L", expected: 8 },
      { scope: "H", complexity: "M", unknowns: "M", expected: 13 },
      { scope: "H", complexity: "M", unknowns: "H", expected: 13 },
      { scope: "H", complexity: "H", unknowns: "L", expected: 13 },
      { scope: "H", complexity: "H", unknowns: "M", expected: 21 },
      { scope: "H", complexity: "H", unknowns: "H", expected: 21 },
    ] as Array<EstimationCriteria & { expected: number }>)(
      "returns $expected for scope=$scope, complexity=$complexity, unknowns=$unknowns",
      ({ scope, complexity, unknowns, expected }) => {
        const criteria: EstimationCriteria = { scope, complexity, unknowns };
        expect(getSuggestedPoints(criteria)).toBe(expected);
      }
    );

    it("returns 1 for L-L-L (minimum)", () => {
      expect(getSuggestedPoints({ scope: "L", complexity: "L", unknowns: "L" })).toBe(1);
    });

    it("returns 8 for M-M-M (median)", () => {
      expect(getSuggestedPoints({ scope: "M", complexity: "M", unknowns: "M" })).toBe(8);
    });

    it("returns 21 for H-H-H (maximum)", () => {
      expect(getSuggestedPoints({ scope: "H", complexity: "H", unknowns: "H" })).toBe(21);
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
