import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sprintBurndownEntries } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { listFeaturesInRelease } from "@/lib/aha-client";
import { getPoints } from "@/lib/points";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ releaseId: string }> }
) {
  try {
    const { releaseId } = await params;
    const db = getDb();
    const entries = await db
      .select()
      .from(sprintBurndownEntries)
      .where(eq(sprintBurndownEntries.releaseId, releaseId))
      .orderBy(asc(sprintBurndownEntries.capturedDate));

    return NextResponse.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch burndown";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ releaseId: string }> }
) {
  try {
    const { releaseId } = await params;
    const db = getDb();

    const { loadConfigFromDb } = await import("@/lib/config.server");
    const { setConfig } = await import("@/lib/config");
    const config = await loadConfigFromDb();
    setConfig(config);

    const features = await listFeaturesInRelease(releaseId);
    const totalPointsPlanned = features.reduce((sum, f) => sum + getPoints(f), 0);
    const completedFeatures = features.filter((f) => f.workflow_status?.complete);
    const pointsCompleted = completedFeatures.reduce((sum, f) => sum + getPoints(f), 0);
    const pointsRemaining = totalPointsPlanned - pointsCompleted;
    const capturedDate = new Date().toISOString().split("T")[0];

    const entry = db
      .insert(sprintBurndownEntries)
      .values({
        releaseId,
        releaseRefNum: releaseId, // will be overwritten with actual ref if needed
        capturedDate,
        totalPointsPlanned,
        pointsRemaining,
        pointsCompleted,
        featuresCompleted: completedFeatures.length,
        sourceType: "release",
        capturedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: [sprintBurndownEntries.releaseId, sprintBurndownEntries.capturedDate],
        set: {
          totalPointsPlanned,
          pointsRemaining,
          pointsCompleted,
          featuresCompleted: completedFeatures.length,
          capturedAt: new Date().toISOString(),
        },
      })
      .returning()
      .get();

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to capture burndown";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
