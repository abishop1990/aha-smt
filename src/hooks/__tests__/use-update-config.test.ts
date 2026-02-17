import { describe, it, expect } from "vitest";
import { keyValueToNestedConfig, isKeyValueUpdate } from "../use-update-config";

describe("keyValueToNestedConfig", () => {
  it('converts "backlog.filterType" to nested config', () => {
    expect(keyValueToNestedConfig("backlog.filterType", "release")).toEqual({
      backlog: { filterType: "release" },
    });
  });

  it('converts "sprints.mode" to nested config', () => {
    expect(keyValueToNestedConfig("sprints.mode", "both")).toEqual({
      sprints: { mode: "both" },
    });
  });

  it('converts "estimation.matrix" with an object value', () => {
    const matrix = { xs: 1, s: 2, m: 3, l: 5, xl: 8 };
    expect(keyValueToNestedConfig("estimation.matrix", matrix)).toEqual({
      estimation: { matrix },
    });
  });

  it("handles a single key with no dots", () => {
    expect(keyValueToNestedConfig("singleKey", "value")).toEqual({
      singleKey: "value",
    });
  });

  it("handles deep three-level nesting", () => {
    expect(keyValueToNestedConfig("a.b.c", "deep")).toEqual({
      a: { b: { c: "deep" } },
    });
  });

  it("handles array values", () => {
    expect(keyValueToNestedConfig("points.scale", [1, 2, 3])).toEqual({
      points: { scale: [1, 2, 3] },
    });
  });
});

describe("isKeyValueUpdate", () => {
  it("returns true for a key-value payload", () => {
    expect(isKeyValueUpdate({ key: "foo", value: "bar" })).toBe(true);
  });

  it("returns false for a nested config payload", () => {
    expect(isKeyValueUpdate({ backlog: { filterType: "release" } } as any)).toBe(false);
  });
});
