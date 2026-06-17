"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type DaemonApp = {
  id: number;
  serverId: number;
  name: string;
  type: string;
  preset: string;
  driver: string;
  path: string | null;
  command: string | null;
  port: number | null;
  enabled: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type DaemonHealth = {
  ok: boolean;
  service: string;
  version: string;
  workspace?: string;
  database?: string;
  startedAt?: string;
  apps?: DaemonApp[];
};

type DaemonAppLifecycleResponse = {
  app: DaemonApp;
  pid?: number | null;
  stopped?: Array<{ pid: number; result: string }>;
};

type DaemonAppLogsResponse = {
  app: DaemonApp;
  logs: string;
  path: string;
  bytes: number;
  truncated: boolean;
};

type HealthResponse = {
  connected: boolean;
  daemonUrl: string;
  health?: DaemonHealth;
  error: string | null;
};

type AppsResponse = {
  apps: DaemonApp[];
  error: string | null;
};

type AppAction = "start" | "stop" | "restart";

const POLL_INTERVAL_MS = 4000;

const STATUS_STYLES: Record<string, string> = {
  running: "bg-accent/15 text-accent",
  starting: "bg-info/15 text-info",
  stopped: "bg-white/10 text-muted",
  crashed: "bg-negative/15 text-negative",
  unknown: "bg-white/10 text-muted"
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {status}
    </span>
  );
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 2) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function appUrl(app: DaemonApp): string | null {
  return app.port ? `http://localhost:${app.port}` : null;
}

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error || `Request failed with HTTP ${response.status}`;
}

