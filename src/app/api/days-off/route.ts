import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { daysOff } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const conditions = [];
    if (userId) conditions.push(eq(daysOff.userId, userId));
    if (startDate) conditions.push(gte(daysOff.date, startDate));
    if (endDate) conditions.push(lte(daysOff.date, endDate));

    const entries =
      conditions.length > 0
        ? await db
            .select()
            .from(daysOff)
            .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        : await db.select().from(daysOff);

    return NextResponse.json({ daysOff: entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch days off";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    const entry = await db
      .insert(daysOff)
      .values({
        userId: body.userId || null,
        userName: body.userName || null,
        date: body.date,
        reason: body.reason || "",
        isHoliday: body.isHoliday || false,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(entry[0], { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create day off";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
