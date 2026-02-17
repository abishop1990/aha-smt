// Server-only config loader with database access
import { getDb } from "./db";
import { orgConfig } from "./db/schema";
import { DEFAULT_CONFIG, type AhaSMTConfig } from "./config";

let _serverConfig: AhaSMTConfig | null = null;

/**
 * Loads configuration from database (server-side only).
 * Precedence: File config > Database > Defaults
 */
export async function loadConfigFromDb(): Promise<AhaSMTConfig> {
  if (_serverConfig) return _serverConfig;

  const db = getDb();

  try {
    // Read all config from database
    const rows = await db.select().from(orgConfig);
    const dbConfig = rowsToConfig(rows);

    // Optional: merge file overrides (for advanced deployments)
    let fileConfig = {};
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      fileConfig = require("@config").default ?? require("@config");
    } catch {
      // No file config, use database only
    }

    _serverConfig = deepMerge(dbConfig, fileConfig);
    return _serverConfig!;
  } catch (error) {
    console.error("Failed to load config from DB, using defaults:", error);
    _serverConfig = { ...DEFAULT_CONFIG };
    return _serverConfig!;
  }
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

export function invalidateServerConfig(): void {
  _serverConfig = null;
}
