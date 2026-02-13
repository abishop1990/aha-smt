"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StandupTimeline } from "@/components/standup/standup-timeline";
import { BlockerTracker } from "@/components/standup/blocker-tracker";
import { ActionItemList } from "@/components/standup/action-item-list";
import { LiveStandupView } from "@/components/standup/live-standup-view";
import { ErrorBoundary } from "@/components/shared/error-boundary";

function StandupPageContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Standup</h1>
        <p className="text-text-secondary mt-1">
          Daily updates, blockers, and action items
        </p>
      </div>

      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">Live Standup</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="blockers">Blockers</TabsTrigger>
          <TabsTrigger value="actions">Action Items</TabsTrigger>
        </TabsList>
        <TabsContent value="live" className="mt-4">
          <LiveStandupView />
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <StandupTimeline />
        </TabsContent>
        <TabsContent value="blockers" className="mt-4">
          <BlockerTracker />
        </TabsContent>
        <TabsContent value="actions" className="mt-4">
          <ActionItemList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function StandupPage() {
  return (
    <ErrorBoundary>
      <StandupPageContent />
    </ErrorBoundary>
  );
}
