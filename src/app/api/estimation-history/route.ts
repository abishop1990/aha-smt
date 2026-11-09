import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { estimationHistory } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const params = request.nextUrl.searchParams;
    const scope = params.get("scope");
    const complexity = params.get("complexity");
    const unknowns = params.get("unknowns");

    const conditions = [
      scope ? eq(estimationHistory.scope, scope) : undefined,
      complexity ? eq(estimationHistory.complexity, complexity) : undefined,
      unknowns ? eq(estimationHistory.unknowns, unknowns) : undefined,
    ].filter((c) => c !== undefined);

    const history = await db
      .select()
      .from(estimationHistory)
      .where(conditions.length ? and(...conditions) : undefined)
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
