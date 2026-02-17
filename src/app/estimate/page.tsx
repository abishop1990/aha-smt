"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useReleases } from "@/hooks/use-releases";
import { useFeatures, useFeature, useUpdateFeatureEstimate } from "@/hooks/use-features";
import { useFeaturesByTag } from "@/hooks/use-features-by-tag";
import { useFeaturesByEpic } from "@/hooks/use-features-by-epic";
import { useProductFeatures } from "@/hooks/use-product-features";
import { useConfig } from "@/hooks/use-config";
import { EstimationQueue } from "@/components/estimate/estimation-queue";
import { EstimationCard } from "@/components/estimate/estimation-card";
import { CriteriaScorer } from "@/components/estimate/criteria-scorer";
import { PointPicker } from "@/components/estimate/point-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { getSuggestedPoints, type EstimationCriteria } from "@/lib/constants";
import { Calculator } from "lucide-react";

function EstimatePageContent() {
  const searchParams = useSearchParams();
  const { data: config, isLoading: configLoading } = useConfig();
  const filterType = config?.backlog.filterType ?? "release";
  const teamProductId = config?.backlog.teamProductId ?? null;
  const tagFilter = config?.backlog.tagFilter ?? null;
  const epicId = config?.backlog.epicId ?? null;
  const excludeWorkflowKinds = config?.backlog.excludeWorkflowKinds ?? [];

  const { data: releasesData, isLoading: releasesLoading } = useReleases();

  // For team_location mode: fetch all product features in one pass.
  // team_locations are derived from the response (no separate hook needed).
  const productFeatures = useProductFeatures(
    filterType === "team_location" ? teamProductId : null,
    { unestimatedOnly: true }
  );

  // Determine which filter to use based on config
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);
  const [selectedTeamLocation, setSelectedTeamLocation] = useState<string | null>(null);

  // Derive team_locations from product features (no separate API call needed)
  const teamLocations = productFeatures.data?.team_locations ?? null;

  // Set defaults when data loads
  useEffect(() => {
    if (filterType === "release" && releasesData && !selectedReleaseId) {
      const defaultRelease =
        releasesData.releases.find((r) => r.parking_lot) ?? releasesData.releases[0];
      if (defaultRelease) setSelectedReleaseId(defaultRelease.id);
    } else if (filterType === "team_location" && teamLocations && !selectedTeamLocation) {
      // Default to "Prioritized backlog" if available, otherwise first option
      const prioritizedBacklog = teamLocations.find(
        (loc) => loc === "Prioritized backlog"
      );
      setSelectedTeamLocation(prioritizedBacklog ?? teamLocations[0] ?? null);
    }
  }, [filterType, releasesData, teamLocations, selectedReleaseId, selectedTeamLocation]);

  // Fetch features based on filter type
  const releaseFeatures = useFeatures(
    filterType === "release" ? selectedReleaseId : null,
    { unestimatedOnly: true }
  );

  const tagFeatures = useFeaturesByTag(
    filterType === "tag" ? teamProductId : null,
    filterType === "tag" ? tagFilter : null,
    { unestimatedOnly: true }
  );
  const epicFeatures = useFeaturesByEpic(
    filterType === "epic" ? epicId : null,
    { unestimatedOnly: true }
  );

  // For team_location mode, filter client-side from already-loaded product features.
  // This is instant since the data is already in memory.
  const locationFilteredFeatures = useMemo(() => {
    if (!productFeatures.data) return null;
    const filtered = selectedTeamLocation
      ? productFeatures.data.features.filter(
          (f) => f.team_location === selectedTeamLocation
        )
      : productFeatures.data.features;
    return { features: filtered, total: filtered.length };
  }, [productFeatures.data, selectedTeamLocation]);

  const featuresData =
    filterType === "team_location" ? locationFilteredFeatures :
    filterType === "tag" ? tagFeatures.data :
    filterType === "epic" ? epicFeatures.data :
    releaseFeatures.data;

  const featuresLoading =
    filterType === "team_location" ? productFeatures.isLoading :
    filterType === "tag" ? tagFeatures.isLoading :
    filterType === "epic" ? epicFeatures.isLoading :
    releaseFeatures.isLoading;

  // True while we haven't yet resolved which filter target to fetch.
  // This covers the gap between data arriving and the useEffect setting
  // selectedReleaseId/selectedTeamLocation (which causes a false empty state flash).
  const selectionPending =
    configLoading ||
    (filterType === "release" && (releasesLoading || !selectedReleaseId)) ||
    (filterType === "team_location" && (productFeatures.isLoading || !selectedTeamLocation));

  const isLoading = selectionPending || featuresLoading;

  const updateEstimate = useUpdateFeatureEstimate();

  const features = useMemo(
    () =>
      (featuresData?.features ?? []).filter((f) => {
        if (f.workflow_status?.complete) return false;
        if (
          excludeWorkflowKinds.length > 0 &&
          f.workflow_kind?.name &&
          excludeWorkflowKinds.includes(f.workflow_kind.name)
        ) return false;
        return true;
      }),
    [featuresData, excludeWorkflowKinds]
  );
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

  // Fetch full detail (description, epic, etc.) for the currently-displayed card
  const { data: currentFeatureDetail } = useFeature(currentFeature?.id ?? null);
  const cardFeature = currentFeatureDetail ?? currentFeature;

  const estimationMatrix = config?.estimation.matrix;
  const suggestedPoints = getSuggestedPoints(criteria, estimationMatrix);
  const pointScale = config?.points.scale ?? [];

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
          <Skeleton className="h-96 col-span-3" />
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

      {filterType === "team_location" && teamLocations && (
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
            {teamLocations.map((location) => (
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
        <div className="col-span-9 space-y-6">
          {cardFeature && <EstimationCard feature={cardFeature} />}


          <CriteriaScorer criteria={criteria} onChange={setCriteria} />

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <PointPicker
                suggestedPoints={suggestedPoints}
                selectedPoints={selectedPoints}
                pointScale={pointScale}
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
