import { NextResponse } from "next/server";
import { listIterations } from "@/lib/aha-client";
import { getEnv } from "@/lib/env";

export async function GET() {
  try {
    const env = getEnv();
    const teamProductId = env.AHA_TEAM_PRODUCT_ID;

    if (!teamProductId) {
      return NextResponse.json(
        { error: "AHA_TEAM_PRODUCT_ID is not configured" },
        { status: 400 }
      );
    }

    const iterations = await listIterations(teamProductId);

    // Sort: "started" status first, then by start_date descending (nulls last)
    const sorted = iterations.sort((a, b) => {
      // Status priority: "started" comes first
      if (a.status === "started" && b.status !== "started") return -1;
      if (a.status !== "started" && b.status === "started") return 1;

      // Then by start_date descending (nulls last)
      if (!a.start_date && !b.start_date) return 0;
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return b.start_date.localeCompare(a.start_date);
    });

    return NextResponse.json({ iterations: sorted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch iterations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
