import { useState } from "react";
import DOMPurify from "dompurify";
import type { AhaFeature } from "@/lib/aha-types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FeatureBadge } from "@/components/shared/feature-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-settings";
import { Link2, Check } from "lucide-react";

// Sanitize Aha HTML via DOMPurify. Server-side (SSR) there is no DOM and no JS
// execution risk, so we pass the raw string; DOMPurify runs on the client.
function safeHtml(html: string): string {
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html);
}

interface EstimationCardProps {
  feature: AhaFeature;
}

export function EstimationCard({ feature }: EstimationCardProps) {
  const [copied, setCopied] = useState(false);
  const { data: settings } = useSettings();

  function handleCopyLink() {
    const domain = settings?.["ahaDomain"];
    const url = domain
      ? `https://${domain}.aha.io/features/${feature.reference_num}`
      : feature.reference_num;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

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
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyLink}
            title="Copy Aha! link"
            className="shrink-0 text-text-muted hover:text-text-primary"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {feature.description?.body && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-text-secondary">
              Description
            </h4>
            <div
              className="text-sm text-text-primary leading-relaxed aha-html-content"
              dangerouslySetInnerHTML={{ __html: safeHtml(feature.description.body) }}
            />
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
                    <div
                      className="mt-1 text-xs text-text-secondary aha-html-content"
                      dangerouslySetInnerHTML={{ __html: safeHtml(req.body) }}
                    />
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

          {feature.epic && (
            <div>
              <span className="text-xs font-medium text-text-muted">Epic</span>
              <p className="mt-1 text-sm text-text-primary">
                <span className="font-mono text-text-muted mr-1">{feature.epic.reference_num}</span>
                {feature.epic.name}
              </p>
            </div>
          )}

          {feature.original_estimate != null && (
            <div>
              <span className="text-xs font-medium text-text-muted">Initial Estimate</span>
              <p className="mt-1 text-sm text-text-primary">
                {feature.original_estimate} {feature.original_estimate === 1 ? "pt" : "pts"}
              </p>
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
