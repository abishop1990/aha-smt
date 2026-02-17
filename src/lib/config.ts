// Org configuration system — externalize hardcoded behavior into aha-smt.config.ts

export type PointField = "score" | "work_units" | "original_estimate";

export interface AhaSMTConfig {
  points: {
    /** Priority order for extracting points. First non-null value wins. */
    source: PointField[];
    /** Valid point values shown in the estimation UI. */
    scale: number[];
    /** Starting default for points-per-day (overridable in Settings UI). */
    defaultPerDay: number;
  };
  sprints: {
    /** Which sprint tracking mode to use. */
    mode: "iterations" | "releases" | "both";
    /** Default tab when mode is 'both'. */
    defaultView: "iterations" | "releases";
  };
  workflow: {
    /** Aha internalMeaning values that count as "complete". */
    completeMeanings: string[];
  };
  estimation: {
    /** Scope/Complexity/Unknowns → Points lookup. Keys like "L-M-H". */
    matrix: Record<string, number>;
  };
  backlog: {
    /** How to filter features for estimation/backlog views. */
    filterType: "release" | "team_location" | "epic" | "tag" | "custom_field";
    /** Field name when using custom_field filter type. */
    customFieldKey?: string;
    /** Product ID to use when filterType is team_location (e.g., your Develop product ID). */
    teamProductId?: string;
    /** Exclude these workflow kinds from estimation (e.g., ["Bug", "Test"]). */
    excludeWorkflowKinds?: string[];
  };
}

export const DEFAULT_CONFIG: AhaSMTConfig = {
  points: {
    source: ["original_estimate", "score"],
    scale: [1, 2, 3, 5, 8, 13, 21],
    defaultPerDay: 1,
  },
  sprints: {
    mode: "both",
    defaultView: "iterations",
  },
  workflow: {
    completeMeanings: ["DONE", "SHIPPED"],
  },
  estimation: {
    matrix: {
      "L-L-L": 1,
      "L-L-M": 2,
      "L-M-L": 2,
      "M-L-L": 3,
      "L-L-H": 3,
      "L-M-M": 3,
      "L-H-L": 3,
      "M-L-M": 5,
      "M-M-L": 5,
      "L-M-H": 5,
      "L-H-M": 5,
      "M-L-H": 5,
      "M-M-M": 8,
      "H-L-L": 5,
      "H-L-M": 8,
      "H-M-L": 8,
      "M-H-L": 8,
      "M-M-H": 8,
      "H-L-H": 13,
      "H-M-M": 13,
      "M-H-M": 13,
      "L-H-H": 8,
      "H-M-H": 13,
      "M-H-H": 13,
      "H-H-L": 13,
      "H-H-M": 21,
      "H-H-H": 21,
    },
  },
  backlog: {
    filterType: "release", // Default to releases (backward compatible)
  },
};

/** Type-checking helper for aha-smt.config.ts — returns the input unchanged. */
export function defineConfig(config: Partial<DeepPartial<AhaSMTConfig>>): Partial<DeepPartial<AhaSMTConfig>> {
  return config;
}

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];
    if (
      srcVal !== null &&
      typeof srcVal === "object" &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === "object" &&
      !Array.isArray(tgtVal)
    ) {
      result[key] = deepMerge(tgtVal, srcVal);
    } else {
      result[key] = srcVal;
    }
  }
  return result;
}

let _clientConfig: AhaSMTConfig | null = null;

/**
 * Client-safe synchronous config getter.
 * Returns cached config or DEFAULT_CONFIG.
 * Server-side: This will be populated by route handlers calling loadConfigFromDb().
 * Client-side: Components should use the useConfig() hook instead.
 */
export function getConfig(): AhaSMTConfig {
  if (_clientConfig) return _clientConfig;

  // Try loading file config (backward compat for server-side)
  if (typeof window === "undefined") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fileConfig = require("@config").default ?? require("@config");
      _clientConfig = deepMerge(DEFAULT_CONFIG, fileConfig);
      return _clientConfig!;
    } catch {
      // No file config
    }
  }

  // Cache and return defaults
  _clientConfig = { ...DEFAULT_CONFIG };
  return _clientConfig;
}

/**
 * Sets the cached config (called by server-side loader).
 * @internal
 */
export function setConfig(config: AhaSMTConfig): void {
  _clientConfig = config;
}

/**
 * Synchronous getter that uses cached value.
 * Alias for getConfig() for backward compatibility.
 */
export function getConfigSync(): AhaSMTConfig {
  return getConfig();
}

/** Clear cache (for when config is updated via Settings UI). */
export function invalidateConfig(): void {
  _clientConfig = null;
}

/** Reset singleton — for tests only. */
export function __resetConfig(): void {
  _clientConfig = null;
}
