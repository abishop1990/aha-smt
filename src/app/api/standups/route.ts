import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { standupEntries, blockersTable, actionItemsTable } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = request.nextUrl;
    const date = searchParams.get("date");
    const userId = searchParams.get("userId");

    const query = db.select().from(standupEntries).orderBy(desc(standupEntries.createdAt));

    const conditions = [];
    if (date) conditions.push(eq(standupEntries.standupDate, date));
    if (userId) conditions.push(eq(standupEntries.userId, userId));

    const entries =
      conditions.length > 0
        ? await db
            .select()
            .from(standupEntries)
            .where(conditions.length === 1 ? conditions[0] : and(...conditions))
            .orderBy(desc(standupEntries.createdAt))
        : await query;

    return NextResponse.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch standups";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    const now = new Date().toISOString();
    const entry = await db
      .insert(standupEntries)
      .values({
        userId: body.userId,
        userName: body.userName,
        standupDate: body.standupDate,
        doneSinceLastStandup: body.doneSinceLastStandup || "",
        workingOnNow: body.workingOnNow || "",
        blockers: body.blockers || "",
        actionItems: body.actionItems || "",
        featureRefs: JSON.stringify(body.featureRefs || []),
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Create blocker records if any
    if (body.blockerItems && Array.isArray(body.blockerItems)) {
      for (const blocker of body.blockerItems) {
        await db.insert(blockersTable).values({
          standupEntryId: entry[0].id,
          userId: body.userId,
          description: blocker.description,
          featureRef: blocker.featureRef || null,
          status: "open",
          createdAt: now,
        });
      }
    }

    // Create action item records if any
    if (body.actionItemEntries && Array.isArray(body.actionItemEntries)) {
      for (const item of body.actionItemEntries) {
        await db.insert(actionItemsTable).values({
          standupEntryId: entry[0].id,
          userId: body.userId,
          assigneeUserId: item.assigneeUserId || null,
          description: item.description,
          completed: false,
          createdAt: now,
        });
      }
    }

    return NextResponse.json(entry[0], { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create standup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
