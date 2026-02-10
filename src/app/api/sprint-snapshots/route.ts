import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sprintSnapshots } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { listFeaturesInRelease, getRelease } from "@/lib/aha-client";

export async function GET() {
  try {
    const db = getDb();
    const snapshots = await db
      .select()
      .from(sprintSnapshots)
      .orderBy(desc(sprintSnapshots.capturedAt));

    return NextResponse.json({ snapshots });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch snapshots";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { releaseId } = body;

    if (!releaseId) {
      return NextResponse.json({ error: "releaseId is required" }, { status: 400 });
    }

    // Fetch current release state from Aha
    const [release, features] = await Promise.all([
      getRelease(releaseId),
      listFeaturesInRelease(releaseId),
    ]);

    const totalPointsPlanned = features.reduce((sum, f) => sum + (f.score || 0), 0);
    const completedFeatures = features.filter((f) => f.workflow_status?.complete);
    const totalPointsCompleted = completedFeatures.reduce((sum, f) => sum + (f.score || 0), 0);
    const carryoverPoints = totalPointsPlanned - totalPointsCompleted;

    // Build member metrics
    const memberMap = new Map<string, { name: string; planned: number; completed: number; features: number }>();
    for (const f of features) {
      const userId = f.assigned_to_user?.id || "unassigned";
      const userName = f.assigned_to_user?.name || "Unassigned";
      const existing = memberMap.get(userId) || { name: userName, planned: 0, completed: 0, features: 0 };
      existing.planned += f.score || 0;
      existing.features++;
      if (f.workflow_status?.complete) {
        existing.completed += f.score || 0;
      }
      memberMap.set(userId, existing);
    }
    const memberMetrics = Array.from(memberMap.entries()).map(([userId, data]) => ({
      userId,
      ...data,
    }));

    // Build feature snapshot
    const featureSnapshot = features.map((f) => ({
      id: f.id,
      referenceNum: f.reference_num,
      name: f.name,
      score: f.score,
      status: f.workflow_status?.name,
      complete: f.workflow_status?.complete,
      assignee: f.assigned_to_user?.name,
    }));

    const snapshot = await db
      .insert(sprintSnapshots)
      .values({
        releaseId,
        releaseRefNum: release.reference_num,
        releaseName: release.name,
        startDate: release.start_date || null,
        endDate: release.release_date || null,
        totalPointsPlanned,
        totalPointsCompleted,
        totalFeaturesPlanned: features.length,
        totalFeaturesCompleted: completedFeatures.length,
        carryoverPoints,
        memberMetrics: JSON.stringify(memberMetrics),
        featureSnapshot: JSON.stringify(featureSnapshot),
        capturedAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(snapshot[0], { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to capture snapshot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
