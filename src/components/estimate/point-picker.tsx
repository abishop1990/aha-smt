"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PointPickerProps {
  suggestedPoints: number;
  selectedPoints: number | null;
  onSelect: (points: number) => void;
  onSkip: () => void;
  pointScale: number[];
}

export function PointPicker({
  suggestedPoints,
  selectedPoints,
  onSelect,
  onSkip,
  pointScale,
}: PointPickerProps) {

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSkip();
        return;
      }

      const keyIndex = parseInt(e.key, 10);
      if (keyIndex >= 1 && keyIndex <= pointScale.length) {
        e.preventDefault();
        onSelect(pointScale[keyIndex - 1]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSelect, onSkip, pointScale]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {pointScale.map((points, index) => {
          const isSuggested = points === suggestedPoints;
          const isSelected = points === selectedPoints;

          return (
            <button
              key={points}
              type="button"
              onClick={() => onSelect(points)}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg text-sm font-semibold transition-all",
                isSelected
                  ? "bg-primary text-white"
                  : "bg-surface text-text-secondary hover:text-text-primary border border-border",
                isSuggested && !isSelected && "ring-2 ring-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]"
              )}
              title={`${points} points (key: ${index + 1})`}
            >
              {points}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Skip (S)
        </Button>
        {suggestedPoints > 0 && (
          <span className="text-xs text-text-muted">
            Suggested: {suggestedPoints} pts
          </span>
        )}
      </div>
    </div>
  );
}
