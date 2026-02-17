import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { standupEntries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id);
    if (isNaN(numericId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    const db = getDb();
    const entry = await db
      .select()
      .from(standupEntries)
      .where(eq(standupEntries.id, numericId));

    if (entry.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(entry[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch standup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id);
    if (isNaN(numericId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    const db = getDb();
    const body = await request.json();

    const updated = await db
      .update(standupEntries)
      .set({
        doneSinceLastStandup: body.doneSinceLastStandup,
        workingOnNow: body.workingOnNow,
        blockers: body.blockers,
        actionItems: body.actionItems,
        featureRefs: body.featureRefs ? JSON.stringify(body.featureRefs) : undefined,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(standupEntries.id, numericId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update standup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id);
    if (isNaN(numericId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    const db = getDb();
    await db.delete(standupEntries).where(eq(standupEntries.id, numericId));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete standup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
