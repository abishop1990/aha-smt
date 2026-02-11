import { describe, it, expect } from "vitest";
import { parseBlockers, parseActionItems } from "../standup-parsers";

describe("parseBlockers", () => {
  it("returns empty array for empty string", () => {
    expect(parseBlockers("")).toEqual([]);
  });

  it("returns empty array for whitespace-only input", () => {
    expect(parseBlockers("   \n  \n  ")).toEqual([]);
  });

  it("parses a single blocker line", () => {
    const result = parseBlockers("Waiting for API docs");
    expect(result).toEqual([
      { description: "Waiting for API docs", featureRef: undefined },
    ]);
  });

  it("parses multiple lines", () => {
    const result = parseBlockers("Blocker one\nBlocker two\nBlocker three");
    expect(result).toHaveLength(3);
    expect(result[0].description).toBe("Blocker one");
    expect(result[1].description).toBe("Blocker two");
    expect(result[2].description).toBe("Blocker three");
  });

  it("strips dash bullet prefixes", () => {
    const result = parseBlockers("- Waiting for deploy");
    expect(result[0].description).toBe("Waiting for deploy");
  });

  it("strips asterisk bullet prefixes", () => {
    const result = parseBlockers("* Waiting for deploy");
    expect(result[0].description).toBe("Waiting for deploy");
  });

  it("strips bullet (•) prefixes", () => {
    const result = parseBlockers("• Waiting for deploy");
    expect(result[0].description).toBe("Waiting for deploy");
  });

  it("extracts feature ref without hash", () => {
    const result = parseBlockers("Blocked by FEAT-123 dependency");
    expect(result[0].description).toBe("Blocked by FEAT-123 dependency");
    expect(result[0].featureRef).toBe("FEAT-123");
  });

  it("extracts feature ref with hash", () => {
    const result = parseBlockers("Blocked by #PROJ-456");
    expect(result[0].description).toBe("Blocked by #PROJ-456");
    expect(result[0].featureRef).toBe("PROJ-456");
  });

  it("extracts first feature ref when multiple present", () => {
    const result = parseBlockers("FEAT-1 depends on FEAT-2");
    expect(result[0].featureRef).toBe("FEAT-1");
  });

  it("returns undefined featureRef when none present", () => {
    const result = parseBlockers("No feature reference here");
    expect(result[0].featureRef).toBeUndefined();
  });

  it("skips blank lines between items", () => {
    const result = parseBlockers("First blocker\n\n\nSecond blocker");
    expect(result).toHaveLength(2);
  });

  it("handles mixed bullets and feature refs", () => {
    const text = "- Blocked by FEAT-10\n* API rate limit\n• #BUG-99 is blocking us";
    const result = parseBlockers(text);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ description: "Blocked by FEAT-10", featureRef: "FEAT-10" });
    expect(result[1]).toEqual({ description: "API rate limit", featureRef: undefined });
    expect(result[2]).toEqual({ description: "#BUG-99 is blocking us", featureRef: "BUG-99" });
  });
});

describe("parseActionItems", () => {
  it("returns empty array for empty string", () => {
    expect(parseActionItems("")).toEqual([]);
  });

  it("returns empty array for whitespace-only input", () => {
    expect(parseActionItems("   \n  ")).toEqual([]);
  });

  it("parses a single action item", () => {
    const result = parseActionItems("Follow up with team");
    expect(result).toEqual([{ description: "Follow up with team" }]);
  });

  it("parses multiple lines", () => {
    const result = parseActionItems("Action one\nAction two");
    expect(result).toHaveLength(2);
  });

  it("strips bullet prefixes", () => {
    expect(parseActionItems("- Update docs")[0].description).toBe("Update docs");
    expect(parseActionItems("* Update docs")[0].description).toBe("Update docs");
    expect(parseActionItems("• Update docs")[0].description).toBe("Update docs");
  });

  it("skips blank lines", () => {
    const result = parseActionItems("First\n\nSecond");
    expect(result).toHaveLength(2);
  });

  it("trims whitespace from items", () => {
    const result = parseActionItems("  padded item  ");
    expect(result[0].description).toBe("padded item");
  });
});
