"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { useReleases } from "@/hooks/use-releases";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ReleaseSelector() {
  const [selectedId, setSelectedId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data, isLoading } = useReleases();
  const releases = data?.releases ?? [];

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleSelect(releaseId: string) {
    setSelectedId(releaseId);
    setOpen(false);
    router.push(`/sprint/${releaseId}`);
  }

  return (
    <div className="relative" ref={containerRef}>
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
        {isLoading ? (
          <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin text-text-muted" />
        ) : (
          <ChevronDown
            className={cn(
              "ml-2 h-4 w-4 shrink-0 text-text-muted transition-transform",
              open && "rotate-180"
            )}
          />
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-border bg-surface py-1 shadow-lg">
          {isLoading ? (
            <p className="px-3 py-2 text-sm text-text-muted">Loading...</p>
          ) : releases.length === 0 ? (
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
                onClick={() => handleSelect(release.id)}
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
