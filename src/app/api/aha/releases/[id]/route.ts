import { NextRequest, NextResponse } from "next/server";
import { getRelease } from "@/lib/aha-client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const release = await getRelease(id);
    return NextResponse.json({ release });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch release";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
