"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";

type DaemonApp = {
  id: number;
  serverId: number;
  name: string;
  type: string;
  preset: string;
  driver: string;
  path: string | null;
  command: string | null;
  install: string | null;
  dev: string | null;
  build: string | null;
  start: string | null;
  env: Record<string, string>;
  port: number | null;
  dependsOn?: string[];
  healthcheck?: { path: string | null; expected_status: number | null } | null;
  domains?: string[];
  source?: { type: string | null; repo: string | null; branch: string | null } | null;
  image?: string | null;
  internal?: boolean;
  volumes?: string[];
  composeFile?: string | null;
  composeService?: string | null;
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
  server?: DaemonServerStatus;
  apps?: DaemonApp[];
};

type DaemonServerCheck = {
  id: string;
  label: string;
  status: "ok" | "warn" | "error";
  message: string;
  detail: string | null;
};

type DaemonServerStatus = {
  mode: string;
  production: boolean;
  dataDir: string | null;
  initializedAt: string | null;
  auth: {
    required: boolean;
    configured: boolean;
    tokenCreatedAt: string | null;
    tokenSource: string | null;
  };
  readiness: {
    ok: boolean;
    checkedAt: string | null;
    checks: DaemonServerCheck[];
  } | null;
  disabledProductionActions: string[];
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

type ServerStatusResponse = {
  server: DaemonServerStatus | null;
  error?: string | null;
};

type AppAction = "start" | "stop" | "restart";
type FormMode = "create" | "edit";

type AppFormState = {
  name: string;
  type: string;
  preset: string;
  driver: string;
  path: string;
  command: string;
  install: string;
  dev: string;
  build: string;
  start: string;
  env: string;
  port: string;
  enabled: boolean;
  dependsOn: string;
  healthcheckPath: string;
  healthcheckStatus: string;
  domains: string;
  sourceRepo: string;
  sourceBranch: string;
  image: string;
  internal: boolean;
  volumes: string;
  composeFile: string;
  composeService: string;
};

const POLL_INTERVAL_MS = 4000;
const APP_TYPES = ["app", "database", "compose", "static", "worker"];
const APP_DRIVERS = ["command", "compose", "dockerfile", "buildpack", "static"];
const APP_PRESETS = ["custom", "nextjs", "vite", "laravel", "express", "nestjs", "django", "fastapi", "go", "static", "php", "postgres", "mysql", "mariadb", "redis", "mongodb"];
const PANEL_SHADOW = "shadow-[rgba(0,0,0,0.5)_0px_8px_24px]";
const INSET_RING = "shadow-[rgb(18,18,18)_0px_1px_0px,rgb(124,124,124)_0px_0px_0px_1px_inset]";
const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const STATUS_STYLES: Record<string, string> = {
  running: "bg-accent/15 text-accent shadow-[0_0_0_1px_rgba(30,215,96,0.22)_inset]",
  starting: "bg-info/15 text-info shadow-[0_0_0_1px_rgba(83,157,245,0.2)_inset]",
  stopped: "bg-white/10 text-muted shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]",
  crashed: "bg-negative/15 text-negative shadow-[0_0_0_1px_rgba(243,114,127,0.2)_inset]",
  unknown: "bg-white/10 text-muted shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]"
};

const blankForm: AppFormState = {
  name: "",
  type: "app",
  preset: "custom",
  driver: "command",
  path: "",
  command: "",
  install: "",
  dev: "",
  build: "",
  start: "",
  env: "",
  port: "",
  enabled: true,
  dependsOn: "",
  healthcheckPath: "",
  healthcheckStatus: "",
  domains: "",
  sourceRepo: "",
  sourceBranch: "",
  image: "",
  internal: false,
  volumes: "",
  composeFile: "",
  composeService: ""
};

function formFromApp(app: DaemonApp): AppFormState {
  return {
    name: app.name,
    type: app.type,
    preset: app.preset,
    driver: app.driver,
    path: app.path || "",
    command: app.command || "",
    install: app.install || "",
    dev: app.dev || "",
    build: app.build || "",
    start: app.start || "",
    env: Object.entries(app.env || {}).map(([key, value]) => `${key}=${value}`).join("\n"),
    port: app.port == null ? "" : String(app.port),
    enabled: app.enabled,
    dependsOn: (app.dependsOn || []).join(", "),
    healthcheckPath: app.healthcheck?.path || "",
    healthcheckStatus: app.healthcheck?.expected_status == null ? "" : String(app.healthcheck.expected_status),
    domains: (app.domains || []).join(", "),
    sourceRepo: app.source?.repo || "",
    sourceBranch: app.source?.branch || "",
    image: app.image || "",
    internal: Boolean(app.internal),
    volumes: (app.volumes || []).join("\n"),
    composeFile: app.composeFile || "",
    composeService: app.composeService || ""
  };
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold capitalize ${style}`}>
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

function shortPath(path: string | null): string {
  if (!path) return "-";
  const parts = path.split("/").filter(Boolean);
  return parts.length > 3 ? `.../${parts.slice(-3).join("/")}` : path;
}

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error || `Request failed with HTTP ${response.status}`;
}

function formPayload(form: AppFormState) {
  const env = Object.fromEntries(
    form.env
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf("=");
        return separator >= 0 ? [line.slice(0, separator).trim(), line.slice(separator + 1)] : [line, ""];
      })
      .filter(([key]) => key)
  );

  return {
    name: form.name.trim(),
    type: form.type,
    preset: form.preset.trim() || "custom",
    driver: form.driver,
    path: form.path.trim() || null,
    command: form.command.trim() || null,
    install: form.install.trim() || null,
    dev: form.dev.trim() || form.command.trim() || null,
    build: form.build.trim() || null,
    start: form.start.trim() || null,
    env,
    port: form.port.trim() === "" ? null : Number(form.port),
    enabled: form.enabled,
    depends_on: form.dependsOn
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    healthcheck: form.healthcheckPath.trim() || form.healthcheckStatus.trim()
      ? {
          path: form.healthcheckPath.trim() || null,
          expected_status: form.healthcheckStatus.trim() ? Number(form.healthcheckStatus) : null
        }
      : null,
    domains: splitList(form.domains),
    source: form.sourceRepo.trim() || form.sourceBranch.trim()
      ? { type: "github", repo: form.sourceRepo.trim() || null, branch: form.sourceBranch.trim() || null }
      : null,
    image: form.image.trim() || null,
    internal: form.internal,
    volumes: form.volumes.split("\n").map((item) => item.trim()).filter(Boolean),
    compose_file: form.composeFile.trim() || null,
    compose_service: form.composeService.trim() || null
  };
}

function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function resourceLabel(app: DaemonApp): string {
  if (app.type === "database") return "Database";
  if (app.driver === "compose") return "Compose service";
  if (app.type === "worker") return "Worker";
  return "App";
}

function appInitials(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "A";
}

export default function DashboardClient() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [serverStatus, setServerStatus] = useState<DaemonServerStatus | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [apps, setApps] = useState<DaemonApp[]>([]);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionByAppId, setActionByAppId] = useState<Record<number, AppAction | null>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [logs, setLogs] = useState<DaemonAppLogsResponse | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingAppId, setEditingAppId] = useState<number | null>(null);
  const [form, setForm] = useState<AppFormState>(blankForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const mounted = useRef(true);

  const poll = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

    try {
      const [healthRes, appsRes, serverRes] = await Promise.all([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/api/apps", { cache: "no-store" }),
        fetch("/api/server/status", { cache: "no-store" })
      ]);

      const healthData = (await healthRes.json()) as HealthResponse;
      const appsData = (await appsRes.json()) as AppsResponse;
      const serverData = (await serverRes.json().catch(() => ({ server: null, error: "Server status unavailable." }))) as ServerStatusResponse;

      if (!mounted.current) return;

      setHealth(healthData);
      setServerStatus(serverData.server || healthData.health?.server || null);
      setServerError(serverData.error || null);
      setApps(appsData.apps || []);
      setAppsError(appsData.error);
      setLastUpdated(new Date().toISOString());
      setSelectedAppId((current) => current ?? appsData.apps?.[0]?.id ?? null);
    } catch {
      if (!mounted.current) return;
      setHealth({ connected: false, daemonUrl: "", error: "Dashboard could not reach its API." });
      setServerStatus(null);
      setServerError("Dashboard could not reach its API.");
      setAppsError("Dashboard could not reach its API.");
    } finally {
      if (mounted.current) setLoading(false);
      if (mounted.current && showRefresh) setRefreshing(false);
    }
  }, []);

  const replaceApp = useCallback((updated: DaemonApp) => {
    setApps((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }, []);

  const selectedApp = useMemo(() => {
    if (!selectedAppId) return null;
    return apps.find((app) => app.id === selectedAppId) || logs?.app || null;
  }, [apps, logs?.app, selectedAppId]);

  const loadLogs = useCallback(async (app: DaemonApp) => {
    setSelectedAppId(app.id);
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
        setSelectedAppId(data.app.id);
        setLastUpdated(new Date().toISOString());
        void loadLogs(data.app);
        void poll();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : `Could not ${action} ${app.name}.`);
      } finally {
        setActionByAppId((current) => ({ ...current, [app.id]: null }));
      }
    },
    [loadLogs, poll, replaceApp]
  );

  function openCreateForm() {
    setFormMode("create");
    setEditingAppId(null);
    setForm(blankForm);
    setFormError(null);
  }

  function openEditForm(app: DaemonApp) {
    setFormMode("edit");
    setEditingAppId(app.id);
    setForm(formFromApp(app));
    setFormError(null);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("App name is required.");
      return;
    }

    if (form.port.trim() && (!Number.isInteger(Number(form.port)) || Number(form.port) <= 0)) {
      setFormError("Port must be a positive integer.");
      return;
    }

    setFormSaving(true);

    try {
      const isEdit = formMode === "edit" && editingAppId != null;
      const response = await fetch(isEdit ? `/api/apps/${editingAppId}` : "/api/apps", {
        method: isEdit ? "PATCH" : "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(formPayload(form))
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = (await response.json()) as { app: DaemonApp };
      setApps((current) => {
        const exists = current.some((item) => item.id === data.app.id);
        const next = exists ? current.map((item) => (item.id === data.app.id ? data.app : item)) : [...current, data.app];
        return [...next].sort((a, b) => a.name.localeCompare(b.name));
      });
      setSelectedAppId(data.app.id);
      setFormMode(null);
      setEditingAppId(null);
      setLastUpdated(new Date().toISOString());
      void poll();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save app.");
    } finally {
      setFormSaving(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
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
  const disabledCount = apps.filter((app) => !app.enabled).length;
  const appResources = apps.filter((app) => app.type === "app" || app.type === "worker" || app.type === "static");
  const serviceResources = apps.filter((app) => !(app.type === "app" || app.type === "worker" || app.type === "static"));
  const workspace = health?.health?.workspace || "local workspace";
  const stoppedCount = Math.max(0, apps.length - runningCount);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-rows-[1fr_auto] lg:grid-cols-[248px_1fr] lg:grid-rows-1">
        <Sidebar connected={connected} />

        <section className="min-w-0 pb-20 lg:pb-0">
          <WorkspaceHeader
            connected={connected}
            daemonUrl={health?.daemonUrl || "-"}
            workspace={workspace}
            updated={timeAgo(lastUpdated)}
            loading={loading}
            refreshing={refreshing}
            onRefresh={() => void poll(true)}
          />

          <div className="grid gap-3 px-3 py-3 sm:px-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:px-5 xl:grid-cols-[minmax(0,1fr)_410px]">
            <ServerFoundationPanel
              connected={connected}
              error={serverError}
              server={serverStatus}
            />

            <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW}`}>
              <div className="flex flex-col gap-3 border-b border-white/5 bg-gradient-to-b from-white/[0.035] to-transparent px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Local runner</p>
                  <h1 className="text-xl font-bold leading-tight">Apps & services</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <MetricPill label="running" value={`${runningCount}/${apps.length}`} accent />
                  <MetricPill label="services" value={String(serviceResources.length)} />
                  <MetricPill label="stopped" value={String(stoppedCount)} />
                  <MetricPill label="disabled" value={String(disabledCount)} />
                  <PillButton onClick={openCreateForm} strong disabled={!connected}>
                    Add resource
                  </PillButton>
                </div>
              </div>

              {!connected && health ? <Alert title="Daemon offline" message={health.error || "Start Routely from the CLI to bring the local control plane online."} /> : null}
              {actionError ? <Alert title="Action failed" message={actionError} /> : null}
              {appsError ? <Alert title="Registry unavailable" message={appsError} /> : null}

              {formMode ? (
                <AppForm
                  mode={formMode}
                  form={form}
                  error={formError}
                  saving={formSaving}
                  onChange={setForm}
                  onCancel={() => setFormMode(null)}
                  onSubmit={submitForm}
                />
              ) : null}

              <div className="bg-black/10">
                {loading ? (
                  <LoadingRows />
                ) : apps.length === 0 ? (
                  <EmptyState connected={connected} onAdd={openCreateForm} />
                ) : (
                  <>
                    <ResourceSection title="Apps" count={appResources.length} />
                    {appResources.map((app) => (
                      <AppRow
                        key={app.id}
                        app={app}
                        active={selectedAppId === app.id}
                        connected={connected}
                        currentAction={actionByAppId[app.id]}
                        onSelect={() => setSelectedAppId(app.id)}
                        onLogs={() => void loadLogs(app)}
                        onEdit={() => openEditForm(app)}
                        onAction={(action) => void runAction(app, action)}
                      />
                    ))}
                    <ResourceSection title="Services & databases" count={serviceResources.length} />
                    {serviceResources.length === 0 ? <ServiceEmpty /> : null}
                    {serviceResources.map((app) => (
                      <AppRow
                        key={app.id}
                        app={app}
                        active={selectedAppId === app.id}
                        connected={connected}
                        currentAction={actionByAppId[app.id]}
                        onSelect={() => setSelectedAppId(app.id)}
                        onLogs={() => void loadLogs(app)}
                        onEdit={() => openEditForm(app)}
                        onAction={(action) => void runAction(app, action)}
                      />
                    ))}
                  </>
                )}
              </div>
            </section>

            <DetailPanel
              app={selectedApp}
              connected={connected}
              logs={logs}
              loading={logsLoading}
              error={logsError}
              currentAction={selectedApp ? actionByAppId[selectedApp.id] : null}
              onEdit={selectedApp ? () => openEditForm(selectedApp) : undefined}
              onReload={selectedApp ? () => void loadLogs(selectedApp) : undefined}
              onAction={selectedApp ? (action) => void runAction(selectedApp, action) : undefined}
            />
          </div>
        </section>

        <MobileNav connected={connected} />
      </div>
    </main>
  );
}

