"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, RefreshCw, X, AlertCircle } from "lucide-react";
import { useConfig } from "@/hooks/use-config";
import { useTeamMembers } from "@/hooks/use-team-members";
import { BacklogConfig } from "@/components/settings/backlog-config";
import { PointsConfig } from "@/components/settings/points-config";
import { SprintsConfig } from "@/components/settings/sprints-config";
import { WorkflowConfig } from "@/components/settings/workflow-config";
import { EstimationMatrixEditor } from "@/components/settings/estimation-matrix-editor";

type TabId = "connection" | "capacity" | "backlog" | "points" | "sprints" | "workflow" | "estimation";

const tabs = [
  { id: "connection" as const, label: "Connection" },
  { id: "capacity" as const, label: "Capacity" },
  { id: "backlog" as const, label: "Backlog" },
  { id: "points" as const, label: "Points" },
  { id: "sprints" as const, label: "Sprints" },
  { id: "workflow" as const, label: "Workflow" },
  { id: "estimation" as const, label: "Estimation" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("connection");
  const [dismissBootstrapCard, setDismissBootstrapCard] = useState(false);
  const queryClient = useQueryClient();
  const { data: config } = useConfig();

  // Detect if using default configuration
  const isUsingDefaults = config &&
    config.backlog.filterType === "release" &&
    !config.backlog.teamProductId &&
    config.points.scale.length === 7;

  // Connection test
  const {
    data: currentUser,
    isLoading: testingConnection,
    error: connectionError,
    refetch: testConnection,
  } = useQuery({
    queryKey: ["aha-me"],
    queryFn: async () => {
      const res = await fetch("/api/aha/me");
      if (!res.ok) throw new Error("Connection failed");
      return res.json();
    },
    retry: false,
  });

  // Settings
  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      return res.json();
    },
  });

  const saveSettings = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  const [defaultPointsPerDay, setDefaultPointsPerDay] = useState(
    String(config?.points.defaultPerDay ?? 1)
  );

  const { data: teamMembers } = useTeamMembers();
  const [selectedStandupUserIds, setSelectedStandupUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (settings?.defaultPointsPerDay) {
      setDefaultPointsPerDay(settings.defaultPointsPerDay);
    }
    if (settings?.standup_user_ids) {
      try {
        const ids = JSON.parse(settings.standup_user_ids);
        if (Array.isArray(ids)) {
          setSelectedStandupUserIds(ids);
        }
      } catch {
        // Invalid JSON, ignore
      }
    } else if (teamMembers) {
      // Default to all team members if not configured
      setSelectedStandupUserIds(teamMembers.map((m) => m.id));
    }
  }, [settings, teamMembers]);

  const toggleStandupUser = (userId: string, checked: boolean) => {
    setSelectedStandupUserIds((prev) =>
      checked ? [...prev, userId] : prev.filter((id) => id !== userId)
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">
          Configure connection, organization, and preferences
        </p>
      </div>

      {/* Bootstrap Guidance Card */}
      {config && isUsingDefaults && !dismissBootstrapCard && (
        <div className="rounded-lg border border-warning bg-warning/10 p-4">
          <div className="flex gap-4">
            <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-text-primary mb-2">
                Using Default Configuration
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                Customize Aha SMT for your organization by clicking through the tabs above,
                or set environment variables in .env.local for server deployments.
              </p>
              <div className="space-y-1 text-sm text-text-secondary">
                <p>Quick links:</p>
                <ul className="space-y-0.5 ml-3">
                  <li>→ <button className="text-primary hover:underline" onClick={() => setActiveTab("backlog")}>Backlog tab</button> — set your filter type</li>
                  <li>→ <button className="text-primary hover:underline" onClick={() => setActiveTab("points")}>Points tab</button> — adjust your point scale</li>
                  <li>→ <button className="text-primary hover:underline" onClick={() => setActiveTab("sprints")}>Sprints tab</button> — choose iterations or releases</li>
                </ul>
              </div>
            </div>
            <button
              onClick={() => setDismissBootstrapCard(true)}
              className="text-text-secondary hover:text-text-primary flex-shrink-0 transition-colors"
              aria-label="Dismiss guidance"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary hover:border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-2xl">
        {activeTab === "connection" && (
          <div className="space-y-6">
            {/* Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle>Aha! Connection</CardTitle>
                <CardDescription>
                  Test your connection to the Aha! API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {testingConnection ? (
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <span className="text-text-secondary">Testing connection...</span>
                  </div>
                ) : connectionError ? (
                  <div className="flex items-center gap-2 text-danger">
                    <XCircle className="h-5 w-5" />
                    <span>Connection failed. Check your AHA_DOMAIN and AHA_API_TOKEN in .env.local</span>
                  </div>
                ) : currentUser ? (
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-5 w-5" />
                    <span>
                      Connected as <strong>{currentUser.name}</strong> ({currentUser.email})
                    </span>
                  </div>
                ) : null}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection()}
                  disabled={testingConnection}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Connection
                </Button>
              </CardContent>
            </Card>

            {/* Environment Info */}
            <Card>
              <CardHeader>
                <CardTitle>Environment</CardTitle>
                <CardDescription>
                  Configuration from .env.local (read-only)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Database</span>
                    <span className="font-mono text-text-muted">SQLite (local)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Cache TTL</span>
                    <span className="font-mono text-text-muted">60s (server)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "capacity" && (
          <div className="space-y-6">
            {/* Capacity Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Capacity Defaults</CardTitle>
                <CardDescription>
                  Default story points per day for team members
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-text-secondary">
                    Default points per day
                  </label>
                  <Input
                    type="number"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={defaultPointsPerDay}
                    onChange={(e) => setDefaultPointsPerDay(e.target.value)}
                    className="w-32"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    saveSettings.mutate({ defaultPointsPerDay })
                  }
                  disabled={saveSettings.isPending}
                >
                  {saveSettings.isPending ? "Saving..." : "Save"}
                </Button>
              </CardContent>
            </Card>

            {/* Standup Team Members */}
            <Card>
              <CardHeader>
                <CardTitle>Standup Team Members</CardTitle>
                <CardDescription>
                  Select which team members should appear in standup views
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {teamMembers && teamMembers.length > 0 ? (
                  <>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`standup-${member.id}`}
                            checked={selectedStandupUserIds.includes(member.id)}
                            onCheckedChange={(checked) =>
                              toggleStandupUser(member.id, !!checked)
                            }
                          />
                          <label
                            htmlFor={`standup-${member.id}`}
                            className="text-sm text-text-primary cursor-pointer"
                          >
                            {member.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setSelectedStandupUserIds(teamMembers.map((m) => m.id))
                        }
                      >
                        Select All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedStandupUserIds([])}
                      >
                        Clear All
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          saveSettings.mutate({
                            standup_user_ids: JSON.stringify(selectedStandupUserIds),
                          })
                        }
                        disabled={saveSettings.isPending}
                      >
                        {saveSettings.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                    <p className="text-xs text-text-muted">
                      {selectedStandupUserIds.length} of {teamMembers.length} members selected
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-text-muted">Loading team members...</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "backlog" && (
          <Card>
            <CardHeader>
              <CardTitle>Backlog Configuration</CardTitle>
              <CardDescription>
                Configure how features are filtered and displayed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BacklogConfig />
            </CardContent>
          </Card>
        )}

        {activeTab === "points" && (
          <Card>
            <CardHeader>
              <CardTitle>Points Configuration</CardTitle>
              <CardDescription>
                Configure point scales, sources, and defaults
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PointsConfig />
            </CardContent>
          </Card>
        )}

        {activeTab === "sprints" && (
          <Card>
            <CardHeader>
              <CardTitle>Sprint Configuration</CardTitle>
              <CardDescription>
                Configure sprint tracking mode and defaults
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SprintsConfig />
            </CardContent>
          </Card>
        )}

        {activeTab === "workflow" && (
          <Card>
            <CardHeader>
              <CardTitle>Workflow Configuration</CardTitle>
              <CardDescription>
                Define which workflow statuses count as complete
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkflowConfig />
            </CardContent>
          </Card>
        )}

        {activeTab === "estimation" && (
          <Card>
            <CardHeader>
              <CardTitle>Estimation Matrix</CardTitle>
              <CardDescription>
                Configure point values for Scope × Complexity × Unknowns combinations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EstimationMatrixEditor />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
