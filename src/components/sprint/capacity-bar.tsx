import { cn } from "@/lib/utils";

interface CapacityBarProps {
  capacity: number;
  allocated: number;
  label: string;
}

export function CapacityBar({ capacity, allocated, label }: CapacityBarProps) {
  const percentage = capacity > 0 ? Math.round((allocated / capacity) * 100) : 0;
  const widthPercent = Math.min(percentage, 100);

  const barColor =
    percentage > 100
      ? "bg-danger"
      : percentage >= 80
        ? "bg-warning"
        : "bg-success";

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-muted">
          {allocated} / {capacity} pts ({percentage}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
    </div>
  );
}
