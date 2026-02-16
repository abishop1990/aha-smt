"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useReleases } from "@/hooks/use-releases";
import { useFeatures, useUpdateFeatureEstimate } from "@/hooks/use-features";
import { useFeaturesByLocation } from "@/hooks/use-features-by-location";
import { useTeamLocations } from "@/hooks/use-team-locations";
import { useConfig } from "@/hooks/use-config";
import { EstimationQueue } from "@/components/estimate/estimation-queue";
import { EstimationCard } from "@/components/estimate/estimation-card";
import { CriteriaScorer } from "@/components/estimate/criteria-scorer";
import { PointPicker } from "@/components/estimate/point-picker";
import { EstimationContextPanel } from "@/components/estimate/estimation-context-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { getSuggestedPoints, type EstimationCriteria } from "@/lib/constants";
import { Calculator } from "lucide-react";

function EstimatePageContent() {
  const searchParams = useSearchParams();
  const { data: config } = useConfig();
  const filterType = config?.backlog.filterType ?? "release";
  const teamProductId = config?.backlog.teamProductId ?? null;

  const { data: releasesData } = useReleases();
  const { data: teamLocationsData } = useTeamLocations(
    filterType === "team_location" ? teamProductId : null
  );

  // Determine which filter to use based on config
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);
  const [selectedTeamLocation, setSelectedTeamLocation] = useState<string | null>(null);

  // Set defaults when data loads
  useEffect(() => {
    if (filterType === "release" && releasesData && !selectedReleaseId) {
      const defaultRelease =
        releasesData.releases.find((r) => r.parking_lot) ?? releasesData.releases[0];
      if (defaultRelease) setSelectedReleaseId(defaultRelease.id);
    } else if (filterType === "team_location" && teamLocationsData && !selectedTeamLocation) {
      // Default to "Prioritized backlog" if available, otherwise first option
      const prioritizedBacklog = teamLocationsData.team_locations.find(
        (loc) => loc === "Prioritized backlog"
      );
      setSelectedTeamLocation(prioritizedBacklog ?? teamLocationsData.team_locations[0] ?? null);
    }
  }, [filterType, releasesData, teamLocationsData, selectedReleaseId, selectedTeamLocation]);

  // Fetch features based on filter type
  const releaseFeatures = useFeatures(
    filterType === "release" ? selectedReleaseId : null,
    { unestimatedOnly: true }
  );
  const locationFeatures = useFeaturesByLocation(
    filterType === "team_location" ? teamProductId : null,
    selectedTeamLocation,
    { unestimatedOnly: true }
  );

  const { data: featuresData, isLoading } =
    filterType === "team_location" ? locationFeatures : releaseFeatures;

  const updateEstimate = useUpdateFeatureEstimate();

  const features = useMemo(() => featuresData?.features ?? [], [featuresData]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [criteria, setCriteria] = useState<EstimationCriteria>({
    scope: "M",
    complexity: "M",
    unknowns: "M",
  });
  const [selectedPoints, setSelectedPoints] = useState<number | null>(null);
  const [estimatedIds, setEstimatedIds] = useState<Set<string>>(new Set());
  const hasAppliedPreSelection = useRef(false);

  // Auto-select feature from query param
  useEffect(() => {
    if (hasAppliedPreSelection.current || features.length === 0) return;

    const featureId = searchParams.get("featureId");
    if (featureId) {
      const index = features.findIndex((f) => f.id === featureId);
      if (index !== -1) {
        setCurrentIndex(index);
        hasAppliedPreSelection.current = true;
      }
    }
  }, [features, searchParams]);

  const currentFeature = features[currentIndex] ?? null;
  const suggestedPoints = getSuggestedPoints(criteria);

  const handleSubmit = useCallback(
    async (points: number) => {
      if (!currentFeature) return;

      try {
        await updateEstimate.mutateAsync({
          featureId: currentFeature.id,
          points,
          field: "original_estimate",
        });

        // Save estimation history
        await fetch("/api/estimation-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            featureId: currentFeature.id,
            featureRefNum: currentFeature.reference_num,
            featureName: currentFeature.name,
            scope: criteria.scope,
            complexity: criteria.complexity,
            unknowns: criteria.unknowns,
            suggestedPoints,
            finalPoints: points,
          }),
        }).catch(() => {}); // Best effort

        toast.success(`Estimated ${currentFeature.reference_num} at ${points} points`);

        setEstimatedIds((prev) => new Set(prev).add(currentFeature.id));
        setSelectedPoints(null);
        setCriteria({ scope: "M", complexity: "M", unknowns: "M" });

        // Move to next
        if (currentIndex < features.length - 1) {
          setCurrentIndex((i) => i + 1);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        toast.error(
          `Failed to save estimate for ${currentFeature.reference_num}`,
          {
            description: errorMessage,
            action: {
              label: "Retry",
              onClick: () => handleSubmit(points),
            },
          }
        );
        console.error("Estimation error:", error);
      }
    },
    [currentFeature, currentIndex, criteria, suggestedPoints, features.length, updateEstimate]
  );

  const handleSkip = useCallback(() => {
    if (currentIndex < features.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
    setSelectedPoints(null);
    setCriteria({ scope: "M", complexity: "M", unknowns: "M" });
  }, [currentIndex, features.length]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-6">
          <Skeleton className="h-96 col-span-1" />
          <Skeleton className="h-96 col-span-2" />
          <Skeleton className="h-96 col-span-1" />
        </div>
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Estimation</h1>
        <EmptyState
          icon={<Calculator className="h-12 w-12" />}
          title="All features estimated"
          description="No unestimated features found in the current release. Nice work!"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Estimation</h1>
        <p className="text-text-secondary mt-1">
          Score features using the three-criteria model
        </p>
      </div>

      {/* Filter selector based on config */}
      {filterType === "release" && releasesData && (
        <div className="flex items-center gap-3">
          <label htmlFor="release-select" className="text-sm font-medium text-text-primary">
            Backlog:
          </label>
          <select
            id="release-select"
            value={selectedReleaseId ?? ""}
            onChange={(e) => setSelectedReleaseId(e.target.value)}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {releasesData.releases.map((release) => (
              <option key={release.id} value={release.id}>
                {release.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {filterType === "team_location" && teamLocationsData && (
        <div className="flex items-center gap-3">
          <label htmlFor="location-select" className="text-sm font-medium text-text-primary">
            Backlog:
          </label>
          <select
            id="location-select"
            value={selectedTeamLocation ?? ""}
            onChange={(e) => setSelectedTeamLocation(e.target.value)}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {teamLocationsData.team_locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Queue sidebar */}
        <div className="col-span-3">
          <EstimationQueue
            features={features}
            currentIndex={currentIndex}
            onSelect={setCurrentIndex}
            estimatedIds={estimatedIds}
          />
        </div>

        {/* Main estimation area */}
        <div className="col-span-6 space-y-6">
          {currentFeature && <EstimationCard feature={currentFeature} />}

          <CriteriaScorer criteria={criteria} onChange={setCriteria} />

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <PointPicker
                suggestedPoints={suggestedPoints}
                selectedPoints={selectedPoints}
                onSelect={(pts) => {
                  setSelectedPoints(pts);
                  handleSubmit(pts);
                }}
                onSkip={handleSkip}
              />
            </div>
          </div>

          {updateEstimate.isPending && (
            <p className="text-sm text-text-secondary">Saving to Aha...</p>
          )}
        </div>

        {/* Context panel */}
        <div className="col-span-3">
          {currentFeature && filterType === "release" && selectedReleaseId && (
            <EstimationContextPanel
              featureTags={currentFeature.tags ?? []}
              releaseId={selectedReleaseId}
            />
          )}
          {currentFeature && filterType === "team_location" && (
            <div className="p-4 bg-surface border border-border rounded-lg">
              <h3 className="text-sm font-medium text-text-primary mb-2">Context</h3>
              <p className="text-xs text-text-secondary">
                Team Location: {selectedTeamLocation}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EstimatePage() {
  return (
    <ErrorBoundary>
      <EstimatePageContent />
    </ErrorBoundary>
  );
}
