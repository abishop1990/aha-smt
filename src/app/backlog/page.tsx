"use client";

import { useState, useEffect, useMemo } from "react";
import { BacklogFilters } from "@/components/backlog/backlog-filters";
import { BacklogTable } from "@/components/backlog/backlog-table";
import { useReleases } from "@/hooks/use-releases";
import { useFeatures } from "@/hooks/use-features";
import { useProductFeatures } from "@/hooks/use-product-features";
import { useFeaturesByTag } from "@/hooks/use-features-by-tag";
import { useFeaturesByEpic } from "@/hooks/use-features-by-epic";
import { useConfig } from "@/hooks/use-config";

export default function BacklogPage() {
  const { data: config } = useConfig();
  // Undefined until config loads, so no mode's data is fetched on a guess.
  const filterType = config?.backlog.filterType;
  const teamProductId = config?.backlog.teamProductId ?? null;
  const configTagFilter = config?.backlog.tagFilter ?? null;
  const epicId = config?.backlog.epicId ?? null;

  // Release mode state
  const { data: releasesData } = useReleases(undefined, { enabled: filterType === "release" });
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
    filterType === "release" ? effectiveReleaseId : null
  );

  // Team location mode: fetch all product features (locations come from response)
  const productFeatures = useProductFeatures(
    filterType === "team_location" ? teamProductId : null
  );

  // Tag mode: fetch features by tag
  const tagFeatures = useFeaturesByTag(
    filterType === "tag" ? teamProductId : null,
    filterType === "tag" ? configTagFilter : null
  );

  // Epic mode: fetch features by epic
  const epicFeatures = useFeaturesByEpic(
    filterType === "epic" ? epicId : null
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
    filterType === "team_location" ? locationFilteredFeatures :
    filterType === "tag" ? tagFeatures.data?.features :
    filterType === "epic" ? epicFeatures.data?.features :
    releaseFeatures.data?.features;
  const isLoading =
    !config ? true :
    filterType === "team_location" ? productFeatures.isLoading :
    filterType === "tag" ? tagFeatures.isLoading :
    filterType === "epic" ? epicFeatures.isLoading :
    releaseFeatures.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Backlog</h1>
        <p className="text-text-secondary mt-1">All features in the current backlog</p>
      </div>

      {filterType === "team_location" ? (
        <div className="flex flex-wrap items-center gap-3">
          {teamLocations && teamLocations.length > 0 && (
            <>
              <label htmlFor="location-select" className="sr-only">
                Location
              </label>
              <select
                id="location-select"
                value={selectedTeamLocation ?? ""}
                onChange={(e) => setSelectedTeamLocation(e.target.value)}
                className="h-9 w-[240px] px-3 bg-surface border border-border rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {teamLocations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </>
          )}

          <BacklogFilters
            assigneeFilter={assigneeFilter}
            onAssigneeChange={setAssigneeFilter}
            tagFilter={tagFilter}
            onTagChange={setTagFilter}
          />
        </div>
      ) : filterType === "tag" || filterType === "epic" ? (
        /* Tag/epic modes: filter is config-driven, no release selector needed */
        <BacklogFilters
          assigneeFilter={assigneeFilter}
          onAssigneeChange={setAssigneeFilter}
          tagFilter={tagFilter}
          onTagChange={setTagFilter}
        />
      ) : filterType === "release" ? (
        <BacklogFilters
          releaseId={effectiveReleaseId}
          onReleaseChange={setReleaseId}
          assigneeFilter={assigneeFilter}
          onAssigneeChange={setAssigneeFilter}
          tagFilter={tagFilter}
          onTagChange={setTagFilter}
        />
      ) : null}

      <BacklogTable
        features={features}
        isLoading={isLoading}
        assigneeFilter={assigneeFilter}
        tagFilter={tagFilter}
      />
    </div>
  );
}
