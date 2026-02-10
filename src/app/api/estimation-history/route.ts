import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { estimationHistory } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const db = getDb();
    const history = await db
      .select()
      .from(estimationHistory)
      .orderBy(desc(estimationHistory.createdAt))
      .limit(100);

    return NextResponse.json({ history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch estimation history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    const entry = await db
      .insert(estimationHistory)
      .values({
        featureId: body.featureId,
        featureRefNum: body.featureRefNum,
        featureName: body.featureName,
        scope: body.scope,
        complexity: body.complexity,
        unknowns: body.unknowns,
        suggestedPoints: body.suggestedPoints,
        finalPoints: body.finalPoints,
        estimatedByUserId: body.estimatedByUserId || null,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(entry[0], { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save estimation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
