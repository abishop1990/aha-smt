"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";

export default function SettingsPage() {
  const queryClient = useQueryClient();

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
    },
  });

  const [defaultPointsPerDay, setDefaultPointsPerDay] = useState("1");

  useEffect(() => {
    if (settings?.defaultPointsPerDay) {
      setDefaultPointsPerDay(settings.defaultPointsPerDay);
    }
  }, [settings]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">
          Configure connection and preferences
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>Aha Connection</CardTitle>
          <CardDescription>
            Test your connection to the Aha API
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
          {saveSettings.isSuccess && (
            <Badge variant="success" className="ml-2">Saved</Badge>
          )}
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
  );
}
