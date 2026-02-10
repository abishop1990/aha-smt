"use client";

import { useState, useEffect, useCallback } from "react";
import { differenceInDays } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ActionItem {
  id: number;
  standupEntryId: number | null;
  userId: string;
  userName?: string;
  assigneeUserId: string | null;
  assigneeName?: string;
  description: string;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

interface ActionItemListProps {
  filterAssignee?: string;
}

export function ActionItemList({ filterAssignee }: ActionItemListProps) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigneeFilter, setAssigneeFilter] = useState(filterAssignee ?? "");

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("completed", "false");
      const res = await fetch(`/api/action-items?${params}`);
      if (!res.ok) throw new Error("Failed to fetch action items");
      const data = await res.json();
      setItems(data.actionItems);
    } catch {
      // silently handle errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function toggleCompleted(id: number, currentValue: boolean) {
    try {
      const res = await fetch(`/api/action-items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !currentValue }),
      });
      if (!res.ok) throw new Error("Failed to update action item");
      const updated = await res.json();

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, completed: updated.completed, completedAt: updated.completedAt }
            : item
        )
      );
    } catch {
      // silently handle errors
    }
  }

  const filteredItems = assigneeFilter
    ? items.filter(
        (item) =>
          item.assigneeUserId === assigneeFilter ||
          item.assigneeName?.toLowerCase().includes(assigneeFilter.toLowerCase())
      )
    : items;

  const uniqueAssignees = Array.from(
    new Set(items.map((item) => item.assigneeName ?? item.assigneeUserId).filter(Boolean))
  ) as string[];

  if (isLoading) {
    return <p className="text-sm text-text-muted">Loading action items...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {uniqueAssignees.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-text-secondary">
            Filter by assignee:
          </label>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All</option>
            {uniqueAssignees.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <p className="text-sm text-text-muted">No action items found.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredItems.map((item) => {
            const ageDays = differenceInDays(new Date(), new Date(item.createdAt));

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-3 rounded-md border border-border bg-background p-3",
                  item.completed && "opacity-60"
                )}
              >
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => toggleCompleted(item.id, item.completed)}
                  className="mt-0.5"
                />
                <div className="flex flex-1 flex-col gap-1">
                  <p
                    className={cn(
                      "text-sm text-text-primary",
                      item.completed && "line-through"
                    )}
                  >
                    {item.description}
                  </p>
                  <div className="flex items-center gap-2">
                    {(item.assigneeName || item.assigneeUserId) && (
                      <span className="text-xs text-text-muted">
                        {item.assigneeName ?? item.assigneeUserId}
                      </span>
                    )}
                    <span className="text-xs text-text-muted">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    {!item.completed && ageDays > 0 && (
                      <Badge
                        variant={ageDays > 5 ? "warning" : "secondary"}
                        className="text-[10px]"
                      >
                        {ageDays}d old
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
