"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DaemonApp, DaemonHealth } from "@/lib/daemon";

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

export default function DashboardClient() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [apps, setApps] = useState<DaemonApp[]>([]);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const poll = useCallback(async () => {
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
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

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

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-10 sm:px-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-base font-bold text-black">
              R
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Routely local</p>
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

        <section className="overflow-hidden rounded-lg bg-surface shadow-[rgba(0,0,0,0.3)_0px_8px_24px]">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <h2 className="text-lg font-bold">Apps</h2>
            <p className="text-xs text-muted">
              {loading ? "loading…" : `updated ${timeAgo(lastUpdated)}`}
            </p>
          </div>

          {apps.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted">
              {appsError ? appsError : "No apps registered yet. Add one with `routely add` or in routely.yml."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.08em] text-muted">
                    <th className="px-5 py-3 font-bold">Name</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold">Driver</th>
                    <th className="px-5 py-3 font-bold">Port</th>
                    <th className="px-5 py-3 font-bold">Command</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((app) => (
                    <tr key={app.id} className="border-t border-white/5 transition-colors hover:bg-white/[0.03]">
                      <td className="px-5 py-4 font-bold">{app.name}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-5 py-4 text-muted">{app.driver}</td>
                      <td className="px-5 py-4 font-mono text-xs text-muted">{app.port ? `:${app.port}` : "—"}</td>
                      <td className="max-w-[320px] truncate px-5 py-4 font-mono text-xs text-muted">
                        {app.command || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
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
