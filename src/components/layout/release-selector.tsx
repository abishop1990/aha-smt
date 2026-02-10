"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Release {
  id: string;
  name: string;
}

export function ReleaseSelector() {
  const [selectedId, setSelectedId] = useState<string>("");
  const [open, setOpen] = useState(false);

  // Placeholder releases -- will be replaced with real API data later
  const releases: Release[] = [];

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="w-48 justify-between"
        onClick={() => setOpen(!open)}
      >
        <span className={cn("truncate", !selectedId && "text-text-muted")}>
          {selectedId
            ? releases.find((r) => r.id === selectedId)?.name ?? "Select Release"
            : "Select Release"}
        </span>
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 text-text-muted transition-transform",
            open && "rotate-180"
          )}
        />
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-border bg-surface py-1 shadow-lg">
          {releases.length === 0 ? (
            <p className="px-3 py-2 text-sm text-text-muted">
              No releases available
            </p>
          ) : (
            releases.map((release) => (
              <button
                key={release.id}
                className={cn(
                  "flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-background",
                  release.id === selectedId
                    ? "text-primary"
                    : "text-text-secondary"
                )}
                onClick={() => {
                  setSelectedId(release.id);
                  setOpen(false);
                }}
              >
                {release.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
