"use client";

import { use, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFeatures } from "@/hooks/use-features";
import { useDaysOff } from "@/hooks/use-schedules";
import { SprintOverview } from "@/components/sprint/sprint-overview";
import { MemberAllocationTable } from "@/components/sprint/member-allocation-table";
import { SprintFeatureList } from "@/components/sprint/sprint-feature-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { differenceInBusinessDays, parseISO, isAfter } from "date-fns";
import type { AhaRelease } from "@/lib/aha-types";

const DEFAULT_POINTS_PER_DAY = 1;

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
