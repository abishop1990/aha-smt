"use client";

import { useState } from "react";
import { useDaysOff, useCreateDayOff, useDeleteDayOff } from "@/hooks/use-schedules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface DaysOffIndicatorProps {
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
}

export function DaysOffIndicator({
  userId,
  userName,
  startDate,
  endDate,
}: DaysOffIndicatorProps) {
  const { data, isLoading } = useDaysOff({ userId, startDate, endDate });
  const createDayOff = useCreateDayOff();
  const deleteDayOff = useDeleteDayOff();

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  const daysOff = data?.daysOff ?? [];
  const count = daysOff.length;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    createDayOff.mutate(
      { userId, userName, date, reason: reason || undefined },
      {
        onSuccess: () => {
          setDate("");
          setReason("");
        },
      }
    );
  }

  function handleDelete(id: number) {
    deleteDayOff.mutate(id);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
            "border border-border bg-surface text-text-secondary hover:bg-border",
            count > 0 && "text-warning"
          )}
        >
          {isLoading ? "..." : `${count} day${count !== 1 ? "s" : ""} off`}
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Days Off &mdash; {userName}</DialogTitle>
          <DialogDescription>
            Manage days off for {userName} between {startDate} and {endDate}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing days off */}
          {daysOff.length > 0 && (
            <ul className="space-y-2">
              {daysOff.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium text-text-primary">
                      {new Date(d.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {d.reason && (
                      <span className="ml-2 text-text-muted">{d.reason}</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(d.id)}
                    disabled={deleteDayOff.isPending}
                    className="text-danger hover:text-danger"
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {daysOff.length === 0 && !isLoading && (
            <p className="text-sm text-text-muted">No days off scheduled.</p>
          )}

          {/* Add day off form */}
          <form onSubmit={handleAdd} className="space-y-3">
            <h4 className="text-sm font-medium text-text-primary">
              Add Day Off
            </h4>
            <div className="flex gap-2">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={startDate}
                max={endDate}
                required
                className="flex-1"
              />
              <Input
                type="text"
                placeholder="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="flex-1"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={!date || createDayOff.isPending}
            >
              {createDayOff.isPending ? "Adding..." : "Add Day Off"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
