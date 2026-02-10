import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { blockersTable } from "@/lib/db/schema";
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

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    if (body.status === "resolved") {
      updateData.resolvedAt = new Date().toISOString();
    }

    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    if (body.featureRef !== undefined) {
      updateData.featureRef = body.featureRef;
    }

    const updated = await db
      .update(blockersTable)
      .set(updateData)
      .where(eq(blockersTable.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update blocker";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
