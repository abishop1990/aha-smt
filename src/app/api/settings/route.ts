import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
// eq used in onConflictDoUpdate

export async function GET() {
  try {
    const db = getDb();
    const settings = await db.select().from(appSettings);
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }
    // Expose Aha domain for client-side URL construction (not sensitive)
    try {
      const env = getEnv();
      settingsMap["ahaDomain"] = env.AHA_DOMAIN ?? "";
    } catch { /* env not available, skip */ }
    return NextResponse.json(settingsMap);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      await db
        .insert(appSettings)
        .values({ key, value: String(value), updatedAt: new Date().toISOString() })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { value: String(value), updatedAt: new Date().toISOString() },
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
