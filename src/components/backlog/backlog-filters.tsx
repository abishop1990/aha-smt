"use client";

import { useReleases } from "@/hooks/use-releases";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BacklogFiltersProps {
  releaseId: string | null;
  onReleaseChange: (id: string) => void;
  assigneeFilter: string;
  onAssigneeChange: (v: string) => void;
  tagFilter: string;
  onTagChange: (v: string) => void;
}

export function BacklogFilters({
  releaseId,
  onReleaseChange,
  assigneeFilter,
  onAssigneeChange,
  tagFilter,
  onTagChange,
}: BacklogFiltersProps) {
  const { data, isLoading } = useReleases();
  const releases = data?.releases ?? [];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={releaseId ?? ""}
        onValueChange={onReleaseChange}
      >
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder={isLoading ? "Loading releases..." : "Select release"} />
        </SelectTrigger>
        <SelectContent>
          {releases.map((release) => (
            <SelectItem key={release.id} value={release.id}>
              {release.reference_num} - {release.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Filter by assignee..."
        value={assigneeFilter}
        onChange={(e) => onAssigneeChange(e.target.value)}
        className="w-[200px]"
      />

      <Input
        placeholder="Filter by tag..."
        value={tagFilter}
        onChange={(e) => onTagChange(e.target.value)}
        className="w-[200px]"
      />

      {(assigneeFilter || tagFilter) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onAssigneeChange("");
            onTagChange("");
          }}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
