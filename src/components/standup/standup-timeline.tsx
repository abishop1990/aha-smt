"use client";

import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStandups } from "@/hooks/use-standups";
import { StandupEntryCard } from "@/components/standup/standup-entry-card";
import { StandupEntryPanel } from "@/components/standup/standup-entry-panel";
import { Button } from "@/components/ui/button";

interface StandupTimelineProps {
  initialDate?: string;
}

export function StandupTimeline({ initialDate }: StandupTimelineProps = {}) {
  const [currentDate, setCurrentDate] = useState(
    initialDate ? new Date(initialDate + "T00:00:00") : new Date()
  );

  const dateStr = format(currentDate, "yyyy-MM-dd");
  const displayDate = format(currentDate, "EEE, MMM d, yyyy");

  const { data, isLoading } = useStandups(dateStr);
  const entries = data?.entries ?? [];

  function goToPreviousDay() {
    setCurrentDate((d) => subDays(d, 1));
  }

  function goToNextDay() {
    setCurrentDate((d) => addDays(d, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <button
          type="button"
          onClick={goToToday}
          className="text-sm font-medium text-text-primary hover:text-primary transition-colors"
        >
          {displayDate}
        </button>

        <Button variant="ghost" size="icon" onClick={goToNextDay}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <StandupEntryPanel date={dateStr} />

      {isLoading && (
        <p className="text-center text-sm text-text-muted">Loading standups...</p>
      )}

      {!isLoading && entries.length === 0 && (
        <p className="text-center text-sm text-text-muted">
          No standup entries for this date.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {entries.map((entry) => (
          <StandupEntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
