import { NextResponse } from "next/server";
import { listTeams } from "@/lib/aha-client";

export async function GET() {
  try {
    const teams = await listTeams();
    return NextResponse.json({ teams });
  } catch (error) {
    // /project_teams returns 404 on some Aha! plans — return empty list gracefully
    const message = error instanceof Error ? error.message : "";
    if (message.includes("404")) {
      return NextResponse.json({ teams: [] });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
