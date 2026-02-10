import type { AhaFeature } from "@/lib/aha-types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FeatureBadge } from "@/components/shared/feature-badge";
import { Badge } from "@/components/ui/badge";

interface EstimationCardProps {
  feature: AhaFeature;
}

export function EstimationCard({ feature }: EstimationCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <FeatureBadge
              referenceNum={feature.reference_num}
              statusColor={feature.workflow_status?.color}
              statusName={feature.workflow_status?.name}
            />
            <CardTitle className="text-xl">{feature.name}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {feature.description?.body && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-text-secondary">
              Description
            </h4>
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
              {feature.description.body}
            </p>
          </div>
        )}

        {feature.requirements && feature.requirements.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-text-secondary">
              Requirements
            </h4>
            <ul className="space-y-2">
              {feature.requirements.map((req) => (
                <li
                  key={req.id}
                  className="rounded-md border border-border bg-background p-3"
                >
                  <p className="text-sm font-medium text-text-primary">
                    {req.name}
                  </p>
                  {req.body && (
                    <p className="mt-1 text-xs text-text-secondary">
                      {req.body}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          {feature.workflow_status && (
            <div>
              <span className="text-xs font-medium text-text-muted">
                Status
              </span>
              <div className="mt-1">
                <Badge variant="outline">
                  {feature.workflow_status.name}
                </Badge>
              </div>
            </div>
          )}

          {feature.assigned_to_user && (
            <div>
              <span className="text-xs font-medium text-text-muted">
                Assignee
              </span>
              <p className="mt-1 text-sm text-text-primary">
                {feature.assigned_to_user.name}
              </p>
            </div>
          )}

          {feature.tags && feature.tags.length > 0 && (
            <div>
              <span className="text-xs font-medium text-text-muted">Tags</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {feature.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
