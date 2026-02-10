import { NextResponse } from "next/server";

// Aha's schedule API is limited — this endpoint serves as a proxy
// for team capacity data. For now, we return a default schedule.
// TODO: Explore /api/v1/project_teams/{id}/schedules when available.

export async function GET() {
  try {
    return NextResponse.json({
      schedules: [],
      note: "Schedule data is managed locally. Use the sprint planning page to set points-per-day per team member.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch schedules";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
