"use client";

import { useState, useEffect, useCallback } from "react";
import { differenceInDays } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Blocker {
  id: number;
  standupEntryId: number | null;
  userId: string;
  userName?: string;
  description: string;
  featureRef: string | null;
  status: string;
  resolvedAt: string | null;
  createdAt: string;
}

function getAgeDays(createdAt: string): number {
  return differenceInDays(new Date(), new Date(createdAt));
}

function getAgeVariant(days: number): "secondary" | "warning" | "danger" {
  if (days > 5) return "danger";
  if (days > 2) return "warning";
  return "secondary";
}

export function BlockerTracker() {
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBlockers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/blockers?status=open");
      if (!res.ok) throw new Error("Failed to fetch blockers");
      const data = await res.json();
      setBlockers(data.blockers);
    } catch {
      // silently handle errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlockers();
  }, [fetchBlockers]);

  async function resolveBlocker(id: number) {
    try {
      const res = await fetch(`/api/blockers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      if (!res.ok) throw new Error("Failed to resolve blocker");
      setBlockers((prev) => prev.filter((b) => b.id !== id));
    } catch {
      // silently handle errors
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Open Blockers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted">Loading blockers...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Open Blockers</span>
          {blockers.length > 0 && (
            <Badge variant="danger">{blockers.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {blockers.length === 0 ? (
          <p className="text-sm text-text-muted">No open blockers.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {blockers.map((blocker) => {
              const ageDays = getAgeDays(blocker.createdAt);
              const ageVariant = getAgeVariant(ageDays);

              return (
                <div
                  key={blocker.id}
                  className="flex items-start gap-3 rounded-md border border-border bg-background p-3"
                >
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        {blocker.userName ?? blocker.userId}
                      </span>
                      <Badge variant={ageVariant}>
                        {ageDays === 0 ? "today" : `${ageDays}d`}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-secondary">
                      {blocker.description}
                    </p>
                    {blocker.featureRef && (
                      <Badge variant="outline" className="self-start">
                        {blocker.featureRef}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resolveBlocker(blocker.id)}
                    className={cn("shrink-0 text-success hover:text-success")}
                  >
                    Resolve
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
