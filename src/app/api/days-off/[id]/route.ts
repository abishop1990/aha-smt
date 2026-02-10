import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { daysOff } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    await db.delete(daysOff).where(eq(daysOff.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete day off";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
