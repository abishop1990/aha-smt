"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const removeOption = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((item) => item !== option));
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full flex-wrap gap-1 rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors",
          "focus:outline-none focus:ring-1 focus:ring-primary",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {selected.length === 0 ? (
          <span className="text-text-muted">{placeholder}</span>
        ) : (
          selected.map((item) => (
            <Badge
              key={item}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {item}
              <X
                className="h-3 w-3 cursor-pointer hover:text-text-primary"
                onClick={(e) => removeOption(item, e)}
              />
            </Badge>
          ))
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-border bg-surface py-1 shadow-lg">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-text-muted">No options available</p>
          ) : (
            options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => toggleOption(option)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-background",
                  selected.includes(option)
                    ? "text-primary bg-background"
                    : "text-text-secondary"
                )}
              >
                <div
                  className={cn(
                    "h-4 w-4 rounded-sm border border-border flex items-center justify-center",
                    selected.includes(option) && "bg-primary border-primary"
                  )}
                >
                  {selected.includes(option) && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
                {option}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
