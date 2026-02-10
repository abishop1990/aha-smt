"use client";

import { useState } from "react";
import { BacklogFilters } from "@/components/backlog/backlog-filters";
import { BacklogTable } from "@/components/backlog/backlog-table";
import { useReleases } from "@/hooks/use-releases";

export default function BacklogPage() {
  const { data: releasesData } = useReleases();
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  // Auto-select first release
  const effectiveReleaseId = releaseId ?? releasesData?.releases?.[0]?.id ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Unestimated Backlog
        </h1>
        <p className="text-text-secondary mt-1">
          Features that need story point estimates
        </p>
      </div>

      <BacklogFilters
        releaseId={effectiveReleaseId}
        onReleaseChange={setReleaseId}
        assigneeFilter={assigneeFilter}
        onAssigneeChange={setAssigneeFilter}
        tagFilter={tagFilter}
        onTagChange={setTagFilter}
      />

      <BacklogTable
        releaseId={effectiveReleaseId}
        assigneeFilter={assigneeFilter}
        tagFilter={tagFilter}
      />
    </div>
  );
}