function Sidebar({ connected }: { connected: boolean }) {
  return (
    <aside className={`hidden border-r border-white/5 bg-[#121212] px-3 py-4 ${PANEL_SHADOW} lg:block`}>
      <div className="flex items-center gap-3 px-2">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-black text-black">R</div>
        <div>
          <p className="text-sm font-bold leading-tight">Routely</p>
          <p className="text-[11px] text-muted">Local control plane</p>
        </div>
      </div>
      <nav className="mt-7 space-y-1">
        <NavItem active label="Local apps" dot={connected} />
        <NavItem label="Logs" />
        <NavItem label="Metrics" />
      </nav>
      <div className="mt-7 border-t border-white/5 pt-4">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Later</p>
        <nav className="mt-2 space-y-1">
          <NavItem label="Deployments" disabled />
          <NavItem label="Domains" disabled />
          <NavItem label="Databases" disabled />
          <NavItem label="Backups" disabled />
          <NavItem label="Settings" disabled />
        </nav>
      </div>
    </aside>
  );
}

function ServerFoundationPanel({ connected, error, server }: { connected: boolean; error: string | null; server: DaemonServerStatus | null }) {
  const checks = server?.readiness?.checks || [];
  const dockerChecks = checks.filter((check) => ["docker", "docker-compose"].includes(check.id));
  const portChecks = checks.filter((check) => check.id.startsWith("port-"));
  const dataCheck = checks.find((check) => check.id === "data-dir");
  const authStatus = server?.auth.configured ? "ready" : server?.auth.required ? "missing" : "local bypass";

  return (
    <section className={`overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW} lg:col-span-2`}>
      <div className="grid gap-3 border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent px-4 py-4 lg:grid-cols-[1.1fr_1.4fr] lg:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Server foundation</p>
          <h2 className="text-lg font-bold leading-tight sm:text-xl">Production readiness</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            {server?.production
              ? "Production mode is enabled. Infrastructure actions stay locked until their checkpoints ship."
              : "Local mode is active. Server init prepares the one-VPS foundation without adding deploy actions yet."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ReadinessCard label="Mode" value={server?.mode || "local"} status={server?.production ? "warn" : "ok"} />
          <ReadinessCard label="Auth" value={authStatus} status={server?.auth.configured || !server?.auth.required ? "ok" : "error"} />
          <ReadinessCard label="Docker" value={summaryStatus(dockerChecks)} status={worstStatus(dockerChecks)} />
          <ReadinessCard label="Ports" value={summaryStatus(portChecks)} status={worstStatus(portChecks)} />
        </div>
      </div>

      {error ? <Alert title="Server status unavailable" message={error} /> : null}

      <div className="grid gap-3 px-4 py-4 lg:grid-cols-[1.1fr_1.4fr]">
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <Meta label="Daemon" value={connected ? "connected" : "offline"} />
          <Meta label="Data dir" value={server?.dataDir || "not initialized"} mono />
          <Meta label="Initialized" value={server?.initializedAt ? timeAgo(server.initializedAt) : "not initialized"} />
          <Meta label="Auth source" value={server?.auth.tokenSource || "none"} />
          <Meta label="Last doctor" value={server?.readiness?.checkedAt ? timeAgo(server.readiness.checkedAt) : "not run"} />
          <Meta label="Data check" value={dataCheck?.message || "pending"} wide />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {(checks.length > 0 ? checks.slice(0, 6) : emptyServerChecks()).map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </div>
      </div>

      <div className="border-t border-white/5 bg-black/20 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Future production</span>
          {(server?.disabledProductionActions || ["deployments", "domains", "https", "github", "backups"]).map((item) => (
            <span key={item} className="rounded-full bg-surface-raised px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted/60">
              {item} locked
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function emptyServerChecks(): DaemonServerCheck[] {
  return [
    { id: "docker", label: "Docker", status: "warn", message: "Run routely server doctor", detail: null },
    { id: "data-dir", label: "Data directory", status: "warn", message: "Server init pending", detail: null },
    { id: "auth", label: "Auth", status: "warn", message: "Admin token pending", detail: null }
  ];
}

function worstStatus(checks: DaemonServerCheck[]): "ok" | "warn" | "error" {
  if (checks.some((check) => check.status === "error")) return "error";
  if (checks.some((check) => check.status === "warn") || checks.length === 0) return "warn";
  return "ok";
}

function summaryStatus(checks: DaemonServerCheck[]): string {
  if (checks.length === 0) return "pending";
  const failed = checks.filter((check) => check.status === "error").length;
  const warnings = checks.filter((check) => check.status === "warn").length;
  if (failed > 0) return `${failed} failing`;
  if (warnings > 0) return `${warnings} warnings`;
  return "ready";
}

function ReadinessCard({ label, status, value }: { label: string; status: "ok" | "warn" | "error"; value: string }) {
  const color = status === "ok" ? "text-accent" : status === "warn" ? "text-warning" : "text-negative";
  return (
    <div className={`rounded-md bg-surface-raised px-3 py-2 ${INSET_RING}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className={`mt-1 truncate text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

function CheckRow({ check }: { check: DaemonServerCheck }) {
  const color = check.status === "ok" ? "bg-accent" : check.status === "warn" ? "bg-warning" : "bg-negative";
  return (
    <div className="min-w-0 rounded-md bg-black/22 px-3 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.045)_inset]">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden="true" />
        <p className="truncate text-xs font-bold">{check.label}</p>
      </div>
      <p className="mt-1 truncate text-[11px] text-muted">{check.message}</p>
    </div>
  );
}

function MobileNav({ connected }: { connected: boolean }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-1 border-t border-white/5 bg-[#121212]/95 px-2 py-2 shadow-[rgba(0,0,0,0.5)_0px_-8px_24px] backdrop-blur lg:hidden">
      <MobileNavItem active label="Apps" />
      <MobileNavItem label="Logs" />
      <MobileNavItem label="Deploy" disabled />
      <MobileNavItem label={connected ? "Online" : "Offline"} status={connected} />
    </nav>
  );
}

function WorkspaceHeader({
  connected,
  daemonUrl,
  loading,
  onRefresh,
  refreshing,
  updated,
  workspace
}: {
  connected: boolean;
  daemonUrl: string;
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  updated: string;
  workspace: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-background/92 px-3 py-3 backdrop-blur sm:px-4 lg:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Workspace</p>
          <p className="truncate text-sm font-bold sm:text-base">{workspace}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex min-w-0 items-center gap-2 rounded-full bg-surface-raised px-3 py-2 ${INSET_RING}`}>
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-accent" : "bg-negative"}`} aria-hidden="true" />
            <span className="text-xs font-bold">Daemon {connected ? "connected" : "offline"}</span>
            <span className="hidden max-w-[220px] truncate font-mono text-[10px] text-muted sm:inline">{daemonUrl}</span>
          </div>
          <span className="text-xs text-muted">{loading ? "loading" : `updated ${updated}`}</span>
          <PillButton onClick={onRefresh} disabled={refreshing || loading}>
            {refreshing ? "Refreshing" : "Refresh"}
          </PillButton>
        </div>
      </div>
    </header>
  );
}

function AppRow({
  active,
  app,
  connected,
  currentAction,
  onAction,
  onEdit,
  onLogs,
  onSelect
}: {
  active: boolean;
  app: DaemonApp;
  connected: boolean;
  currentAction?: AppAction | null;
  onAction: (action: AppAction) => void;
  onEdit: () => void;
  onLogs: () => void;
  onSelect: () => void;
}) {
  const busy = Boolean(currentAction);
  const running = app.status === "running" || app.status === "starting";
  const localUrl = appUrl(app);
  const disabledReason = !app.enabled ? "Disabled" : !connected ? "Offline" : null;
  const primaryMeta = app.driver === "compose" ? app.image || app.composeService || "compose service" : app.command || app.dev || "no command";

  return (
    <article className={`grid gap-3 border-b border-white/5 px-3 py-3 transition hover:bg-white/[0.035] sm:px-4 xl:grid-cols-[minmax(210px,1fr)_100px_68px_minmax(150px,0.85fr)] xl:items-center ${active ? "bg-white/[0.055] shadow-[3px_0_0_0_var(--accent)_inset]" : ""}`}>
      <button type="button" onClick={onSelect} className={`min-w-0 rounded-md text-left ${FOCUS_RING}`}>
        <div className="flex items-center gap-3">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-black ${running ? "bg-accent text-black" : "bg-surface-raised text-muted"}`}>
            {appInitials(app.name)}
          </span>
          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-2">
              <span className="block truncate text-sm font-bold">{app.name}</span>
              {disabledReason ? <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{disabledReason}</span> : null}
            </span>
            <span className="block truncate font-mono text-[11px] text-muted">{shortPath(app.path)}</span>
            <span className="mt-1 inline-flex rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{resourceLabel(app)}</span>
          </span>
        </div>
      </button>
      <div className="flex items-center justify-between gap-2 xl:block">
        <StatusBadge status={app.status} />
        <span className="font-mono text-xs text-muted xl:hidden">{app.port ? `:${app.port}` : "no port"}</span>
      </div>
      <div className="hidden font-mono text-xs text-muted xl:block">{app.port ? `:${app.port}` : "no port"}</div>
      <div className="min-w-0 truncate rounded-full bg-black/20 px-3 py-1.5 font-mono text-xs text-muted xl:bg-transparent xl:px-0 xl:py-0">{primaryMeta}</div>
      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end xl:col-span-4 xl:flex-nowrap">
        <RoundAction label="Start" onClick={() => onAction("start")} disabled={busy || !connected || !app.enabled || running} active={currentAction === "start"} />
        <RoundAction label="Stop" onClick={() => onAction("stop")} disabled={busy || !connected || !running} active={currentAction === "stop"} />
        <RoundAction label="Restart" onClick={() => onAction("restart")} disabled={busy || !connected || !app.enabled} active={currentAction === "restart"} />
        <ActionLink href={localUrl}>Open</ActionLink>
        <PillButton onClick={onLogs} disabled={!connected}>Logs</PillButton>
        <PillButton onClick={onEdit} disabled={!connected}>Edit</PillButton>
      </div>
    </article>
  );
}

function DetailPanel({
  app,
  connected,
  currentAction,
  error,
  loading,
  logs,
  onAction,
  onEdit,
  onReload
}: {
  app: DaemonApp | null;
  connected: boolean;
  currentAction?: AppAction | null;
  error: string | null;
  loading: boolean;
  logs: DaemonAppLogsResponse | null;
  onAction?: (action: AppAction) => void;
  onEdit?: () => void;
  onReload?: () => void;
}) {
  if (!app) {
    return (
      <aside className={`rounded-lg bg-surface px-4 py-10 text-center ${PANEL_SHADOW} lg:sticky lg:top-[84px]`}>
        <p className="text-sm font-bold">No app selected</p>
        <p className="mt-1 text-sm text-muted">Select a local app to inspect its command, URL, dependencies, and logs.</p>
      </aside>
    );
  }

  const running = app.status === "running" || app.status === "starting";
  const localUrl = appUrl(app);

  return (
    <aside className={`overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW} lg:sticky lg:top-[84px]`}>
      <div className="border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Inspector</p>
            <h2 className="truncate text-xl font-bold">{app.name}</h2>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">{resourceLabel(app)}</p>
          </div>
          <StatusBadge status={app.status} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          <RoundAction label="Start" onClick={() => onAction?.("start")} disabled={!onAction || !connected || !app.enabled || running || Boolean(currentAction)} active={currentAction === "start"} />
          <RoundAction label="Stop" onClick={() => onAction?.("stop")} disabled={!onAction || !connected || !running || Boolean(currentAction)} active={currentAction === "stop"} />
          <RoundAction label="Restart" onClick={() => onAction?.("restart")} disabled={!onAction || !connected || !app.enabled || Boolean(currentAction)} active={currentAction === "restart"} />
          <PillButton onClick={onEdit} disabled={!onEdit || !connected}>Edit</PillButton>
          <ActionLink href={localUrl}>Open</ActionLink>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-3 px-4 py-4 text-xs">
        <Meta label="Type" value={app.type} />
        <Meta label="Driver" value={app.driver} />
        <Meta label="Preset" value={app.preset} />
        <Meta label="Port" value={app.port ? String(app.port) : "-"} mono />
        <Meta label="Enabled" value={app.enabled ? "yes" : "no"} />
        <Meta label="Internal" value={app.internal ? "yes" : "no"} />
        <Meta label="Updated" value={timeAgo(app.updatedAt)} />
        <Meta label="Path" value={app.path || "-"} mono wide />
        <Meta label="Install" value={app.install || "-"} mono wide />
        <Meta label="Dev" value={app.dev || app.command || "-"} mono wide />
        <Meta label="Build" value={app.build || "-"} mono wide />
        <Meta label="Start" value={app.start || "-"} mono wide />
        <Meta label="Image" value={app.image || "-"} mono wide />
        <Meta label="Compose" value={[app.composeFile, app.composeService].filter(Boolean).join(" / ") || "generated"} mono wide />
        <Meta label="Depends on" value={(app.dependsOn || []).join(", ") || "-"} wide />
        <Meta label="Healthcheck" value={app.healthcheck?.path ? `${app.healthcheck.path} -> ${app.healthcheck.expected_status || 200}` : "-"} wide />
        <Meta label="Domains" value={(app.domains || []).join(", ") || "-"} wide />
        <Meta label="Volumes" value={(app.volumes || []).join(", ") || "-"} mono wide />
        <Meta label="Env" value={Object.keys(app.env || {}).length > 0 ? Object.keys(app.env || {}).join(", ") : "-"} mono wide />
      </dl>

      <div className="border-t border-white/5">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Recent logs</p>
            <p className="text-xs text-muted">{logs?.truncated ? "tail 64 KB" : "latest local output"}</p>
          </div>
          <PillButton onClick={onReload} disabled={!onReload || loading || !connected}>{loading ? "Loading" : "Reload"}</PillButton>
        </div>
        {error ? <div className="border-y border-negative/20 bg-negative/10 px-4 py-2 text-xs text-negative">{error}</div> : null}
        <pre className="max-h-[360px] min-h-[240px] overflow-auto whitespace-pre-wrap border-t border-white/5 bg-black/45 px-4 py-3 font-mono text-xs leading-5 text-[#d9d9d9] shadow-[rgb(0,0,0)_0px_1px_0px_inset]">
          {loading && !logs ? "Loading logs..." : logs?.app.id === app.id ? logs.logs || "No logs captured yet." : "Logs pending."}
        </pre>
      </div>
    </aside>
  );
}

function AppForm({
  error,
  form,
  mode,
  onCancel,
  onChange,
  onSubmit,
  saving
}: {
  error: string | null;
  form: AppFormState;
  mode: FormMode;
  onCancel: () => void;
  onChange: (form: AppFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
}) {
  const update = (patch: Partial<AppFormState>) => onChange({ ...form, ...patch });
  const portInvalid = form.port.trim() !== "" && (!Number.isInteger(Number(form.port)) || Number(form.port) <= 0);
  const nameMissing = form.name.trim() === "";

  return (
    <form onSubmit={onSubmit} className="border-b border-white/5 bg-black/25 px-4 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{mode === "create" ? "Add local resource" : "Edit local resource"}</p>
          <h2 className="text-base font-bold">Registry definition</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <PillButton type="button" onClick={onCancel} disabled={saving}>Cancel</PillButton>
          <PillButton type="submit" strong disabled={saving}>{saving ? "Saving" : "Save"}</PillButton>
        </div>
      </div>

      {error ? <div className="mt-3 rounded-md bg-negative/10 px-3 py-2 text-sm text-negative shadow-[0_0_0_1px_rgba(243,114,127,0.22)_inset]">{error}</div> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Name" value={form.name} onChange={(value) => update({ name: value })} required error={nameMissing && error ? "Required" : undefined} disabled={saving} />
        <SelectField label="Type" value={form.type} values={APP_TYPES} onChange={(value) => update({ type: value })} disabled={saving} />
        <SelectField label="Preset" value={form.preset} values={APP_PRESETS} onChange={(value) => update({ preset: value })} disabled={saving} />
        <SelectField label="Driver" value={form.driver} values={APP_DRIVERS} onChange={(value) => update({ driver: value })} disabled={saving} />
        <Field label="Path" value={form.path} onChange={(value) => update({ path: value })} mono wide disabled={saving} placeholder="/path/to/app" />
        <Field label="Command" value={form.command} onChange={(value) => update({ command: value, dev: value || form.dev })} mono wide disabled={saving} placeholder="npm run dev" />
        <Field label="Install" value={form.install} onChange={(value) => update({ install: value })} mono disabled={saving} placeholder="npm install" />
        <Field label="Dev" value={form.dev} onChange={(value) => update({ dev: value, command: form.command || value })} mono disabled={saving} placeholder="npm run dev" />
        <Field label="Build" value={form.build} onChange={(value) => update({ build: value })} mono disabled={saving} placeholder="npm run build" />
        <Field label="Start" value={form.start} onChange={(value) => update({ start: value })} mono disabled={saving} placeholder="npm run start" />
        <Field label="Port" value={form.port} onChange={(value) => update({ port: value })} type="number" error={portInvalid ? "Positive integer" : undefined} disabled={saving} placeholder="3000" />
        <Field label="Depends on" value={form.dependsOn} onChange={(value) => update({ dependsOn: value })} disabled={saving} placeholder="api, postgres" />
        <Field label="Image" value={form.image} onChange={(value) => update({ image: value })} mono disabled={saving} placeholder="postgres:16" />
        <Field label="Compose service" value={form.composeService} onChange={(value) => update({ composeService: value })} mono disabled={saving} placeholder="postgres" />
        <Field label="Compose file" value={form.composeFile} onChange={(value) => update({ composeFile: value })} mono wide disabled={saving} placeholder="generated if empty" />
        <Field label="Health path" value={form.healthcheckPath} onChange={(value) => update({ healthcheckPath: value })} disabled={saving} placeholder="/" />
        <Field label="Health status" value={form.healthcheckStatus} onChange={(value) => update({ healthcheckStatus: value })} type="number" disabled={saving} placeholder="200" />
        <Field label="Domains" value={form.domains} onChange={(value) => update({ domains: value })} disabled={saving} placeholder="local.test" />
        <Field label="Source repo" value={form.sourceRepo} onChange={(value) => update({ sourceRepo: value })} disabled={saving} placeholder="owner/repo" />
        <Field label="Source branch" value={form.sourceBranch} onChange={(value) => update({ sourceBranch: value })} disabled={saving} placeholder="main" />
        <TextAreaField label="Env" value={form.env} onChange={(value) => update({ env: value })} mono disabled={saving} placeholder={"NODE_ENV=development"} />
        <TextAreaField label="Volumes" value={form.volumes} onChange={(value) => update({ volumes: value })} mono disabled={saving} placeholder={"postgres_data:/var/lib/postgresql/data"} />
        <label className={`flex items-center justify-between rounded-md bg-surface-raised px-3 py-2 ${INSET_RING} ${saving ? "opacity-60" : ""}`}>
          <span>
            <span className="block text-xs font-bold">Enabled</span>
            <span className="text-[11px] text-muted">Included in local runner</span>
          </span>
          <input checked={form.enabled} onChange={(event) => update({ enabled: event.target.checked })} disabled={saving} type="checkbox" className="h-4 w-4 accent-[var(--accent)]" />
        </label>
        <label className={`flex items-center justify-between rounded-md bg-surface-raised px-3 py-2 ${INSET_RING} ${saving ? "opacity-60" : ""}`}>
          <span>
            <span className="block text-xs font-bold">Internal service</span>
            <span className="text-[11px] text-muted">Do not expose host port in generated Compose</span>
          </span>
          <input checked={form.internal} onChange={(event) => update({ internal: event.target.checked })} disabled={saving} type="checkbox" className="h-4 w-4 accent-[var(--accent)]" />
        </label>
      </div>
    </form>
  );
}

function TextAreaField({ disabled, label, mono, onChange, placeholder, value }: { disabled?: boolean; label: string; mono?: boolean; onChange: (value: string) => void; placeholder?: string; value: string }) {
  return (
    <label className="md:col-span-2">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        rows={3}
        className={`w-full resize-y rounded-xl bg-surface-raised px-3 py-2 text-sm text-foreground outline-none ${INSET_RING} transition focus:shadow-[rgb(18,18,18)_0px_1px_0px,rgb(30,215,96)_0px_0px_0px_1px_inset] disabled:opacity-55 ${mono ? "font-mono text-xs" : ""}`}
      />
    </label>
  );
}

function Field({
  disabled,
  error,
  label,
  mono,
  onChange,
  placeholder,
  required,
  type = "text",
  value,
  wide
}: {
  disabled?: boolean;
  error?: string;
  label: string;
  mono?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "md:col-span-2" : undefined}>
      <span className="mb-1 flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
        <span>{label}</span>
        {error ? <span className="normal-case tracking-normal text-negative">{error}</span> : null}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        type={type}
        className={`h-10 w-full rounded-full bg-surface-raised px-3 text-sm text-foreground outline-none ${error ? "shadow-[rgb(18,18,18)_0px_1px_0px,rgb(243,114,127)_0px_0px_0px_1px_inset]" : INSET_RING} transition focus:shadow-[rgb(18,18,18)_0px_1px_0px,rgb(30,215,96)_0px_0px_0px_1px_inset] disabled:opacity-55 ${mono ? "font-mono text-xs" : ""}`}
      />
    </label>
  );
}

function SelectField({ disabled, label, onChange, value, values }: { disabled?: boolean; label: string; onChange: (value: string) => void; value: string; values: string[] }) {
  return (
    <label>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`h-10 w-full rounded-full bg-surface-raised px-3 text-sm text-foreground outline-none ${INSET_RING} transition focus:shadow-[rgb(18,18,18)_0px_1px_0px,rgb(30,215,96)_0px_0px_0px_1px_inset] disabled:opacity-55`}
      >
        {values.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </label>
  );
}

function RoundAction({ active, disabled, label, onClick }: { active?: boolean; disabled?: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-8 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING} ${active ? "bg-accent text-black" : "bg-surface-raised text-foreground hover:text-accent"}`}
    >
      {active ? "Working" : label}
    </button>
  );
}

function PillButton({ children, disabled, onClick, strong, type = "button" }: { children: ReactNode; disabled?: boolean; onClick?: () => void; strong?: boolean; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-8 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING} ${strong ? "bg-accent text-black hover:scale-[1.02]" : "bg-surface-raised text-foreground hover:text-accent"}`}
    >
      {children}
    </button>
  );
}

function ActionLink({ children, href }: { children: ReactNode; href: string | null }) {
  return (
    <a
      href={href || undefined}
      target="_blank"
      rel="noreferrer"
      aria-disabled={!href}
      className={`inline-flex min-h-8 items-center justify-center rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition ${FOCUS_RING} ${href ? "bg-surface-raised text-foreground hover:text-accent active:scale-[0.98]" : "pointer-events-none bg-surface-raised text-muted opacity-40"}`}
    >
      {children}
    </a>
  );
}

function NavItem({ active, disabled, dot, label }: { active?: boolean; disabled?: boolean; dot?: boolean; label: string }) {
  return (
    <div className={`flex items-center justify-between rounded-full px-3 py-2 text-sm ${active ? "bg-surface-raised font-bold text-foreground" : disabled ? "text-muted/45" : "text-muted"}`}>
      <span>{label}</span>
      {dot ? <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" /> : null}
    </div>
  );
}

function MobileNavItem({ active, disabled, label, status }: { active?: boolean; disabled?: boolean; label: string; status?: boolean }) {
  return (
    <div className={`flex h-10 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-surface-raised text-foreground" : disabled ? "text-muted/50" : "text-muted"}`}>
      {status != null ? <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${status ? "bg-accent" : "bg-negative"}`} aria-hidden="true" /> : null}
      {label}
    </div>
  );
}

function MetricPill({ accent, label, value }: { accent?: boolean; label: string; value: string }) {
  return (
    <div className={`rounded-full bg-surface-raised px-3 py-1.5 text-xs ${INSET_RING}`}>
      <span className={accent ? "font-bold text-accent" : "font-bold text-foreground"}>{value}</span>
      <span className="ml-1 text-muted">{label}</span>
    </div>
  );
}

function ResourceSection({ count, title }: { count: number; title: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 bg-black/20 px-4 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{title}</p>
      <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-bold text-muted">{count}</span>
    </div>
  );
}

function ServiceEmpty() {
  return (
    <div className="border-b border-white/5 px-4 py-4 text-sm text-muted">
      No local services registered.
    </div>
  );
}

function Meta({ label, mono, value, wide }: { label: string; mono?: boolean; value: string; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className={`mt-1 text-foreground ${mono ? "break-all font-mono text-[11px]" : "break-words text-xs"}`}>{value}</dd>
    </div>
  );
}

function Alert({ message, title }: { message: string; title: string }) {
  return (
    <div className="border-b border-negative/20 bg-negative/10 px-4 py-3">
      <p className="text-sm font-bold text-negative">{title}</p>
      <p className="mt-0.5 text-sm text-[#d0d0d0]">{message}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-2 p-3 sm:p-4">
      {[0, 1, 2].map((item) => (
        <div key={item} className="grid h-[104px] animate-pulse gap-3 rounded-md bg-white/[0.035] p-3 sm:h-[76px] sm:grid-cols-[minmax(210px,1fr)_100px_1fr]">
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-full bg-white/[0.07]" />
            <span className="space-y-2">
              <span className="block h-3 w-32 rounded-full bg-white/[0.07]" />
              <span className="block h-2 w-44 rounded-full bg-white/[0.05]" />
            </span>
          </div>
          <span className="h-7 rounded-full bg-white/[0.06]" />
          <span className="h-7 rounded-full bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ connected, onAdd }: { connected: boolean; onAdd: () => void }) {
  return (
    <div className="px-4 py-12 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-surface-raised text-sm font-black text-muted">R</div>
      <p className="mt-3 text-sm font-bold">No local apps registered</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">Create a command app here or sync an existing `routely.yml` registry.</p>
      <div className="mt-4 flex justify-center">
        <PillButton onClick={onAdd} strong disabled={!connected}>Add app</PillButton>
      </div>
    </div>
  );
}
