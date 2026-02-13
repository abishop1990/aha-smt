import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { standupEntries, blockersTable, actionItemsTable } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

const createStandupSchema = z.object({
  userId: z.string().min(1),
  userName: z.string().min(1),
  standupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  doneSinceLastStandup: z.string().optional(),
  workingOnNow: z.string().optional(),
  blockers: z.string().optional(),
  actionItems: z.string().optional(),
  featureRefs: z.array(z.string()).optional(),
  blockerItems: z
    .array(
      z.object({
        description: z.string().min(1),
        featureRef: z.string().nullable().optional(),
      })
    )
    .optional(),
  actionItemEntries: z
    .array(
      z.object({
        description: z.string().min(1),
        assigneeUserId: z.string().nullable().optional(),
      })
    )
    .optional(),
});

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

    // Validate request body
    const validation = createStandupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const now = new Date().toISOString();
    const entry = await db
      .insert(standupEntries)
      .values({
        userId: data.userId,
        userName: data.userName,
        standupDate: data.standupDate,
        doneSinceLastStandup: data.doneSinceLastStandup || "",
        workingOnNow: data.workingOnNow || "",
        blockers: data.blockers || "",
        actionItems: data.actionItems || "",
        featureRefs: JSON.stringify(data.featureRefs || []),
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Create blocker records if any
    if (data.blockerItems && Array.isArray(data.blockerItems)) {
      for (const blocker of data.blockerItems) {
        await db.insert(blockersTable).values({
          standupEntryId: entry[0].id,
          userId: data.userId,
          description: blocker.description,
          featureRef: blocker.featureRef || null,
          status: "open",
          createdAt: now,
        });
      }
    }

    // Create action item records if any
    if (data.actionItemEntries && Array.isArray(data.actionItemEntries)) {
      for (const item of data.actionItemEntries) {
        await db.insert(actionItemsTable).values({
          standupEntryId: entry[0].id,
          userId: data.userId,
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
