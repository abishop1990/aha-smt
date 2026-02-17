// Server-only config loader with database access
import { getDb } from "./db";
import { orgConfig } from "./db/schema";
import { DEFAULT_CONFIG, deepMerge, type AhaSMTConfig, type PointField } from "./config";
import { getEnv, type Env } from "./env";

let _serverConfig: AhaSMTConfig | null = null;

/**
 * Loads configuration with the following precedence (highest → lowest):
 * 1. File-based config (aha-smt.config.ts) — advanced/CI deployments
 * 2. Environment variables (BACKLOG_*, POINTS_*, etc.) — Docker/k8s
 * 3. Database (org_config table, edited via Settings UI)
 * 4. DEFAULT_CONFIG — fallback
 */
export async function loadConfigFromDb(): Promise<AhaSMTConfig> {
  if (_serverConfig) return _serverConfig;

  const db = getDb();

  try {
    // Layer 3: Database config
    const rows = await db.select().from(orgConfig);
    const dbConfig = rowsToConfig(rows);

    // Layer 2: Environment variable overrides
    let envConfig: Partial<AhaSMTConfig> = {};
    try {
      const env = getEnv();
      envConfig = parseEnvToConfig(env);
    } catch {
      // Env validation failures are already logged by getEnv()
    }

    // Layer 1: File-based config overrides
    let fileConfig = {};
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      fileConfig = require("@config").default ?? require("@config");
    } catch {
      // No file config
    }

    // Merge in precedence order: defaults → db → env vars → file config
    _serverConfig = deepMerge(deepMerge(dbConfig, envConfig), fileConfig);
    return _serverConfig!;
  } catch (error) {
    console.error("Failed to load config from DB, using defaults:", error);
    _serverConfig = { ...DEFAULT_CONFIG };
    return _serverConfig!;
  }
}

/**
 * Parses environment variables into a partial AhaSMTConfig.
 * Only includes keys that are explicitly set (non-undefined).
 */
function parseEnvToConfig(env: Env): Partial<AhaSMTConfig> {
  const config: Partial<AhaSMTConfig> = {};

  // Backlog
  if (env.BACKLOG_FILTER_TYPE || env.BACKLOG_TEAM_PRODUCT_ID ||
      env.BACKLOG_EXCLUDE_WORKFLOW_KINDS || env.BACKLOG_CUSTOM_FIELD_KEY ||
      env.BACKLOG_TAG_FILTER || env.BACKLOG_EPIC_ID) {
    config.backlog = { filterType: "release" };
    if (env.BACKLOG_FILTER_TYPE) config.backlog.filterType = env.BACKLOG_FILTER_TYPE;
    if (env.BACKLOG_TEAM_PRODUCT_ID) config.backlog.teamProductId = env.BACKLOG_TEAM_PRODUCT_ID;
    if (env.BACKLOG_CUSTOM_FIELD_KEY) config.backlog.customFieldKey = env.BACKLOG_CUSTOM_FIELD_KEY;
    if (env.BACKLOG_TAG_FILTER) config.backlog.tagFilter = env.BACKLOG_TAG_FILTER;
    if (env.BACKLOG_EPIC_ID) config.backlog.epicId = env.BACKLOG_EPIC_ID;
    if (env.BACKLOG_EXCLUDE_WORKFLOW_KINDS) {
      config.backlog.excludeWorkflowKinds = env.BACKLOG_EXCLUDE_WORKFLOW_KINDS
        .split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  // Points
  if (env.POINTS_SOURCE || env.POINTS_SCALE || env.POINTS_DEFAULT_PER_DAY !== undefined) {
    config.points = { ...DEFAULT_CONFIG.points };
    if (env.POINTS_SOURCE) {
      config.points.source = env.POINTS_SOURCE
        .split(",").map((s) => s.trim()).filter(Boolean) as PointField[];
    }
    if (env.POINTS_SCALE) {
      config.points.scale = env.POINTS_SCALE
        .split(",").map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
    }
    if (env.POINTS_DEFAULT_PER_DAY !== undefined) {
      config.points.defaultPerDay = env.POINTS_DEFAULT_PER_DAY;
    }
  }

  // Sprints
  if (env.SPRINTS_MODE || env.SPRINTS_DEFAULT_VIEW) {
    config.sprints = { ...DEFAULT_CONFIG.sprints };
    if (env.SPRINTS_MODE) config.sprints.mode = env.SPRINTS_MODE;
    if (env.SPRINTS_DEFAULT_VIEW) config.sprints.defaultView = env.SPRINTS_DEFAULT_VIEW;
  }

  // Workflow
  if (env.WORKFLOW_COMPLETE_MEANINGS) {
    config.workflow = {
      completeMeanings: env.WORKFLOW_COMPLETE_MEANINGS
        .split(",").map((s) => s.trim()).filter(Boolean),
    };
  }

  // Estimation matrix (JSON override)
  if (env.ESTIMATION_MATRIX) {
    try {
      config.estimation = { matrix: JSON.parse(env.ESTIMATION_MATRIX) };
    } catch {
      console.error("Failed to parse ESTIMATION_MATRIX env var — must be valid JSON");
    }
  }

  return config;
}

/**
 * Deserializes database rows into AhaSMTConfig structure.
 */
function rowsToConfig(rows: Array<{ key: string; value: string }>): AhaSMTConfig {
  const config: any = {};

  for (const row of rows) {
    const keys = row.key.split(".");
    let target = config;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) target[keys[i]] = {};
      target = target[keys[i]];
    }

    const finalKey = keys[keys.length - 1];
    try {
      const parsed = JSON.parse(row.value);
      if (parsed !== null) {
        target[finalKey] = parsed;
      }
    } catch {
      console.warn(`Failed to parse config value for ${row.key}:`, row.value);
    }
  }

  return deepMerge(DEFAULT_CONFIG, config) as AhaSMTConfig;
}

export function invalidateServerConfig(): void {
  _serverConfig = null;
}
