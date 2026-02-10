"use client";

import type { StandupEntry } from "@/hooks/use-standups";
import { UserAvatar } from "@/components/shared/user-avatar";
import { CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StandupMemberListProps {
  entries: StandupEntry[];
  teamMembers: { id: string; name: string }[];
  date: string;
  onMemberClick?: (memberId: string) => void;
}

export function StandupMemberList({
  entries,
  teamMembers,
  date,
  onMemberClick,
}: StandupMemberListProps) {
  const submittedUserIds = new Set(
    entries
      .filter((entry) => entry.standupDate === date)
      .map((entry) => entry.userId)
  );

  return (
    <div className="flex flex-col gap-1">
      {teamMembers.map((member) => {
        const hasSubmitted = submittedUserIds.has(member.id);

        return (
          <button
            key={member.id}
            type="button"
            onClick={() => onMemberClick?.(member.id)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
              "hover:bg-surface"
            )}
          >
            <UserAvatar name={member.name} size="sm" />
            <span className="flex-1 text-sm text-text-primary">
              {member.name}
            </span>
            {hasSubmitted ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <Circle className="h-4 w-4 text-text-muted" />
            )}
          </button>
        );
      })}
    </div>
  );
}
