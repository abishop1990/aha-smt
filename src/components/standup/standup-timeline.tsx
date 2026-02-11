"use client";

import { useState, useCallback } from "react";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useStandups, useUpdateStandup } from "@/hooks/use-standups";
import type { StandupEntry } from "@/hooks/use-standups";
import { StandupEntryCard } from "@/components/standup/standup-entry-card";
import { StandupEntryPanel } from "@/components/standup/standup-entry-panel";
import { StandupForm, type StandupFormData } from "@/components/standup/standup-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface StandupTimelineProps {
  initialDate?: string;
}

export function StandupTimeline({ initialDate }: StandupTimelineProps = {}) {
  const [currentDate, setCurrentDate] = useState(
    initialDate ? new Date(initialDate + "T00:00:00") : new Date()
  );
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);

  const dateStr = format(currentDate, "yyyy-MM-dd");
  const displayDate = format(currentDate, "EEE, MMM d, yyyy");

  const { data, isLoading } = useStandups(dateStr);
  const updateStandup = useUpdateStandup();
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

  const handleEdit = useCallback((entry: StandupEntry) => {
    setEditingEntryId(entry.id);
  }, []);

  const handleEditSubmit = useCallback(
    (entryId: number, data: StandupFormData) => {
      updateStandup.mutate(
        {
          id: entryId,
          doneSinceLastStandup: data.doneSinceLastStandup,
          workingOnNow: data.workingOnNow,
          blockers: data.blockers,
          actionItems: data.actionItems,
          featureRefs: data.featureRefs,
        },
        {
          onSuccess: () => {
            setEditingEntryId(null);
            toast.success("Standup updated");
          },
          onError: () => {
            toast.error("Failed to update standup");
          },
        }
      );
    },
    [updateStandup]
  );

  const handleEditCancel = useCallback(() => {
    setEditingEntryId(null);
  }, []);

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
        {entries.map((entry) =>
          editingEntryId === entry.id ? (
            <Card key={entry.id}>
              <CardContent className="pt-6">
                <StandupForm
                  userId={entry.userId}
                  userName={entry.userName}
                  standupDate={entry.standupDate}
                  initialData={entry}
                  onSubmit={(data) => handleEditSubmit(entry.id, data)}
                  onCancel={handleEditCancel}
                />
              </CardContent>
            </Card>
          ) : (
            <StandupEntryCard
              key={entry.id}
              entry={entry}
              onEdit={handleEdit}
            />
          )
        )}
      </div>
    </div>
  );
}
