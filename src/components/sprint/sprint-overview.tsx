import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { AhaRelease, AhaFeature } from "@/lib/aha-types";

interface SprintOverviewProps {
  release: AhaRelease;
  features: AhaFeature[];
  daysRemaining: number;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SprintOverview({ release, features, daysRemaining }: SprintOverviewProps) {
  const totalPoints = features.reduce((sum, f) => sum + (f.score ?? 0), 0);
  const completedCount = features.filter(
    (f) => f.workflow_status?.complete === true
  ).length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-secondary">
            Sprint Dates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold text-text-primary">
            {formatDate(release.start_date)} &ndash; {formatDate(release.release_date)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-secondary">
            Total Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-text-primary">{totalPoints}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-secondary">
            Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-text-primary">
            {features.length}
            <span className="ml-1 text-sm font-normal text-text-muted">
              / {completedCount} completed
            </span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-secondary">
            Days Remaining
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-text-primary">{daysRemaining}</p>
        </CardContent>
      </Card>
    </div>
  );
}
