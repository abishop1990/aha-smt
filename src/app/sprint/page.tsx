"use client";

import { useReleases } from "@/hooks/use-releases";
import { usePrefetch } from "@/hooks/use-prefetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Zap, ArrowRight } from "lucide-react";

export default function SprintListPage() {
  const { data, isLoading } = useReleases();
  const { prefetchFeatures } = usePrefetch();
  const releases = data?.releases ?? [];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Sprint Planning</h1>
        <p className="text-text-secondary mt-1">
          Select a sprint to view capacity and allocation
        </p>
      </div>

      {releases.length === 0 ? (
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
      )}
    </div>
  );
}
