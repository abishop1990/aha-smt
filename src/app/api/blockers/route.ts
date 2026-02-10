import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { blockersTable, standupEntries } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");

    let blockers;
    if (status) {
      blockers = await db
        .select({
          id: blockersTable.id,
          standupEntryId: blockersTable.standupEntryId,
          userId: blockersTable.userId,
          userName: standupEntries.userName,
          description: blockersTable.description,
          featureRef: blockersTable.featureRef,
          status: blockersTable.status,
          resolvedAt: blockersTable.resolvedAt,
          createdAt: blockersTable.createdAt,
        })
        .from(blockersTable)
        .leftJoin(standupEntries, eq(blockersTable.standupEntryId, standupEntries.id))
        .where(eq(blockersTable.status, status))
        .orderBy(desc(blockersTable.createdAt));
    } else {
      blockers = await db
        .select({
          id: blockersTable.id,
          standupEntryId: blockersTable.standupEntryId,
          userId: blockersTable.userId,
          userName: standupEntries.userName,
          description: blockersTable.description,
          featureRef: blockersTable.featureRef,
          status: blockersTable.status,
          resolvedAt: blockersTable.resolvedAt,
          createdAt: blockersTable.createdAt,
        })
        .from(blockersTable)
        .leftJoin(standupEntries, eq(blockersTable.standupEntryId, standupEntries.id))
        .orderBy(desc(blockersTable.createdAt));
    }

    return NextResponse.json({ blockers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch blockers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
