"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReleases } from "@/hooks/use-releases";
import { useFeatures } from "@/hooks/use-features";
import { useSprintSnapshots } from "@/hooks/use-sprint-snapshots";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { getPoints, formatPoints, isUnestimated } from "@/lib/points";
import {
  ListTodo,
  Calculator,
  Zap,
  Users,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
  const { data: releasesData, isLoading: releasesLoading } = useReleases();
  const activeRelease =
    releasesData?.releases?.find(
      (r) => !r.parking_lot && r.status === "in_progress"
    ) ?? null;

  const { data: featuresData, isLoading: featuresLoading } = useFeatures(
    activeRelease?.id ?? null
  );
  const { data: snapshotsData } = useSprintSnapshots();

  const features = featuresData?.features ?? [];
  const unestimated = features.filter(isUnestimated);
  const totalPoints = features.reduce((sum, f) => sum + getPoints(f), 0);
  const completedFeatures = features.filter((f) => f.workflow_status?.complete);
  const snapshots = snapshotsData?.snapshots ?? [];
  const avgVelocity =
    snapshots.length > 0
      ? Math.round(
          snapshots.reduce((s, snap) => s + snap.totalPointsCompleted, 0) /
            snapshots.length
        )
      : 0;

  const isLoading = releasesLoading || (!!activeRelease && featuresLoading);
  const releasesLoaded = !releasesLoading && releasesData !== undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-1">
          {releasesLoading
            ? "Loading..."
            : activeRelease
              ? `Current sprint: ${activeRelease.name}`
              : "No sprint in progress"}
        </p>
      </div>

      {/* KPI Cards — only shown when a sprint is active */}
      {(isLoading || activeRelease) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">
                Unestimated
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{unestimated.length}</div>
              )}
              <p className="text-xs text-text-muted mt-1">features need points</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">
                Sprint Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{formatPoints(totalPoints)}</div>
              )}
              <p className="text-xs text-text-muted mt-1">
                across {features.length} features
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">
                  {completedFeatures.length}/{features.length}
                </div>
              )}
              <p className="text-xs text-text-muted mt-1">features done</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">
                Avg Velocity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgVelocity}</div>
              <p className="text-xs text-text-muted mt-1">
                pts/sprint ({snapshots.length} sprints)
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/backlog">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-primary-muted p-3">
                <ListTodo className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Backlog</h3>
                <p className="text-sm text-text-secondary">
                  {releasesLoaded && !activeRelease
                    ? "Browse features"
                    : `${unestimated.length} unestimated features`}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-text-muted" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/estimate">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-primary-muted p-3">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Estimate</h3>
                <p className="text-sm text-text-secondary">
                  Score features with criteria model
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-text-muted" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/sprint">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-primary-muted p-3">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Sprint Planning</h3>
                <p className="text-sm text-text-secondary">
                  Capacity & allocation
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-text-muted" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/standup">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-primary-muted p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Standup</h3>
                <p className="text-sm text-text-secondary">
                  Daily updates & blockers
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-text-muted" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/metrics">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-primary-muted p-3">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Metrics</h3>
                <p className="text-sm text-text-secondary">
                  Sprint performance & velocity
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-text-muted" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
