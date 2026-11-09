"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useReleases } from "@/hooks/use-releases";
import { useIterations } from "@/hooks/use-iterations";
import { useFeatures } from "@/hooks/use-features";
import { useIterationFeatures } from "@/hooks/use-iteration-features";
import { useConfig } from "@/hooks/use-config";
import { getPoints, formatPoints, isUnestimated } from "@/lib/points";
import { businessDaysRemaining } from "@/lib/date-utils";

export default function DashboardPage() {
  const { data: config } = useConfig();
  const sprintMode = config?.sprints.mode;

  const { data: iterationsData, isLoading: iterationsLoading } = useIterations();
  const activeIteration =
    sprintMode && sprintMode !== "releases"
      ? (iterationsData?.iterations?.find((i) => i.status === "started") ?? null)
      : null;

  // Releases are only the fallback when no iteration is running, so don't fetch them otherwise.
  const needReleases =
    sprintMode === "releases" ||
    (sprintMode === "both" && !iterationsLoading && !activeIteration);
  const { data: releasesData, isLoading: releasesLoading } = useReleases(undefined, {
    enabled: needReleases,
  });
  const activeRelease = needReleases
    ? (releasesData?.releases?.find((r) => !r.parking_lot && r.status === "in_progress") ?? null)
    : null;

  const { data: releaseFeatures, isLoading: relFeaturesLoading } = useFeatures(
    activeIteration ? null : (activeRelease?.id ?? null)
  );
  const { data: iterFeatures, isLoading: iterFeaturesLoading } = useIterationFeatures(
    activeIteration?.reference_num ?? null
  );

  const sprint = activeIteration
    ? {
        name: activeIteration.name,
        endDate: activeIteration.end_date,
        href: `/sprint/iteration/${activeIteration.reference_num}`,
        features: iterFeatures?.features,
      }
    : activeRelease
      ? {
          name: activeRelease.name,
          endDate: activeRelease.release_date ?? null,
          href: `/sprint/${activeRelease.id}`,
          features: releaseFeatures?.features,
        }
      : null;

  const findingSprint =
    !config || iterationsLoading || (needReleases && releasesLoading);
  const featuresLoading =
    !!sprint && (activeIteration ? iterFeaturesLoading : relFeaturesLoading);

  const features = sprint?.features ?? [];
  const unestimated = features.filter(isUnestimated).length;
  const totalPoints = features.reduce((sum, f) => sum + getPoints(f), 0);
  const completed = features.filter((f) => f.workflow_status?.complete).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <div className="text-text-secondary mt-1">
          {findingSprint ? (
            <Skeleton className="h-5 w-48" />
          ) : sprint ? (
            `Current sprint: ${sprint.name}`
          ) : (
            "No sprint in progress"
          )}
        </div>
      </div>

      {(findingSprint || sprint) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Unestimated"
            value={unestimated}
            caption="features need points"
            href="/estimate"
            loading={findingSprint || featuresLoading}
          />
          <StatCard
            title="Sprint Points"
            value={formatPoints(totalPoints)}
            caption={`across ${features.length} features`}
            href={sprint?.href}
            loading={findingSprint || featuresLoading}
          />
          <StatCard
            title="Completed"
            value={`${completed}/${features.length}`}
            caption="features done"
            href={sprint?.href}
            loading={findingSprint || featuresLoading}
          />
          <StatCard
            title="Days Left"
            value={businessDaysRemaining(sprint?.endDate)}
            caption="business days in sprint"
            href={sprint?.href}
            loading={findingSprint}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  caption,
  href,
  loading,
}: {
  title: string;
  value: React.ReactNode;
  caption: string;
  href?: string;
  loading: boolean;
}) {
  const card = (
    <Card className={href ? "group h-full transition-colors hover:border-primary" : "h-full"}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-text-secondary">
          {title}
          {href && (
            <ArrowRight className="h-4 w-4 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-text-muted mt-1">{caption}</p>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}
