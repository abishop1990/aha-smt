import { NextRequest, NextResponse } from "next/server";
import { listPlanningPokerVotes, PLANNING_POKER_BATCH_SIZE } from "@/lib/aha-client";

/** GET /api/aha/poker-votes?ids=1,2,3 — planning-poker votes for up to 50 features in one Aha request. */
export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0 || ids.length > PLANNING_POKER_BATCH_SIZE) {
    return NextResponse.json(
      { error: `Pass between 1 and ${PLANNING_POKER_BATCH_SIZE} feature ids` },
      { status: 400 }
    );
  }

  try {
    const votesByFeature = await listPlanningPokerVotes(ids);
    return NextResponse.json({ votesByFeature });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch planning poker votes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
