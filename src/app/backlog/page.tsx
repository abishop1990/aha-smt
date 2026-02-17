"use client";

import { useState, useEffect, useMemo } from "react";
import { BacklogFilters } from "@/components/backlog/backlog-filters";
import { BacklogTable } from "@/components/backlog/backlog-table";
import { useReleases } from "@/hooks/use-releases";
import { useFeatures } from "@/hooks/use-features";
import { useProductFeatures } from "@/hooks/use-product-features";
import { useConfig } from "@/hooks/use-config";

export default function BacklogPage() {
  const { data: config } = useConfig();
  const filterType = config?.backlog.filterType ?? "release";
  const teamProductId = config?.backlog.teamProductId ?? null;

  // Release mode state
  const { data: releasesData } = useReleases();
  const [releaseId, setReleaseId] = useState<string | null>(null);

  // Team location mode state
  const [selectedTeamLocation, setSelectedTeamLocation] = useState<string | null>(null);

  // Shared filter state
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  // Auto-select parking lot (or first release) in release mode
  const defaultRelease =
    releasesData?.releases.find((r) => r.parking_lot) ?? releasesData?.releases?.[0];
  const effectiveReleaseId = releaseId ?? defaultRelease?.id ?? null;

  // Release mode: fetch features for selected release
  const releaseFeatures = useFeatures(
    filterType === "release" ? effectiveReleaseId : null,
    { unestimatedOnly: true }
  );

  // Team location mode: fetch all product features (locations come from response)
  const productFeatures = useProductFeatures(
    filterType === "team_location" ? teamProductId : null,
    { unestimatedOnly: true }
  );

  const teamLocations = productFeatures.data?.team_locations ?? null;

  // Auto-select first team location when data arrives
  useEffect(() => {
    if (filterType === "team_location" && teamLocations && !selectedTeamLocation) {
      const prioritizedBacklog = teamLocations.find((loc) => loc === "Prioritized backlog");
      setSelectedTeamLocation(prioritizedBacklog ?? teamLocations[0] ?? null);
    }
  }, [filterType, teamLocations, selectedTeamLocation]);

  // Client-side filter for team_location mode
  const locationFilteredFeatures = useMemo(() => {
    if (!productFeatures.data) return undefined;
    return selectedTeamLocation
      ? productFeatures.data.features.filter((f) => f.team_location === selectedTeamLocation)
      : productFeatures.data.features;
  }, [productFeatures.data, selectedTeamLocation]);

  // Resolve features + isLoading based on filterType
  const features =
    filterType === "team_location" ? locationFilteredFeatures : releaseFeatures.data?.features;
  const isLoading =
    filterType === "team_location" ? productFeatures.isLoading : releaseFeatures.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Unestimated Backlog</h1>
        <p className="text-text-secondary mt-1">Features that need story point estimates</p>
      </div>

      {filterType === "team_location" ? (
        <div className="space-y-3">
          {/* Location selector */}
          {teamLocations && teamLocations.length > 0 && (
            <div className="flex items-center gap-3">
              <label
                htmlFor="location-select"
                className="text-sm font-medium text-text-primary"
              >
                Location:
              </label>
              <select
                id="location-select"
                value={selectedTeamLocation ?? ""}
                onChange={(e) => setSelectedTeamLocation(e.target.value)}
                className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {teamLocations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Assignee / tag filters (no release selector in this mode) */}
          <BacklogFilters
            releaseId={null}
            onReleaseChange={() => {}}
            assigneeFilter={assigneeFilter}
            onAssigneeChange={setAssigneeFilter}
            tagFilter={tagFilter}
            onTagChange={setTagFilter}
          />
        </div>
      ) : (
        <BacklogFilters
          releaseId={effectiveReleaseId}
          onReleaseChange={setReleaseId}
          assigneeFilter={assigneeFilter}
          onAssigneeChange={setAssigneeFilter}
          tagFilter={tagFilter}
          onTagChange={setTagFilter}
        />
      )}

      <BacklogTable
        features={features}
        isLoading={isLoading}
        assigneeFilter={assigneeFilter}
        tagFilter={tagFilter}
      />
    </div>
  );
}
