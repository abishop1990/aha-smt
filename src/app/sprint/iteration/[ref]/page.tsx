"use client";

import { use, useMemo } from "react";
import { useIterations } from "@/hooks/use-iterations";
import { useIterationFeatures } from "@/hooks/use-iteration-features";
import { useDaysOff } from "@/hooks/use-schedules";
import { useSettings } from "@/hooks/use-settings";
import { SprintOverview } from "@/components/sprint/sprint-overview";
import { MemberAllocationTable } from "@/components/sprint/member-allocation-table";
import { SprintFeatureList } from "@/components/sprint/sprint-feature-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { differenceInBusinessDays, parseISO, isAfter } from "date-fns";
import { calculateMemberCapacities } from "@/lib/capacity";

export default function IterationDetailPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = use(params);

  const { data: iterationsData, isLoading: iterationsLoading } = useIterations();
  const iterations = iterationsData?.iterations ?? [];
  const iteration = iterations.find((i) => i.reference_num === ref);

  const { data: featuresData, isLoading: featuresLoading } = useIterationFeatures(ref);
  const features = useMemo(() => featuresData?.features ?? [], [featuresData]);
  const { data: settings } = useSettings();
  const pointsPerDay = parseFloat(settings?.defaultPointsPerDay ?? "1");

  const startDate = iteration?.start_date ?? null;
  const endDate = iteration?.end_date ?? null;

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

  const isLoading = iterationsLoading || featuresLoading;

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
