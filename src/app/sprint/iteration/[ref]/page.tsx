"use client";

import { use, useMemo } from "react";
import { useIterations } from "@/hooks/use-iterations";
import { useIterationFeatures } from "@/hooks/use-iteration-features";
import { useDaysOff } from "@/hooks/use-schedules";
import { SprintOverview } from "@/components/sprint/sprint-overview";
import { MemberAllocationTable } from "@/components/sprint/member-allocation-table";
import { SprintFeatureList } from "@/components/sprint/sprint-feature-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { differenceInBusinessDays, parseISO, isAfter } from "date-fns";

const DEFAULT_POINTS_PER_DAY = 1;

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

  const memberCapacities = useMemo(() => {
    if (!startDate || !endDate) return {};

    const totalBusinessDays = differenceInBusinessDays(parseISO(endDate), parseISO(startDate));
    const daysOffList = daysOffData?.daysOff ?? [];

    // Build a map of userId -> days off count
    const daysOffByUser = new Map<string, number>();
    const holidayCount = daysOffList.filter((d) => d.isHoliday).length;

    for (const d of daysOffList) {
      if (d.userId && !d.isHoliday) {
        daysOffByUser.set(d.userId, (daysOffByUser.get(d.userId) || 0) + 1);
      }
    }

    // Build capacity per member from features' assignees
    const members: Record<
      string,
      { name: string; capacity: number; pointsPerDay: number; daysOff: number }
    > = {};

    for (const f of features) {
      const userId = f.assigned_to_user?.id;
      if (userId && !members[userId]) {
        const userDaysOff = (daysOffByUser.get(userId) || 0) + holidayCount;
        const availableDays = Math.max(0, totalBusinessDays - userDaysOff);
        members[userId] = {
          name: f.assigned_to_user?.name ?? "Unknown",
          capacity: availableDays * DEFAULT_POINTS_PER_DAY,
          pointsPerDay: DEFAULT_POINTS_PER_DAY,
          daysOff: userDaysOff,
        };
      }
    }

    return members;
  }, [startDate, endDate, features, daysOffData]);

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
