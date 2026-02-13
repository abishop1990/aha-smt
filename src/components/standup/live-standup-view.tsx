"use client";

import { useState, useMemo } from "react";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { useStandups } from "@/hooks/use-standups";
import { useStandupMembers } from "@/hooks/use-standup-members";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function LiveStandupView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMemberIndex, setSelectedMemberIndex] = useState(0);

  const dateStr = format(currentDate, "yyyy-MM-dd");
  const displayDate = format(currentDate, "EEEE, MMMM d, yyyy");

  const { data: standupData, isLoading } = useStandups(dateStr);
  const { data: teamMembers } = useStandupMembers();

  // Build map of userId -> entry
  const entriesMap = useMemo(() => {
    const entries = standupData?.entries ?? [];
    const map = new Map();
    for (const entry of entries) {
      map.set(entry.userId, entry);
    }
    return map;
  }, [standupData?.entries]);

  // Build list of members with their entries (or null if no entry)
  const membersWithEntries = useMemo(() => {
    const members = teamMembers ?? [];
    return members.map((member) => ({
      member,
      entry: entriesMap.get(member.id) || null,
    }));
  }, [teamMembers, entriesMap]);

  const currentMember = membersWithEntries[selectedMemberIndex];
  const entries = standupData?.entries ?? [];
  const submittedCount = entries.length;
  const totalCount = teamMembers?.length ?? 0;

  function goToPreviousDay() {
    setCurrentDate((d) => subDays(d, 1));
    setSelectedMemberIndex(0);
  }

  function goToNextDay() {
    setCurrentDate((d) => addDays(d, 1));
    setSelectedMemberIndex(0);
  }

  function goToToday() {
    setCurrentDate(new Date());
    setSelectedMemberIndex(0);
  }

  function goToPreviousMember() {
    setSelectedMemberIndex((i) => Math.max(0, i - 1));
  }

  function goToNextMember() {
    setSelectedMemberIndex((i) => Math.min(membersWithEntries.length - 1, i + 1));
  }

  if (isLoading) {
    return <p className="text-center text-sm text-text-muted">Loading...</p>;
  }

  if (membersWithEntries.length === 0) {
    return (
      <p className="text-center text-sm text-text-muted">
        No team members found. Configure team members to use live standup.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <button
            type="button"
            onClick={goToToday}
            className="text-base font-semibold text-text-primary hover:text-primary transition-colors"
          >
            {displayDate}
          </button>

          <Button variant="ghost" size="icon" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-secondary">
            {submittedCount} / {totalCount} submitted
          </span>
          <div className="h-2 w-24 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all"
              style={{ width: `${totalCount > 0 ? (submittedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Team Member Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {membersWithEntries.map((item, index) => {
          const hasEntry = item.entry !== null;
          return (
            <button
              key={item.member.id}
              onClick={() => setSelectedMemberIndex(index)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md border transition-colors shrink-0",
                index === selectedMemberIndex
                  ? "border-primary bg-primary-muted"
                  : "border-border hover:border-primary"
              )}
            >
              <UserAvatar name={item.member.name} size="sm" />
              <span className="text-sm font-medium text-text-primary">
                {item.member.name.split(" ")[0]}
              </span>
              {hasEntry ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-text-muted" />
              )}
            </button>
          );
        })}
      </div>

      {/* Current Member Entry */}
      {currentMember && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goToPreviousMember}
            disabled={selectedMemberIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <span className="text-sm text-text-muted">
            {selectedMemberIndex + 1} of {membersWithEntries.length}
          </span>

          <Button
            variant="outline"
            onClick={goToNextMember}
            disabled={selectedMemberIndex === membersWithEntries.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Entry Display */}
      {currentMember && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <UserAvatar name={currentMember.member.name} size="lg" />
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  {currentMember.member.name}
                </h2>
                {currentMember.entry ? (
                  <span className="text-sm text-text-muted">
                    Submitted at{" "}
                    {new Date(currentMember.entry.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                ) : (
                  <span className="text-sm text-text-muted">No entry submitted</span>
                )}
              </div>
            </div>

            {currentMember.entry ? (
              <div className="space-y-6">
                <EntrySection
                  label="✅ Done Since Last Standup"
                  content={currentMember.entry.doneSinceLastStandup}
                />
                <EntrySection
                  label="🚀 Working On Now"
                  content={currentMember.entry.workingOnNow}
                />
                <EntrySection
                  label="🚧 Blockers"
                  content={currentMember.entry.blockers}
                  highlight={!!currentMember.entry.blockers}
                />
                <EntrySection
                  label="📋 Action Items"
                  content={currentMember.entry.actionItems}
                />

                {currentMember.entry.featureRefs && (() => {
                  try {
                    const refs = JSON.parse(currentMember.entry.featureRefs);
                    if (refs.length > 0) {
                      return (
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-semibold text-text-secondary">
                            📎 Features
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {refs.map((ref: string) => (
                              <Badge key={ref} variant="outline">
                                {ref}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  } catch {
                    return null;
                  }
                  return null;
                })()}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <XCircle className="h-16 w-16 text-text-muted mb-3" />
                <p className="text-lg font-medium text-text-primary">No Entry Submitted</p>
                <p className="text-sm text-text-muted">
                  {currentMember.member.name} hasn&apos;t submitted a standup for this date
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EntrySection({
  label,
  content,
  highlight = false,
}: {
  label: string;
  content: string;
  highlight?: boolean;
}) {
  if (!content || content.trim() === "") {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-2", highlight && "p-3 rounded-md bg-surface border-2 border-warning")}>
      <span className="text-sm font-semibold text-text-secondary">{label}</span>
      <p className="whitespace-pre-wrap text-base text-text-primary leading-relaxed">
        {content}
      </p>
    </div>
  );
}
