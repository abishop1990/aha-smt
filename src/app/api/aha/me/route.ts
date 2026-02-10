import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/aha-client";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch current user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
