"use client";

import { use, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFeatures } from "@/hooks/use-features";
import { useDaysOff } from "@/hooks/use-schedules";
import { useSettings } from "@/hooks/use-settings";
import { SprintOverview } from "@/components/sprint/sprint-overview";
import { MemberAllocationTable } from "@/components/sprint/member-allocation-table";
import { SprintFeatureList } from "@/components/sprint/sprint-feature-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { differenceInBusinessDays, parseISO, isAfter } from "date-fns";
import { calculateMemberCapacities } from "@/lib/capacity";
import type { AhaRelease } from "@/lib/aha-types";

export default function SprintDetailPage({
  params,
}: {
  params: Promise<{ releaseId: string }>;
}) {
  const { releaseId } = use(params);

  const { data: releaseData, isLoading: releaseLoading } = useQuery<AhaRelease>({
    queryKey: ["release", releaseId],
    queryFn: async () => {
      const res = await fetch(`/api/aha/releases/${releaseId}`);
      if (!res.ok) throw new Error("Failed to fetch release");
      const data = await res.json();
      return data.release || data;
    },
  });

  const { data: featuresData, isLoading: featuresLoading } = useFeatures(releaseId);
  const features = useMemo(() => featuresData?.features ?? [], [featuresData]);
  const release = releaseData;
  const { data: settings } = useSettings();
  const pointsPerDay = parseFloat(settings?.defaultPointsPerDay ?? "1");

  const startDate = release?.start_date ? release.start_date : null;
  const endDate = release?.release_date ? release.release_date : null;

  const { data: daysOffData } = useDaysOff(
    startDate && endDate
      ? { startDate, endDate }
      : undefined
  );

  const daysRemaining = useMemo(() => {
    if (!endDate) return 0;
    const end = parseISO(endDate);
    const now = new Date();
    if (isAfter(now, end)) return 0;
    return differenceInBusinessDays(end, now);
  }, [endDate]);

  const memberCapacities = useMemo(
    () =>
      calculateMemberCapacities(
        startDate,
        endDate,
        features,
        daysOffData?.daysOff ?? [],
        pointsPerDay
      ),
    [startDate, endDate, features, daysOffData, pointsPerDay]
  );

  const isLoading = releaseLoading || featuresLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {release?.name ?? "Sprint"}
        </h1>
        <p className="text-text-secondary mt-1 font-mono text-sm">
          {release?.reference_num}
        </p>
      </div>

      {release && (
        <SprintOverview
          release={release}
          features={features}
          daysRemaining={daysRemaining}
        />
      )}

      <Tabs defaultValue="allocation">
        <TabsList>
          <TabsTrigger value="allocation">Team Allocation</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>
        <TabsContent value="allocation" className="mt-4">
          <MemberAllocationTable
            features={features}
            memberCapacities={memberCapacities}
          />
        </TabsContent>
        <TabsContent value="features" className="mt-4">
          <SprintFeatureList features={features} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
