import { describe, it, expect, beforeEach, vi } from "vitest";
import { getEnv, __resetEnv } from "@/lib/env";

describe("env", () => {
  beforeEach(() => {
    __resetEnv();
    vi.unstubAllEnvs();
  });

  it("returns correct values when all env vars are set", () => {
    vi.stubEnv("AHA_DOMAIN", "my-domain");
    vi.stubEnv("AHA_API_TOKEN", "my-token");
    vi.stubEnv("AHA_DEFAULT_PRODUCT_ID", "my-product");
    vi.stubEnv("DATABASE_URL", "file:./custom.db");
    vi.stubEnv("CACHE_TTL_SECONDS", "120");

    const env = getEnv();

    expect(env.AHA_DOMAIN).toBe("my-domain");
    expect(env.AHA_API_TOKEN).toBe("my-token");
    expect(env.AHA_DEFAULT_PRODUCT_ID).toBe("my-product");
    expect(env.DATABASE_URL).toBe("file:./custom.db");
    expect(env.CACHE_TTL_SECONDS).toBe(120);
  });

  it("throws error when AHA_DOMAIN is missing", () => {
    vi.stubEnv("AHA_API_TOKEN", "my-token");

    expect(() => getEnv()).toThrow("Invalid environment variables");
  });

  it("throws error when AHA_DOMAIN is empty string", () => {
    vi.stubEnv("AHA_DOMAIN", "");
    vi.stubEnv("AHA_API_TOKEN", "my-token");

    expect(() => getEnv()).toThrow("Invalid environment variables");
  });

  it("throws error when AHA_API_TOKEN is missing", () => {
    vi.stubEnv("AHA_DOMAIN", "my-domain");

    expect(() => getEnv()).toThrow("Invalid environment variables");
  });

  it("throws error when AHA_API_TOKEN is empty string", () => {
    vi.stubEnv("AHA_DOMAIN", "my-domain");
    vi.stubEnv("AHA_API_TOKEN", "");

    expect(() => getEnv()).toThrow("Invalid environment variables");
  });

  it("defaults DATABASE_URL to file:./data/aha-smt.db", () => {
    vi.stubEnv("AHA_DOMAIN", "my-domain");
    vi.stubEnv("AHA_API_TOKEN", "my-token");

    const env = getEnv();

    expect(env.DATABASE_URL).toBe("file:./data/aha-smt.db");
  });

  it("defaults CACHE_TTL_SECONDS to 60", () => {
    vi.stubEnv("AHA_DOMAIN", "my-domain");
    vi.stubEnv("AHA_API_TOKEN", "my-token");

    const env = getEnv();

    expect(env.CACHE_TTL_SECONDS).toBe(60);
  });

  it("coerces CACHE_TTL_SECONDS string to number", () => {
    vi.stubEnv("AHA_DOMAIN", "my-domain");
    vi.stubEnv("AHA_API_TOKEN", "my-token");
    vi.stubEnv("CACHE_TTL_SECONDS", "120");

    const env = getEnv();

    expect(env.CACHE_TTL_SECONDS).toBe(120);
    expect(typeof env.CACHE_TTL_SECONDS).toBe("number");
  });

  it("caches env after first call", () => {
    vi.stubEnv("AHA_DOMAIN", "my-domain");
    vi.stubEnv("AHA_API_TOKEN", "my-token");

    const env1 = getEnv();
    const env2 = getEnv();

    expect(env1).toBe(env2);
  });

  it("allows AHA_DEFAULT_PRODUCT_ID to be undefined", () => {
    vi.stubEnv("AHA_DOMAIN", "my-domain");
    vi.stubEnv("AHA_API_TOKEN", "my-token");

    const env = getEnv();

    expect(env.AHA_DEFAULT_PRODUCT_ID).toBeUndefined();
  });
});