export default function DashboardClient() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [apps, setApps] = useState<DaemonApp[]>([]);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionByAppId, setActionByAppId] = useState<Record<number, AppAction | null>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedLogAppId, setSelectedLogAppId] = useState<number | null>(null);
  const [logs, setLogs] = useState<DaemonAppLogsResponse | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const mounted = useRef(true);

  const poll = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

    try {
      const [healthRes, appsRes] = await Promise.all([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/api/apps", { cache: "no-store" })
      ]);

      const healthData = (await healthRes.json()) as HealthResponse;
      const appsData = (await appsRes.json()) as AppsResponse;

      if (!mounted.current) return;

      setHealth(healthData);
      setApps(appsData.apps || []);
      setAppsError(appsData.error);
      setLastUpdated(new Date().toISOString());
    } catch {
      if (!mounted.current) return;
      setHealth({ connected: false, daemonUrl: "", error: "Dashboard could not reach its API." });
      setAppsError("Dashboard could not reach its API.");
    } finally {
      if (mounted.current) setLoading(false);
      if (mounted.current && showRefresh) setRefreshing(false);
    }
  }, []);

  const replaceApp = useCallback((updated: DaemonApp) => {
    setApps((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }, []);

  const loadLogs = useCallback(async (app: DaemonApp) => {
    setSelectedLogAppId(app.id);
    setLogsLoading(true);
    setLogsError(null);

    try {
      const response = await fetch(`/api/apps/${app.id}/logs`, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setLogs((await response.json()) as DaemonAppLogsResponse);
    } catch (error) {
      setLogsError(error instanceof Error ? error.message : `Could not load logs for ${app.name}.`);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const runAction = useCallback(
    async (app: DaemonApp, action: AppAction) => {
      setActionError(null);
      setActionByAppId((current) => ({ ...current, [app.id]: action }));

      try {
        const response = await fetch(`/api/apps/${app.id}/${action}`, {
          method: "POST",
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(await readError(response));
        }

        const data = (await response.json()) as DaemonAppLifecycleResponse;
        replaceApp(data.app);
        setLastUpdated(new Date().toISOString());

        if (selectedLogAppId === app.id) {
          void loadLogs(data.app);
        }

        void poll();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : `Could not ${action} ${app.name}.`);
      } finally {
        setActionByAppId((current) => ({ ...current, [app.id]: null }));
      }
    },
    [loadLogs, poll, replaceApp, selectedLogAppId]
  );

  useEffect(() => {
    mounted.current = true;
    // Defer the first poll so it runs after commit rather than synchronously
    // inside the effect body.
    const initial = setTimeout(poll, 0);
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      mounted.current = false;
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [poll]);

  const connected = Boolean(health?.connected);
  const runningCount = apps.filter((app) => app.status === "running").length;
  const selectedLogApp = selectedLogAppId ? apps.find((app) => app.id === selectedLogAppId) || logs?.app || null : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-10 sm:px-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Routely</p>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-border/60 bg-surface-raised px-4 py-2.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-accent" : "bg-negative"} ${
                connected ? "shadow-[0_0_0_4px_rgba(30,215,96,0.15)]" : "shadow-[0_0_0_4px_rgba(243,114,127,0.15)]"
              }`}
              aria-hidden="true"
            />
            <div className="leading-tight">
              <p className="text-sm font-bold">Daemon {connected ? "connected" : "disconnected"}</p>
              <p className="font-mono text-[11px] text-muted">{health?.daemonUrl || "—"}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Service" value={health?.health?.service || (loading ? "…" : "unavailable")} />
          <StatCard label="Version" value={health?.health?.version || "—"} />
          <StatCard label="Apps running" value={`${runningCount} / ${apps.length}`} accent />
        </section>

        {health && !connected ? (
          <section className="rounded-lg border border-negative/40 bg-negative/10 p-5">
            <p className="font-bold text-negative">Daemon is not reachable</p>
            <p className="mt-1 text-sm text-muted">
              {health.error || "Start Routely with the `routely` command to bring the daemon online."}
            </p>
          </section>
        ) : null}

        {actionError ? (
          <section className="rounded-lg border border-negative/40 bg-negative/10 p-5">
            <p className="font-bold text-negative">Action failed</p>
            <p className="mt-1 text-sm text-muted">{actionError}</p>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-lg bg-surface shadow-[rgba(0,0,0,0.3)_0px_8px_24px]">
          <div className="flex flex-col gap-3 border-b border-white/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold">Apps</h2>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted">{loading ? "loading…" : `updated ${timeAgo(lastUpdated)}`}</p>
              <button
                type="button"
                onClick={() => void poll(true)}
                disabled={refreshing || loading}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {refreshing ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </div>

          {apps.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted">
              {appsError ? appsError : "No apps registered yet. Add one with `routely add` or in routely.yml."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.08em] text-muted">
                    <th className="px-5 py-3 font-bold">Name</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold">Driver</th>
                    <th className="px-5 py-3 font-bold">Port</th>
                    <th className="px-5 py-3 font-bold">Command</th>
                    <th className="px-5 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((app) => {
                    const currentAction = actionByAppId[app.id];
                    const busy = Boolean(currentAction);
                    const running = app.status === "running" || app.status === "starting";
                    const localUrl = appUrl(app);

                    return (
                      <tr key={app.id} className="border-t border-white/5 transition-colors hover:bg-white/[0.03]">
                        <td className="px-5 py-4 font-bold">{app.name}</td>
                        <td className="px-5 py-4">
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="px-5 py-4 text-muted">{app.driver}</td>
                        <td className="px-5 py-4 font-mono text-xs text-muted">{app.port ? `:${app.port}` : "—"}</td>
                        <td className="max-w-[300px] truncate px-5 py-4 font-mono text-xs text-muted">
                          {app.command || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <ActionButton
                              onClick={() => void runAction(app, "start")}
                              disabled={busy || !connected || !app.enabled || running}
                              active={currentAction === "start"}
                            >
                              Start
                            </ActionButton>
                            <ActionButton
                              onClick={() => void runAction(app, "stop")}
                              disabled={busy || !connected || !running}
                              active={currentAction === "stop"}
                            >
                              Stop
                            </ActionButton>
                            <ActionButton
                              onClick={() => void runAction(app, "restart")}
                              disabled={busy || !connected || !app.enabled}
                              active={currentAction === "restart"}
                            >
                              Restart
                            </ActionButton>
                            <a
                              href={localUrl || undefined}
                              target="_blank"
                              rel="noreferrer"
                              aria-disabled={!localUrl}
                              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                                localUrl
                                  ? "border-border text-foreground hover:border-accent hover:text-accent"
                                  : "pointer-events-none border-border text-muted opacity-50"
                              }`}
                            >
                              Open
                            </a>
                            <ActionButton onClick={() => void loadLogs(app)} disabled={!connected} active={logsLoading && selectedLogAppId === app.id}>
                              Logs
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedLogApp ? (
          <section className="overflow-hidden rounded-lg bg-surface shadow-[rgba(0,0,0,0.3)_0px_8px_24px]">
            <div className="flex flex-col gap-3 border-b border-white/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.1em] text-muted">Recent logs</p>
                <h2 className="text-lg font-bold">{selectedLogApp.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadLogs(selectedLogApp)}
                  disabled={logsLoading}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {logsLoading ? "Loading" : "Reload"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLogAppId(null);
                    setLogs(null);
                    setLogsError(null);
                  }}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-muted transition hover:border-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>
            </div>

            {logsError ? (
              <div className="border-b border-negative/30 bg-negative/10 px-5 py-3 text-sm text-negative">{logsError}</div>
            ) : null}

            <pre className="max-h-[420px] min-h-[220px] overflow-auto whitespace-pre-wrap bg-black/35 px-5 py-4 font-mono text-xs leading-5 text-foreground">
              {logsLoading && !logs ? "Loading logs…" : logs?.logs || "No logs captured yet."}
            </pre>

            {logs?.truncated ? (
              <p className="border-t border-white/5 px-5 py-3 text-xs text-muted">Showing the most recent 64 KB.</p>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function ActionButton({
  active,
  children,
  disabled,
  onClick
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      {active ? "Working" : children}
    </button>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-surface p-5 shadow-[rgba(0,0,0,0.3)_0px_8px_8px]">
      <p className="text-xs uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
