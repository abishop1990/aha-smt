"use client";

import { use, useMemo } from "react";
import { useIterationFeatures } from "@/hooks/use-iteration-features";
import { useDaysOff } from "@/hooks/use-schedules";
import { useSettings } from "@/hooks/use-settings";
import { SprintOverview } from "@/components/sprint/sprint-overview";
import { MemberAllocationTable } from "@/components/sprint/member-allocation-table";
import { SprintFeatureList } from "@/components/sprint/sprint-feature-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateMemberCapacities } from "@/lib/capacity";
import { businessDaysRemaining } from "@/lib/date-utils";

export default function IterationDetailPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = use(params);

  // One request returns the iteration header, its features and Aha team capacity
  const { data: iterationData, isLoading } = useIterationFeatures(ref);
  const iteration = iterationData?.iteration;
  const features = useMemo(() => iterationData?.features ?? [], [iterationData]);
  const { data: settings } = useSettings();
  const pointsPerDay = parseFloat(settings?.defaultPointsPerDay ?? "1");

  const startDate = iteration?.start_date ?? null;
  const endDate = iteration?.end_date ?? null;

  const { data: daysOffData } = useDaysOff(
    startDate && endDate
      ? { startDate, endDate }
      : undefined
  );

  const daysRemaining = useMemo(() => businessDaysRemaining(endDate), [endDate]);

  const memberCapacities = useMemo(
    () =>
      calculateMemberCapacities(
        startDate,
        endDate,
        features,
        daysOffData?.daysOff ?? [],
        pointsPerDay,
        iterationData?.teamCapacity
      ),
    [startDate, endDate, features, daysOffData, pointsPerDay, iterationData]
  );

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
          {iteration?.name ?? "Iteration"}
        </h1>
        <p className="text-text-secondary mt-1 font-mono text-sm">
          {iteration?.reference_num}
        </p>
      </div>

      {iteration && (
        <SprintOverview
          sprintName={iteration.name}
          startDate={iteration.start_date ?? null}
          endDate={iteration.end_date ?? null}
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
