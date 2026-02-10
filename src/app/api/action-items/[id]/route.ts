import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { actionItemsTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.completed !== undefined) {
      updateData.completed = body.completed;
      updateData.completedAt = body.completed ? new Date().toISOString() : null;
    }

    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    if (body.assigneeUserId !== undefined) {
      updateData.assigneeUserId = body.assigneeUserId;
    }

    const updated = await db
      .update(actionItemsTable)
      .set(updateData)
      .where(eq(actionItemsTable.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update action item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
