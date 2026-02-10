"use client";

import { use } from "react";
import { StandupTimeline } from "@/components/standup/standup-timeline";

export default function StandupDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = use(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Standup</h1>
        <p className="text-text-secondary mt-1">Viewing standup for {date}</p>
      </div>
      <StandupTimeline initialDate={date} />
    </div>
  );
}
