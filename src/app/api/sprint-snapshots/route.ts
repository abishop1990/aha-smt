import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sprintSnapshots } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { listFeaturesInRelease, getRelease, listFeaturesInIteration, getIteration } from "@/lib/aha-client";
import { getPoints } from "@/lib/points";
import { getEnv } from "@/lib/env";

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
    const { releaseId, iterationRef, teamProductId: bodyTeamProductId } = body;

    if (!releaseId && !iterationRef) {
      return NextResponse.json(
        { error: "releaseId or iterationRef is required" },
        { status: 400 }
      );
    }

    let features: any[];
    let sourceType: "release" | "iteration";
    let pointSource: "score" | "work_units";
    let snapshotReleaseId: string;
    let releaseRefNum: string;
    let releaseName: string;
    let startDate: string | null;
    let endDate: string | null;

    if (iterationRef) {
      // Iteration-based snapshot
      const teamProductId = bodyTeamProductId || getEnv().AHA_TEAM_PRODUCT_ID;
      if (!teamProductId) {
        return NextResponse.json(
          { error: "teamProductId is required for iteration snapshots" },
          { status: 400 }
        );
      }

      const [iteration, iterationFeatures] = await Promise.all([
        getIteration(teamProductId, iterationRef),
        listFeaturesInIteration(teamProductId, iterationRef),
      ]);

      if (!iteration) {
        return NextResponse.json({ error: "Iteration not found" }, { status: 404 });
      }

      features = iterationFeatures;
      sourceType = "iteration";
      pointSource = "work_units";
      snapshotReleaseId = iteration.id;
      releaseRefNum = iteration.reference_num;
      releaseName = iteration.name;
      startDate = iteration.start_date || null;
      endDate = iteration.end_date || null;
    } else {
      // Release-based snapshot (existing behavior)
      const [releaseData, releaseFeatures] = await Promise.all([
        getRelease(releaseId),
        listFeaturesInRelease(releaseId),
      ]);

      features = releaseFeatures;
      sourceType = "release";
      pointSource = "score";
      snapshotReleaseId = releaseId;
      releaseRefNum = releaseData.reference_num;
      releaseName = releaseData.name;
      startDate = releaseData.start_date || null;
      endDate = releaseData.release_date || null;
    }

    const totalPointsPlanned = features.reduce((sum, f) => sum + getPoints(f), 0);
    const completedFeatures = features.filter((f) => f.workflow_status?.complete);
    const totalPointsCompleted = completedFeatures.reduce((sum, f) => sum + getPoints(f), 0);
    const carryoverPoints = totalPointsPlanned - totalPointsCompleted;

    // Build member metrics
    const memberMap = new Map<string, { name: string; planned: number; completed: number; features: number }>();
    for (const f of features) {
      const userId = f.assigned_to_user?.id || "unassigned";
      const userName = f.assigned_to_user?.name || "Unassigned";
      const existing = memberMap.get(userId) || { name: userName, planned: 0, completed: 0, features: 0 };
      existing.planned += getPoints(f);
      existing.features++;
      if (f.workflow_status?.complete) {
        existing.completed += getPoints(f);
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
      workUnits: f.work_units,
      originalEstimate: f.original_estimate,
      points: getPoints(f),
      status: f.workflow_status?.name,
      complete: f.workflow_status?.complete,
      assignee: f.assigned_to_user?.name,
    }));

    // Replace existing snapshot for the same sprint
    await db
      .delete(sprintSnapshots)
      .where(eq(sprintSnapshots.releaseRefNum, releaseRefNum));

    const snapshot = await db
      .insert(sprintSnapshots)
      .values({
        releaseId: snapshotReleaseId,
        releaseRefNum,
        releaseName,
        startDate,
        endDate,
        totalPointsPlanned,
        totalPointsCompleted,
        totalFeaturesPlanned: features.length,
        totalFeaturesCompleted: completedFeatures.length,
        carryoverPoints,
        memberMetrics: JSON.stringify(memberMetrics),
        featureSnapshot: JSON.stringify(featureSnapshot),
        sourceType,
        pointSource,
        capturedAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(snapshot[0], { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to capture snapshot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
