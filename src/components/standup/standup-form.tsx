"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StandupEntry } from "@/hooks/use-standups";

export interface StandupFormData {
  userId: string;
  userName: string;
  standupDate: string;
  doneSinceLastStandup: string;
  workingOnNow: string;
  blockers: string;
  actionItems: string;
  featureRefs: string[];
}

interface StandupFormProps {
  userId: string;
  userName: string;
  standupDate: string;
  onSubmit: (data: StandupFormData) => void;
  initialData?: StandupEntry;
  onCancel?: () => void;
}

export function StandupForm({ userId, userName, standupDate, onSubmit, initialData, onCancel }: StandupFormProps) {
  const [doneSinceLastStandup, setDoneSinceLastStandup] = useState(initialData?.doneSinceLastStandup ?? "");
  const [workingOnNow, setWorkingOnNow] = useState(initialData?.workingOnNow ?? "");
  const [blockers, setBlockers] = useState(initialData?.blockers ?? "");
  const [actionItems, setActionItems] = useState(initialData?.actionItems ?? "");
  const [featureRefsInput, setFeatureRefsInput] = useState(() => {
    if (!initialData?.featureRefs) return "";
    try {
      const parsed = JSON.parse(initialData.featureRefs);
      return Array.isArray(parsed) ? parsed.join(", ") : "";
    } catch {
      return "";
    }
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const featureRefs = featureRefsInput
      .split(",")
      .map((ref) => ref.trim())
      .filter(Boolean);

    onSubmit({
      userId,
      userName,
      standupDate,
      doneSinceLastStandup,
      workingOnNow,
      blockers,
      actionItems,
      featureRefs,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary">
          What did you do since last standup?
        </label>
        <Textarea
          value={doneSinceLastStandup}
          onChange={(e) => setDoneSinceLastStandup(e.target.value)}
          placeholder="Describe what you completed..."
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary">
          What are you working on now?
        </label>
        <Textarea
          value={workingOnNow}
          onChange={(e) => setWorkingOnNow(e.target.value)}
          placeholder="Describe your current focus..."
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary">
          Any blockers?
        </label>
        <Textarea
          value={blockers}
          onChange={(e) => setBlockers(e.target.value)}
          placeholder="Describe any blockers..."
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary">
          Action items
        </label>
        <Textarea
          value={actionItems}
          onChange={(e) => setActionItems(e.target.value)}
          placeholder="List action items..."
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary">
          Feature refs (comma-separated)
        </label>
        <Input
          value={featureRefsInput}
          onChange={(e) => setFeatureRefsInput(e.target.value)}
          placeholder="e.g. FEAT-123, FEAT-456"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">
          {initialData ? "Update" : "Submit Standup"}
        </Button>
      </div>
    </form>
  );
}
