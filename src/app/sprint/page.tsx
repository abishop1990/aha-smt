"use client";

import { useState } from "react";
import { useReleases } from "@/hooks/use-releases";
import { useIterations } from "@/hooks/use-iterations";
import { usePrefetch } from "@/hooks/use-prefetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AhaIteration } from "@/lib/aha-types";

export default function SprintListPage() {
  const [view, setView] = useState<"iterations" | "releases">("iterations");
  const { data: releasesData, isLoading: releasesLoading } = useReleases();
  const { data: iterationsData, isLoading: iterationsLoading } = useIterations();
  const { prefetchFeatures, prefetchIterationFeatures } = usePrefetch();
  const releases = releasesData?.releases ?? [];
  const iterations = iterationsData?.iterations ?? [];

  const isLoading = view === "iterations" ? iterationsLoading : releasesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const getIterationStatusBadge = (status: AhaIteration["status"]) => {
    switch (status) {
      case "started":
        return <Badge className="bg-success text-white">Started</Badge>;
      case "planning":
        return <Badge className="bg-warning text-white">Planning</Badge>;
      case "complete":
        return <Badge className="bg-primary text-white">Complete</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Sprint Planning</h1>
          <p className="text-text-secondary mt-1">
            Select a sprint to view capacity and allocation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              view === "iterations"
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            )}
            onClick={() => setView("iterations")}
          >
            Iterations
          </button>
          <button
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              view === "releases"
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            )}
            onClick={() => setView("releases")}
          >
            Releases
          </button>
        </div>
      </div>

      {view === "iterations" ? (
        iterations.length === 0 ? (
          <EmptyState
            icon={<Zap className="h-12 w-12" />}
            title="No iterations found"
            description="Set AHA_TEAM_PRODUCT_ID to enable iteration support."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {iterations.map((iteration) => (
              <Link
                key={iteration.id}
                href={`/sprint/iteration/${iteration.reference_num}`}
                onMouseEnter={() => prefetchIterationFeatures(iteration.reference_num)}
              >
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{iteration.name}</span>
                      <ArrowRight className="h-4 w-4 text-text-muted" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                      <span className="font-mono text-xs">{iteration.reference_num}</span>
                      {getIterationStatusBadge(iteration.status)}
                    </div>
                    {iteration.start_date && iteration.end_date && (
                      <div className="mt-2 text-sm text-text-secondary">
                        {format(parseISO(iteration.start_date), "MMM d")} —{" "}
                        {format(parseISO(iteration.end_date), "MMM d, yyyy")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )
      ) : (
        releases.length === 0 ? (
          <EmptyState
            icon={<Zap className="h-12 w-12" />}
            title="No releases found"
            description="Configure your Aha product in Settings to load releases."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {releases.map((release) => (
              <Link
                key={release.id}
                href={`/sprint/${release.id}`}
                onMouseEnter={() => prefetchFeatures(release.id)}
              >
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{release.name}</span>
                      <ArrowRight className="h-4 w-4 text-text-muted" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                      <span className="font-mono text-xs">{release.reference_num}</span>
                      {release.start_date && (
                        <span>
                          {format(parseISO(release.start_date), "MMM d")}
                          {release.release_date &&
                            ` — ${format(parseISO(release.release_date), "MMM d, yyyy")}`}
                        </span>
                      )}
                    </div>
                    {typeof release.progress === "number" && (
                      <div className="mt-3">
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min(release.progress, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-text-muted mt-1">
                          {release.progress}% complete
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
