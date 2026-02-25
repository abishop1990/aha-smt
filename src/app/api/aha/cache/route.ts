import { clearCache } from "@/lib/aha-cache";
import { NextResponse } from "next/server";

export async function POST() {
  clearCache();
  return NextResponse.json({ ok: true });
}
