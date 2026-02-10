"use client";

import { useState, useCallback } from "react";
import { useReleases } from "@/hooks/use-releases";
import { useFeatures, useUpdateFeatureScore } from "@/hooks/use-features";
import { EstimationQueue } from "@/components/estimate/estimation-queue";
import { EstimationCard } from "@/components/estimate/estimation-card";
import { CriteriaScorer } from "@/components/estimate/criteria-scorer";
import { PointPicker } from "@/components/estimate/point-picker";
import { EstimationContextPanel } from "@/components/estimate/estimation-context-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { getSuggestedPoints, type EstimationCriteria } from "@/lib/constants";
import { Calculator } from "lucide-react";

export default function EstimatePage() {
  const { data: releasesData } = useReleases();
  const releaseId = releasesData?.releases?.[0]?.id ?? null;
  const { data: featuresData, isLoading } = useFeatures(releaseId, {
    unestimatedOnly: true,
  });
  const updateScore = useUpdateFeatureScore();

  const features = featuresData?.features ?? [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [criteria, setCriteria] = useState<EstimationCriteria>({
    scope: "M",
    complexity: "M",
    unknowns: "M",
  });
  const [selectedPoints, setSelectedPoints] = useState<number | null>(null);
  const [estimatedIds, setEstimatedIds] = useState<Set<string>>(new Set());

  const currentFeature = features[currentIndex] ?? null;
  const suggestedPoints = getSuggestedPoints(criteria);

  const handleSubmit = useCallback(
    async (points: number) => {
      if (!currentFeature) return;

      await updateScore.mutateAsync({
        featureId: currentFeature.id,
        score: points,
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

      setEstimatedIds((prev) => new Set(prev).add(currentFeature.id));
      setSelectedPoints(null);
      setCriteria({ scope: "M", complexity: "M", unknowns: "M" });

      // Move to next
      if (currentIndex < features.length - 1) {
        setCurrentIndex((i) => i + 1);
      }
    },
    [currentFeature, currentIndex, criteria, suggestedPoints, features.length, updateScore]
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

          {updateScore.isPending && (
            <p className="text-sm text-text-secondary">Saving to Aha...</p>
          )}
        </div>

        {/* Context panel */}
        <div className="col-span-3">
          {currentFeature && releaseId && (
            <EstimationContextPanel
              featureTags={currentFeature.tags ?? []}
              releaseId={releaseId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
