import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { actionItemsTable, standupEntries } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = request.nextUrl;
    const completed = searchParams.get("completed");

    let actionItems;
    if (completed !== null) {
      const isCompleted = completed === "true";
      actionItems = await db
        .select({
          id: actionItemsTable.id,
          standupEntryId: actionItemsTable.standupEntryId,
          userId: actionItemsTable.userId,
          userName: standupEntries.userName,
          assigneeUserId: actionItemsTable.assigneeUserId,
          description: actionItemsTable.description,
          completed: actionItemsTable.completed,
          completedAt: actionItemsTable.completedAt,
          createdAt: actionItemsTable.createdAt,
        })
        .from(actionItemsTable)
        .leftJoin(standupEntries, eq(actionItemsTable.standupEntryId, standupEntries.id))
        .where(eq(actionItemsTable.completed, isCompleted))
        .orderBy(desc(actionItemsTable.createdAt));
    } else {
      actionItems = await db
        .select({
          id: actionItemsTable.id,
          standupEntryId: actionItemsTable.standupEntryId,
          userId: actionItemsTable.userId,
          userName: standupEntries.userName,
          assigneeUserId: actionItemsTable.assigneeUserId,
          description: actionItemsTable.description,
          completed: actionItemsTable.completed,
          completedAt: actionItemsTable.completedAt,
          createdAt: actionItemsTable.createdAt,
        })
        .from(actionItemsTable)
        .leftJoin(standupEntries, eq(actionItemsTable.standupEntryId, standupEntries.id))
        .orderBy(desc(actionItemsTable.createdAt));
    }

    return NextResponse.json({ actionItems });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch action items";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
