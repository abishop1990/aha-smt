import { cn } from "@/lib/utils";

interface FeatureBadgeProps {
  referenceNum: string;
  statusName?: string;
  statusColor?: string;
  className?: string;
}

export function FeatureBadge({ referenceNum, statusName, statusColor, className }: FeatureBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        "bg-surface border border-border text-text-primary",
        className
      )}
    >
      {statusColor && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
      )}
      <span className="font-mono">{referenceNum}</span>
      {statusName && <span className="text-text-secondary">({statusName})</span>}
    </span>
  );
}
