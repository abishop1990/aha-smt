import type { StandupEntry } from "@/hooks/use-standups";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

interface StandupEntryCardProps {
  entry: StandupEntry;
  className?: string;
}

function Section({ label, content }: { label: string; content: string }) {
  if (!content) return null;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <p className="whitespace-pre-wrap text-sm text-text-primary">{content}</p>
    </div>
  );
}

export function StandupEntryCard({ entry, className }: StandupEntryCardProps) {
  let featureRefs: string[] = [];
  try {
    featureRefs = JSON.parse(entry.featureRefs);
  } catch {
    // featureRefs may be a plain string or invalid JSON
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex-row items-center gap-3 space-y-0 pb-3">
        <UserAvatar name={entry.userName} size="md" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-text-primary">
            {entry.userName}
          </span>
          <span className="text-xs text-text-muted">
            {entry.standupDate}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <Section label="Done" content={entry.doneSinceLastStandup} />
        <Section label="Working On" content={entry.workingOnNow} />
        <Section label="Blockers" content={entry.blockers} />
        <Section label="Action Items" content={entry.actionItems} />

        {featureRefs.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Features
            </span>
            <div className="flex flex-wrap gap-1.5">
              {featureRefs.map((ref) => (
                <Badge key={ref} variant="outline">
                  {ref}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-2">
          <span className="text-xs text-text-muted">
            {new Date(entry.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
