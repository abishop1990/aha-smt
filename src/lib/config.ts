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
    /** Tag name to filter by when filterType is "tag". */
    tagFilter?: string;
    /** Epic reference number (e.g. "PRJ-E-1") when filterType is "epic". */
    epicId?: string;
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
      // S scope
      "S-S-S": 1,
      "S-S-M": 2,
      "S-M-S": 2,
      "M-S-S": 3,
      "S-S-L": 3,
      "S-M-M": 3,
      "S-L-S": 3,
      "M-S-M": 5,
      "M-M-S": 5,
      "S-M-L": 5,
      "S-L-M": 5,
      "M-S-L": 5,
      "M-M-M": 8,
      "L-S-S": 5,
      "L-S-M": 8,
      "L-M-S": 8,
      "M-L-S": 8,
      "M-M-L": 8,
      "L-S-L": 13,
      "L-M-M": 13,
      "M-L-M": 13,
      "S-L-L": 8,
      "L-M-L": 13,
      "M-L-L": 13,
      "L-L-S": 13,
      "L-L-M": 21,
      "L-L-L": 21,
      // S scope with XL
      "S-S-XL": 5,
      "S-M-XL": 5,
      "S-L-XL": 8,
      "S-XL-S": 5,
      "S-XL-M": 5,
      "S-XL-L": 8,
      "S-XL-XL": 8,
      // M scope with XL
      "M-S-XL": 8,
      "M-M-XL": 13,
      "M-L-XL": 13,
      "M-XL-S": 8,
      "M-XL-M": 13,
      "M-XL-L": 13,
      "M-XL-XL": 21,
      // L scope with XL
      "L-S-XL": 13,
      "L-M-XL": 21,
      "L-L-XL": 21,
      "L-XL-S": 13,
      "L-XL-M": 21,
      "L-XL-L": 21,
      "L-XL-XL": 21,
      // XL scope with all
      "XL-S-S": 8,
      "XL-S-M": 13,
      "XL-S-L": 13,
      "XL-S-XL": 21,
      "XL-M-S": 13,
      "XL-M-M": 21,
      "XL-M-L": 21,
      "XL-M-XL": 21,
      "XL-L-S": 21,
      "XL-L-M": 21,
      "XL-L-L": 21,
      "XL-L-XL": 21,
      "XL-XL-S": 21,
      "XL-XL-M": 21,
      "XL-XL-L": 21,
      "XL-XL-XL": 21,
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
