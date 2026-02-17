import { NextRequest, NextResponse } from "next/server";
import { loadConfigFromDb, invalidateServerConfig } from "@/lib/config.server";
import { setConfig, invalidateConfig } from "@/lib/config";
import { getDb } from "@/lib/db";
import { orgConfig } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/config
 * Returns the current application configuration
 */
export async function GET() {
  try {
    const config = await loadConfigFromDb();
    setConfig(config); // Populate cache for helper functions
    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to load config:", error);
    return NextResponse.json(
      {
        error: "Failed to load configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/config
 * Updates configuration values. Accepts either:
 * - Partial<AhaSMTConfig> for nested updates: { sprints: { mode: "both" } }
 * - Single key-value pairs: { key: "sprints.mode", value: "both" }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be a valid object" },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = new Date().toISOString();

    // Handle { key, value } format (from /api/config/update)
    if ("key" in body && "value" in body) {
      const { key, value } = body;

      if (!key || typeof key !== "string") {
        return NextResponse.json(
          { error: "Missing or invalid 'key' field" },
          { status: 400 }
        );
      }

      if (value === undefined || value === null) {
        return NextResponse.json(
          { error: "Missing or invalid 'value' field" },
          { status: 400 }
        );
      }

      // Upsert the config value atomically
      const serializedValue = JSON.stringify(value);
      db.transaction((tx) => {
        tx.insert(orgConfig)
          .values({
            key,
            value: serializedValue,
            type: Array.isArray(value) ? "array" : typeof value,
            category: key.split(".")[0],
            label: key,
            defaultValue: serializedValue,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: orgConfig.key,
            set: { value: serializedValue, updatedAt: now },
          })
          .run();
      });
    } else {
      // Handle Partial<AhaSMTConfig> format (nested object)
      // Flatten first so any error aborts before we touch the DB
      const flatUpdates = flattenObject(body);

      // Wrap all upserts in a single transaction — all succeed or none do
      db.transaction((tx) => {
        for (const [key, value] of Object.entries(flatUpdates)) {
          const serializedValue = JSON.stringify(value);
          tx.insert(orgConfig)
            .values({
              key,
              value: serializedValue,
              type: Array.isArray(value) ? "array" : typeof value,
              category: key.split(".")[0],
              label: key,
              defaultValue: serializedValue,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: orgConfig.key,
              set: { value: serializedValue, updatedAt: now },
            })
            .run();
        }
      });
    }

    // Invalidate caches
    invalidateConfig();
    invalidateServerConfig();

    // Reload and return updated config
    const config = await loadConfigFromDb();
    setConfig(config);
    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to update config:", error);
    const message = error instanceof Error ? error.message : "Failed to update configuration";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * Flattens a nested object into dot-notation keys
 * { sprints: { mode: "both" } } => { "sprints.mode": "both" }
 */
function flattenObject(obj: any, prefix = ""): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}
