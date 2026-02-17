import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sprintSnapshots } from "@/lib/db/schema";
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
    const snapshot = await db
      .select()
      .from(sprintSnapshots)
      .where(eq(sprintSnapshots.id, numericId));

    if (snapshot.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(snapshot[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch snapshot";
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
    await db.delete(sprintSnapshots).where(eq(sprintSnapshots.id, numericId));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete snapshot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
