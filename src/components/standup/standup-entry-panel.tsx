"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { parseBlockers, parseActionItems } from "@/lib/standup-parsers";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTeamMembers } from "@/hooks/use-team-members";
import { useStandups, useCreateStandup } from "@/hooks/use-standups";
import { StandupForm, type StandupFormData } from "@/components/standup/standup-form";
import { StandupMemberList } from "@/components/standup/standup-member-list";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface StandupEntryPanelProps {
  date: string;
}

export function StandupEntryPanel({ date }: StandupEntryPanelProps) {
  const { data: currentUser } = useCurrentUser();
  const { data: teamMembers, isLoading: membersLoading } = useTeamMembers();
  const { data: standupData } = useStandups(date);
  const createStandup = useCreateStandup();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  // Key to remount StandupForm after successful submit
  const [formKey, setFormKey] = useState(0);

  // Resolve the active user — selected or default to current user
  const activeUserId = selectedUserId ?? currentUser?.id ?? "";
  const activeUserName =
    teamMembers?.find((m) => m.id === activeUserId)?.name ??
    currentUser?.name ??
    "";

  const entries = standupData?.entries ?? [];
  const hasTeamMembers = teamMembers && teamMembers.length > 0;

  const handleMemberClick = useCallback((memberId: string) => {
    setSelectedUserId(memberId);
  }, []);

  const handleSubmit = useCallback(
    (data: StandupFormData) => {
      // Parse blockers and action items into structured arrays
      const blockerItems = parseBlockers(data.blockers);
      const actionItemEntries = parseActionItems(data.actionItems);

      createStandup.mutate(
        {
          ...data,
          blockerItems,
          actionItemEntries,
        },
        {
          onSuccess: () => {
            setFormKey((k) => k + 1);
            toast.success("Standup submitted");
          },
          onError: () => {
            toast.error("Failed to submit standup");
          },
        }
      );
    },
    [createStandup]
  );

  if (!currentUser) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">New Standup Entry</CardTitle>
        {hasTeamMembers && (
          <Select value={activeUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select member" />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        {hasTeamMembers ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <p className="mb-2 text-xs font-medium uppercase text-text-muted">
                Team Members
              </p>
              <StandupMemberList
                entries={entries}
                teamMembers={teamMembers}
                date={date}
                onMemberClick={handleMemberClick}
              />
            </div>
            <div className="lg:col-span-2">
              <StandupForm
                key={formKey}
                userId={activeUserId}
                userName={activeUserName}
                standupDate={date}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        ) : (
          <StandupForm
            key={formKey}
            userId={activeUserId}
            userName={activeUserName}
            standupDate={date}
            onSubmit={handleSubmit}
          />
        )}
        {membersLoading && (
          <p className="mt-2 text-xs text-text-muted">Loading team members...</p>
        )}
      </CardContent>
    </Card>
  );
}
