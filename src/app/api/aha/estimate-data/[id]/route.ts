import { NextRequest, NextResponse } from "next/server";
import { listFeaturesInRelease } from "@/lib/aha-client";
import { getDb } from "@/lib/db";
import { estimationHistory } from "@/lib/db/schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Parallel fetch: features + estimation history
    const [features, history] = await Promise.all([
      listFeaturesInRelease(id, { unestimatedOnly: true }),
      (async () => {
        const db = getDb();
        return db.select().from(estimationHistory);
      })(),
    ]);

    return NextResponse.json({
      features,
      estimationHistory: history,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch estimation data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
