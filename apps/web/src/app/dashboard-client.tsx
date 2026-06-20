"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Alert as UiAlert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState as UiEmptyState } from "@/components/ui/empty-state";
import { Field as UiField, TextAreaField as UiTextAreaField } from "@/components/ui/field";
import { Select as UiSelect } from "@/components/ui/select";
import { SkeletonRows } from "@/components/ui/skeleton";
import { DashboardShell } from "@/components/dashboard/shell";
import { ModuleHeader } from "@/components/dashboard/module-header";
import type { DashboardModuleKey } from "@/components/dashboard/types";

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
  source?: { type: string | null; repo: string | null; branch: string | null; auto_deploy?: { enabled: boolean; branches: string[] } } | null;
  image?: string | null;
  internal?: boolean;
  volumes?: string[];
  composeFile?: string | null;
  composeService?: string | null;
  needsRestart?: boolean;
  needsRedeploy?: boolean;
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

type DaemonDeployment = {
  id: number;
  appId: number;
  appName: string | null;
  status: string;
  phase: string;
  sourceType: string | null;
  repo: string | null;
  branch: string | null;
  commitSha: string | null;
  imageTag: string | null;
  containerName: string | null;
  previousImageTag: string | null;
  previousContainerName: string | null;
  hostPort: number | null;
  containerPort: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DaemonDeploymentLog = {
  id: number;
  deploymentId: number;
  sequence: number;
  phase: string;
  stream: string;
  message: string;
  createdAt: string;
};

type DeploymentLogsResponse = {
  deployment: DaemonDeployment;
  logs: DaemonDeploymentLog[];
};

type DaemonHealthcheck = {
  id: number;
  appId: number;
  deploymentId: number | null;
  target: string;
  path: string | null;
  expectedStatus: number | null;
  status: string;
  httpStatus: number | null;
  responseTimeMs: number | null;
  message: string | null;
  checkedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DaemonMetricSample = {
  id: number;
  appId: number | null;
  deploymentId: number | null;
  scope: string;
  cpuPercent: number | null;
  memoryBytes: number | null;
  memoryLimitBytes: number | null;
  diskUsedBytes: number | null;
  diskTotalBytes: number | null;
  networkRxBytes: number | null;
  networkTxBytes: number | null;
  message: string | null;
  sampledAt: string;
};

type DaemonDatabase = {
  id: number;
  appId: number | null;
  appName: string | null;
  name: string;
  type: string;
  status: string;
  internal: boolean;
  image: string | null;
  port: number | null;
  composeService: string | null;
  composeFile: string | null;
  volumeName: string | null;
  envKeys: string[];
  createdAt: string;
  updatedAt: string;
};

type DaemonBackupJob = {
  id: number;
  databaseId: number;
  databaseName: string | null;
  databaseType: string | null;
  enabled: boolean;
  schedule: string | null;
  retentionDays: number;
  localDir: string | null;
  lastRunStatus: string | null;
  lastRunAt: string | null;
  lastRunMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

type DaemonBackupRun = {
  id: number;
  backupJobId: number;
  databaseId: number;
  databaseName: string | null;
  databaseType: string | null;
  status: string;
  trigger: string;
  filePath: string | null;
  sizeBytes: number | null;
  message: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AppHealthResponse = {
  app: DaemonApp;
  latestDeployment: DaemonDeployment | null;
  health: { status: string; checks: DaemonHealthcheck[] };
  healthcheck?: DaemonHealthcheck;
  error?: string | null;
};

type AppMetricsResponse = {
  app: DaemonApp;
  metrics: DaemonMetricSample[];
  error?: string | null;
};

type MetricsResponse = {
  metrics: DaemonMetricSample[];
  error?: string | null;
};

type DaemonAppEnvVar = {
  id: number;
  appId: number;
  key: string;
  value: string | null;
  displayValue: string;
  isSecret: boolean;
  scope: string;
  needsRestart: boolean;
  needsRedeploy: boolean;
  createdAt: string;
  updatedAt: string;
};

type AppEnvResponse = {
  app: DaemonApp;
  env: {
    vars: DaemonAppEnvVar[];
    pending: { count: number; needsRestart: boolean; needsRedeploy: boolean };
  };
  envVar?: DaemonAppEnvVar;
  error?: string | null;
};

type DaemonDomain = {
  id: number;
  appId: number;
  appName: string | null;
  hostname: string;
  status: string;
  dnsStatus: string;
  tlsStatus: string;
  targetPort: number | null;
  verificationMessage: string | null;
  lastVerifiedAt: string | null;
  appType?: string | null;
  appInternal?: boolean;
  createdAt: string;
  updatedAt: string;
};

type DaemonProxyRoute = {
  id: number;
  domainId: number;
  appId: number;
  appName: string | null;
  deploymentId: number | null;
  hostname: string;
  routerName: string;
  serviceName: string;
  targetUrl: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type DaemonGithubInstallation = {
  id: number;
  installationId: number;
  accountLogin: string;
  accountType: string | null;
  status: string;
  events: string[];
  updatedAt: string;
};

type DaemonGithubRepository = {
  id: number;
  installationId: number | null;
  repositoryId: number | null;
  fullName: string;
  owner: string;
  name: string;
  private: boolean;
  defaultBranch: string | null;
  htmlUrl: string | null;
  connectedAppId: number | null;
  connectedAppName: string | null;
  selectedBranch: string | null;
  autoDeployEnabled: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DaemonGithubDelivery = {
  deliveryId: string;
  event: string;
  action: string | null;
  status: string;
  signatureValid: boolean;
  appId: number | null;
  appName: string | null;
  deploymentId: number | null;
  repo: string | null;
  branch: string | null;
  commitSha: string | null;
  message: string | null;
  receivedAt: string;
  processedAt: string | null;
  updatedAt: string;
};

type DaemonGithubStatus = {
  configured: boolean;
  appId: string | null;
  clientId: string | null;
  webhookSecretConfigured: boolean;
  privateKeyConfigured: boolean;
  installations: DaemonGithubInstallation[];
  repositories: DaemonGithubRepository[];
  deliveries: DaemonGithubDelivery[];
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

type DeploymentsResponse = {
  deployments: DaemonDeployment[];
  error?: string | null;
};

type DomainsResponse = {
  rootDomain: string | null;
  serverPublicIp: string | null;
  domains: DaemonDomain[];
  error?: string | null;
};

type ProxyRoutesResponse = {
  routes: DaemonProxyRoute[];
  config: Record<string, unknown>;
  error?: string | null;
};

type GithubStatusResponse = {
  github: DaemonGithubStatus | null;
  error?: string | null;
};

type DatabasesResponse = {
  databases: DaemonDatabase[];
  error?: string | null;
};

type BackupsResponse = {
  jobs: DaemonBackupJob[];
  runs: DaemonBackupRun[];
  job?: DaemonBackupJob;
  run?: DaemonBackupRun;
  error?: string | null;
};

type DaemonNotificationChannel = {
  id: number;
  name: string;
  type: string;
  enabled: boolean;
  events: string[];
  target: string | null;
  createdAt: string;
  updatedAt: string;
};

type DaemonNotificationAttempt = {
  id: number;
  channelId: number | null;
  channelName: string | null;
  channelType: string | null;
  event: string;
  status: string;
  httpStatus: number | null;
  message: string | null;
  target: string | null;
  resourceType: string | null;
  resourceId: number | null;
  createdAt: string;
  finishedAt: string | null;
};

type NotificationsResponse = {
  channels: DaemonNotificationChannel[];
  attempts: DaemonNotificationAttempt[];
  channel?: DaemonNotificationChannel;
  attempt?: DaemonNotificationAttempt;
  error?: string | null;
};

type AppAction = "start" | "stop" | "restart";
type FormMode = "create" | "edit";
type ModuleKey = DashboardModuleKey;
type InspectorTab = "overview" | "health" | "metrics" | "deployments" | "domains" | "proxy" | "github" | "env" | "logs" | "config";

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
const PANEL_SHADOW = "shadow-[var(--panel-shadow)]";
const INSET_RING = "shadow-[var(--inset-border)]";
const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

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
  return <Badge status={status} variant="status">{status}</Badge>;
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

function appCanRedeploy(app: DaemonApp): boolean {
  return app.driver === "dockerfile";
}

function pendingStateLabel(app: DaemonApp): string {
  const restart = app.needsRestart;
  const redeploy = app.needsRedeploy && appCanRedeploy(app);
  const localOnly = app.needsRedeploy && !appCanRedeploy(app);
  if (restart && redeploy) return "restart + redeploy needed";
  if (restart) return "restart needed";
  if (redeploy) return "redeploy needed";
  if (localOnly) return "local restart applies";
  return "clean";
}

function envRedeployLabel(app: DaemonApp, needsRedeploy?: boolean): { label: string; status: "ok" | "warn" } {
  if (!needsRedeploy) return { label: "clean", status: "ok" };
  return appCanRedeploy(app)
    ? { label: "needed", status: "warn" }
    : { label: "not deployable", status: "ok" };
}

function shortPath(path: string | null): string {
  if (!path) return "-";
  const parts = path.split("/").filter(Boolean);
  return parts.length > 3 ? `.../${parts.slice(-3).join("/")}` : path;
}

function formatBytes(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let amount = value;
  let index = 0;
  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index += 1;
  }
  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)}${units[index]}`;
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
  const [activeModule, setActiveModule] = useState<ModuleKey>("overview");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [serverStatus, setServerStatus] = useState<DaemonServerStatus | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [apps, setApps] = useState<DaemonApp[]>([]);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<DaemonDeployment[]>([]);
  const [deploymentsError, setDeploymentsError] = useState<string | null>(null);
  const [domains, setDomains] = useState<DaemonDomain[]>([]);
  const [domainsMeta, setDomainsMeta] = useState<{ rootDomain: string | null; serverPublicIp: string | null }>({ rootDomain: null, serverPublicIp: null });
  const [domainsError, setDomainsError] = useState<string | null>(null);
  const [proxyRoutes, setProxyRoutes] = useState<DaemonProxyRoute[]>([]);
  const [proxyError, setProxyError] = useState<string | null>(null);
  const [github, setGithub] = useState<DaemonGithubStatus | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [hostMetrics, setHostMetrics] = useState<DaemonMetricSample[]>([]);
  const [hostMetricsError, setHostMetricsError] = useState<string | null>(null);
  const [githubSaving, setGithubSaving] = useState(false);
  const [githubForm, setGithubForm] = useState({ appId: "", fullName: "", branch: "main", autoDeploy: true });
  const [databases, setDatabases] = useState<DaemonDatabase[]>([]);
  const [databasesError, setDatabasesError] = useState<string | null>(null);
  const [databaseActionById, setDatabaseActionById] = useState<Record<number, string | null>>({});
  const [databaseSaving, setDatabaseSaving] = useState(false);
  const [databaseForm, setDatabaseForm] = useState({ type: "postgres", name: "postgres" });
  const [backupJobs, setBackupJobs] = useState<DaemonBackupJob[]>([]);
  const [backupRuns, setBackupRuns] = useState<DaemonBackupRun[]>([]);
  const [backupsError, setBackupsError] = useState<string | null>(null);
  const [backupActionById, setBackupActionById] = useState<Record<number, string | null>>({});
  const [backupForm, setBackupForm] = useState({ databaseId: "", schedule: "0 2 * * *", retentionDays: "7" });
  const [notificationChannels, setNotificationChannels] = useState<DaemonNotificationChannel[]>([]);
  const [notificationAttempts, setNotificationAttempts] = useState<DaemonNotificationAttempt[]>([]);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [notificationForm, setNotificationForm] = useState({ type: "webhook", name: "deploy-alerts", url: "", botToken: "", chatId: "", events: "deploy_succeeded,deploy_failed,backup_failed" });
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainActionByHostname, setDomainActionByHostname] = useState<Record<string, string | null>>({});
  const [domainForm, setDomainForm] = useState({ appId: "", hostname: "" });
  const [rootDomainInput, setRootDomainInput] = useState("");
  const [deploymentLogs, setDeploymentLogs] = useState<DeploymentLogsResponse | null>(null);
  const [deploymentLogsLoading, setDeploymentLogsLoading] = useState(false);
  const [deploymentLogsError, setDeploymentLogsError] = useState<string | null>(null);
  const [deployingByAppId, setDeployingByAppId] = useState<Record<number, boolean>>({});
  const [deployError, setDeployError] = useState<string | null>(null);
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
      const [healthRes, appsRes, serverRes, deploymentsRes, domainsRes, proxyRes, githubRes, metricsRes, databasesRes, backupsRes, notificationsRes] = await Promise.all([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/api/apps", { cache: "no-store" }),
        fetch("/api/server/status", { cache: "no-store" }),
        fetch("/api/deployments", { cache: "no-store" }),
        fetch("/api/domains", { cache: "no-store" }),
        fetch("/api/proxy/routes", { cache: "no-store" }),
        fetch("/api/github/status", { cache: "no-store" }),
        fetch("/api/metrics?refresh=false", { cache: "no-store" }),
        fetch("/api/databases", { cache: "no-store" }),
        fetch("/api/backups", { cache: "no-store" }),
        fetch("/api/notifications", { cache: "no-store" })
      ]);

      const healthData = (await healthRes.json()) as HealthResponse;
      const appsData = (await appsRes.json()) as AppsResponse;
      const serverData = (await serverRes.json().catch(() => ({ server: null, error: "Server status unavailable." }))) as ServerStatusResponse;
      const deploymentsData = (await deploymentsRes.json().catch(() => ({ deployments: [], error: "Deployments unavailable." }))) as DeploymentsResponse;
      const domainsData = (await domainsRes.json().catch(() => ({ rootDomain: null, serverPublicIp: null, domains: [], error: "Domains unavailable." }))) as DomainsResponse;
      const proxyData = (await proxyRes.json().catch(() => ({ routes: [], config: {}, error: "Proxy routes unavailable." }))) as ProxyRoutesResponse;
      const githubData = (await githubRes.json().catch(() => ({ github: null, error: "GitHub status unavailable." }))) as GithubStatusResponse;
      const metricsData = (await metricsRes.json().catch(() => ({ metrics: [], error: "Metrics unavailable." }))) as MetricsResponse;
      const databasesData = (await databasesRes.json().catch(() => ({ databases: [], error: "Databases unavailable." }))) as DatabasesResponse;
      const backupsData = (await backupsRes.json().catch(() => ({ jobs: [], runs: [], error: "Backups unavailable." }))) as BackupsResponse;
      const notificationsData = (await notificationsRes.json().catch(() => ({ channels: [], attempts: [], error: "Notifications unavailable." }))) as NotificationsResponse;

      if (!mounted.current) return;

      setHealth(healthData);
      setServerStatus(serverData.server || healthData.health?.server || null);
      setServerError(serverData.error || null);
      setApps(appsData.apps || []);
      setAppsError(appsData.error);
      setDeployments(deploymentsData.deployments || []);
      setDeploymentsError(deploymentsData.error || null);
      setDomains(domainsData.domains || []);
      setDomainsMeta({ rootDomain: domainsData.rootDomain || null, serverPublicIp: domainsData.serverPublicIp || null });
      setDomainsError(domainsData.error || null);
      setProxyRoutes(proxyData.routes || []);
      setProxyError(proxyData.error || null);
      setGithub(githubData.github || null);
      setGithubError(githubData.error || null);
      setHostMetrics(metricsData.metrics || []);
      setHostMetricsError(metricsData.error || null);
      setDatabases(databasesData.databases || []);
      setDatabasesError(databasesData.error || null);
      setBackupJobs(backupsData.jobs || []);
      setBackupRuns(backupsData.runs || []);
      setBackupsError(backupsData.error || null);
      setNotificationChannels(notificationsData.channels || []);
      setNotificationAttempts(notificationsData.attempts || []);
      setNotificationsError(notificationsData.error || null);
      setRootDomainInput((current) => current || domainsData.rootDomain || "");
      setGithubForm((current) => ({ ...current, appId: current.appId || String(appsData.apps?.find((app) => app.driver === "dockerfile")?.id || "") }));
      setBackupForm((current) => ({ ...current, databaseId: current.databaseId || String(databasesData.databases?.[0]?.id || "") }));
      setLastUpdated(new Date().toISOString());
      setSelectedAppId((current) => current ?? appsData.apps?.[0]?.id ?? null);
    } catch {
      if (!mounted.current) return;
      setHealth({ connected: false, daemonUrl: "", error: "Dashboard could not reach its API." });
      setServerStatus(null);
      setServerError("Dashboard could not reach its API.");
      setAppsError("Dashboard could not reach its API.");
      setDeploymentsError("Dashboard could not reach its API.");
      setDomainsError("Dashboard could not reach its API.");
      setProxyError("Dashboard could not reach its API.");
      setGithubError("Dashboard could not reach its API.");
      setHostMetricsError("Dashboard could not reach its API.");
      setDatabasesError("Dashboard could not reach its API.");
      setBackupsError("Dashboard could not reach its API.");
      setNotificationsError("Dashboard could not reach its API.");
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

  const selectedDeployments = useMemo(() => {
    if (!selectedAppId) return [];
    return deployments.filter((deployment) => deployment.appId === selectedAppId);
  }, [deployments, selectedAppId]);

  const latestDeploymentByAppId = useMemo(() => {
    const latest = new Map<number, DaemonDeployment>();
    for (const deployment of deployments) {
      if (!latest.has(deployment.appId)) {
        latest.set(deployment.appId, deployment);
      }
    }
    return latest;
  }, [deployments]);

  const domainsByAppId = useMemo(() => {
    const grouped = new Map<number, DaemonDomain[]>();
    for (const domain of domains) {
      const items = grouped.get(domain.appId) || [];
      items.push(domain);
      grouped.set(domain.appId, items);
    }
    return grouped;
  }, [domains]);

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

  const loadDeploymentLogs = useCallback(async (deployment: DaemonDeployment) => {
    setDeploymentLogsLoading(true);
    setDeploymentLogsError(null);

    try {
      const response = await fetch(`/api/deployments/${deployment.id}/logs`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      setDeploymentLogs((await response.json()) as DeploymentLogsResponse);
    } catch (error) {
      setDeploymentLogsError(error instanceof Error ? error.message : "Could not load deployment logs.");
    } finally {
      setDeploymentLogsLoading(false);
    }
  }, []);

  const deployApp = useCallback(async (app: DaemonApp) => {
    setDeployError(null);
    setDeployingByAppId((current) => ({ ...current, [app.id]: true }));

    try {
      const response = await fetch(`/api/apps/${app.id}/deployments`, {
        method: "POST",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = (await response.json()) as { deployment: DaemonDeployment };
      setDeployments((current) => [data.deployment, ...current.filter((item) => item.id !== data.deployment.id)]);
      setSelectedAppId(app.id);
      await loadDeploymentLogs(data.deployment);
      void poll();
    } catch (error) {
      setDeployError(error instanceof Error ? error.message : `Could not deploy ${app.name}.`);
    } finally {
      setDeployingByAppId((current) => ({ ...current, [app.id]: false }));
    }
  }, [loadDeploymentLogs, poll]);

  const saveRootDomain = useCallback(async () => {
    if (!rootDomainInput.trim()) return;
    setDomainsError(null);
    setDomainSaving(true);
    try {
      const response = await fetch("/api/domains/root", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain: rootDomainInput.trim() })
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { rootDomain: string };
      setDomainsMeta((current) => ({ ...current, rootDomain: data.rootDomain }));
      setRootDomainInput(data.rootDomain);
      void poll();
    } catch (error) {
      setDomainsError(error instanceof Error ? error.message : "Could not save root domain.");
    } finally {
      setDomainSaving(false);
    }
  }, [poll, rootDomainInput]);

  const addDomain = useCallback(async () => {
    if (!domainForm.appId || !domainForm.hostname.trim()) {
      setDomainsError("Choose an app and enter a hostname.");
      return;
    }
    setDomainsError(null);
    setDomainSaving(true);
    try {
      const response = await fetch("/api/domains", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appId: Number(domainForm.appId), hostname: domainForm.hostname.trim() })
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { domain: DaemonDomain };
      setDomains((current) => [...current.filter((item) => item.id !== data.domain.id), data.domain].sort((a, b) => a.hostname.localeCompare(b.hostname)));
      setDomainForm({ appId: domainForm.appId, hostname: "" });
      void poll();
    } catch (error) {
      setDomainsError(error instanceof Error ? error.message : "Could not add domain.");
    } finally {
      setDomainSaving(false);
    }
  }, [domainForm.appId, domainForm.hostname, poll]);

  const verifyDomain = useCallback(async (domain: DaemonDomain) => {
    setDomainsError(null);
    setDomainActionByHostname((current) => ({ ...current, [domain.hostname]: "verify" }));
    try {
      const response = await fetch(`/api/domains/${encodeURIComponent(domain.hostname)}/verify`, {
        method: "POST",
        cache: "no-store"
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { domain: DaemonDomain };
      setDomains((current) => current.map((item) => (item.id === data.domain.id ? data.domain : item)));
      void poll();
    } catch (error) {
      setDomainsError(error instanceof Error ? error.message : `Could not verify ${domain.hostname}.`);
    } finally {
      setDomainActionByHostname((current) => ({ ...current, [domain.hostname]: null }));
    }
  }, [poll]);

  const removeDomain = useCallback(async (domain: DaemonDomain) => {
    setDomainsError(null);
    setDomainActionByHostname((current) => ({ ...current, [domain.hostname]: "remove" }));
    try {
      const response = await fetch(`/api/domains/${encodeURIComponent(domain.hostname)}`, {
        method: "DELETE",
        cache: "no-store"
      });
      if (!response.ok) throw new Error(await readError(response));
      setDomains((current) => current.filter((item) => item.id !== domain.id));
      void poll();
    } catch (error) {
      setDomainsError(error instanceof Error ? error.message : `Could not remove ${domain.hostname}.`);
    } finally {
      setDomainActionByHostname((current) => ({ ...current, [domain.hostname]: null }));
    }
  }, [poll]);

  const connectGithubRepository = useCallback(async () => {
    if (!githubForm.appId || !githubForm.fullName.trim()) {
      setGithubError("Choose an app and enter a repository as owner/name.");
      return;
    }
    setGithubError(null);
    setGithubSaving(true);
    try {
      const response = await fetch(`/api/apps/${encodeURIComponent(githubForm.appId)}/github`, {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: githubForm.fullName.trim(),
          branch: githubForm.branch.trim() || "main",
          autoDeployEnabled: githubForm.autoDeploy
        })
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { app: DaemonApp; repository: DaemonGithubRepository };
      replaceApp(data.app);
      setSelectedAppId(data.app.id);
      setGithubForm((current) => ({ ...current, fullName: data.repository.fullName, branch: data.repository.selectedBranch || data.repository.defaultBranch || current.branch }));
      void poll();
    } catch (error) {
      setGithubError(error instanceof Error ? error.message : "Could not connect GitHub repository.");
    } finally {
      setGithubSaving(false);
    }
  }, [githubForm.appId, githubForm.autoDeploy, githubForm.branch, githubForm.fullName, poll, replaceApp]);

  const createDatabase = useCallback(async () => {
    if (!databaseForm.name.trim()) {
      setDatabasesError("Database name is required.");
      return;
    }
    setDatabaseSaving(true);
    setDatabasesError(null);
    try {
      const response = await fetch("/api/databases", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: databaseForm.type, name: databaseForm.name.trim() })
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { app: DaemonApp; database: DaemonDatabase };
      setDatabases((current) => [...current.filter((item) => item.id !== data.database.id), data.database].sort((a, b) => a.name.localeCompare(b.name)));
      setApps((current) => [...current.filter((item) => item.id !== data.app.id), data.app].sort((a, b) => a.name.localeCompare(b.name)));
      setBackupForm((current) => ({ ...current, databaseId: String(data.database.id) }));
      void poll();
    } catch (error) {
      setDatabasesError(error instanceof Error ? error.message : "Could not create database.");
    } finally {
      setDatabaseSaving(false);
    }
  }, [databaseForm.name, databaseForm.type, poll]);

  const runDatabaseAction = useCallback(async (database: DaemonDatabase, action: "start" | "stop") => {
    setDatabasesError(null);
    setDatabaseActionById((current) => ({ ...current, [database.id]: action }));
    try {
      const response = await fetch(`/api/databases/${database.id}/${action}`, { method: "POST", cache: "no-store" });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { database: DaemonDatabase };
      setDatabases((current) => current.map((item) => (item.id === data.database.id ? data.database : item)));
      void poll();
    } catch (error) {
      setDatabasesError(error instanceof Error ? error.message : `Could not ${action} ${database.name}.`);
    } finally {
      setDatabaseActionById((current) => ({ ...current, [database.id]: null }));
    }
  }, [poll]);

  const enableBackup = useCallback(async () => {
    if (!backupForm.databaseId) {
      setBackupsError("Choose a database before enabling backups.");
      return;
    }
    setBackupsError(null);
    try {
      const response = await fetch("/api/backups", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ databaseId: Number(backupForm.databaseId), schedule: backupForm.schedule.trim() || null, retentionDays: Number(backupForm.retentionDays || 7) })
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as BackupsResponse;
      setBackupJobs(data.jobs || []);
      setBackupRuns(data.runs || []);
      void poll();
    } catch (error) {
      setBackupsError(error instanceof Error ? error.message : "Could not enable backups.");
    }
  }, [backupForm.databaseId, backupForm.retentionDays, backupForm.schedule, poll]);

  const runBackup = useCallback(async (job: DaemonBackupJob) => {
    setBackupsError(null);
    setBackupActionById((current) => ({ ...current, [job.id]: "run" }));
    try {
      const response = await fetch(`/api/backups/${job.id}/run`, {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trigger: "manual" })
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as BackupsResponse;
      setBackupJobs(data.jobs || []);
      setBackupRuns(data.runs || []);
      void poll();
    } catch (error) {
      setBackupsError(error instanceof Error ? error.message : `Could not run backup for ${job.databaseName || job.databaseId}.`);
    } finally {
      setBackupActionById((current) => ({ ...current, [job.id]: null }));
    }
  }, [poll]);

  const toggleBackup = useCallback(async (job: DaemonBackupJob, enabled: boolean) => {
    setBackupsError(null);
    setBackupActionById((current) => ({ ...current, [job.id]: enabled ? "enable" : "disable" }));
    try {
      const response = await fetch(`/api/backups/${job.id}`, {
        method: "PATCH",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled })
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as BackupsResponse;
      setBackupJobs(data.jobs || []);
      setBackupRuns(data.runs || []);
    } catch (error) {
      setBackupsError(error instanceof Error ? error.message : "Could not update backup job.");
    } finally {
      setBackupActionById((current) => ({ ...current, [job.id]: null }));
    }
  }, []);

  const applyNotifications = useCallback((data: NotificationsResponse) => {
    setNotificationChannels(data.channels || []);
    setNotificationAttempts(data.attempts || []);
    setNotificationsError(data.error || null);
  }, []);

  const createNotificationChannel = useCallback(async () => {
    setNotificationSaving(true);
    setNotificationsError(null);
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: notificationForm.type,
          name: notificationForm.name.trim(),
          url: notificationForm.url.trim() || undefined,
          botToken: notificationForm.botToken.trim() || undefined,
          chatId: notificationForm.chatId.trim() || undefined,
          events: notificationForm.events.split(",").map((event) => event.trim()).filter(Boolean)
        })
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as NotificationsResponse;
      applyNotifications(data);
      setNotificationForm((current) => ({ ...current, url: "", botToken: "", chatId: "" }));
    } catch (error) {
      setNotificationsError(error instanceof Error ? error.message : "Could not save notification channel.");
    } finally {
      setNotificationSaving(false);
    }
  }, [applyNotifications, notificationForm.botToken, notificationForm.chatId, notificationForm.events, notificationForm.name, notificationForm.type, notificationForm.url]);

  const testNotificationChannel = useCallback(async (channel: DaemonNotificationChannel) => {
    setNotificationsError(null);
    try {
      const response = await fetch(`/api/notifications/${channel.id}/test`, {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as NotificationsResponse;
      applyNotifications(data);
    } catch (error) {
      setNotificationsError(error instanceof Error ? error.message : "Notification test failed.");
    }
  }, [applyNotifications]);

  const toggleNotificationChannel = useCallback(async (channel: DaemonNotificationChannel, enabled: boolean) => {
    setNotificationsError(null);
    try {
      const response = await fetch(`/api/notifications/${channel.id}`, {
        method: "PATCH",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled })
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as NotificationsResponse;
      applyNotifications(data);
    } catch (error) {
      setNotificationsError(error instanceof Error ? error.message : "Could not update notification channel.");
    }
  }, [applyNotifications]);

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
  const dockerfileApps = appResources.filter((app) => app.driver === "dockerfile");
  const appModuleTabs: Record<"env" | "logs" | "health", InspectorTab> = { env: "env", logs: "logs", health: "health" };

  return (
    <DashboardShell
      activeModule={activeModule}
      onSelect={setActiveModule}
      status={{
        connected,
        daemonUrl: health?.daemonUrl || "-",
        loading,
        mode: serverStatus?.mode || "local",
        refreshing,
        updated: timeAgo(lastUpdated),
        workspace,
        onRefresh: () => void poll(true)
      }}
    >
            {activeModule === "overview" ? (
              <OverviewPanel
                apps={apps}
                backupJobs={backupJobs}
                backupRuns={backupRuns}
                deployments={deployments}
                healthchecksUnavailable={appsError || deploymentsError || backupsError}
                onSelect={setActiveModule}
                server={serverStatus}
              />
            ) : null}

            {activeModule === "overview" ? (
              <ServerFoundationPanel
                connected={connected}
                error={serverError}
                server={serverStatus}
              />
            ) : null}

            {activeModule === "deployments" ? <DeploymentsModule apps={dockerfileApps} connected={connected} deployments={deployments} deployingByAppId={deployingByAppId} error={deployError || deploymentsError} latestByAppId={latestDeploymentByAppId} server={serverStatus} onDeploy={(app) => void deployApp(app)} onLogs={(deployment) => void loadDeploymentLogs(deployment)} /> : null}

            {activeModule === "domains" ? <DomainsModule apps={dockerfileApps} connected={connected} domains={domains} domainsError={domainsError || proxyError} domainsMeta={domainsMeta} domainActionByHostname={domainActionByHostname} domainForm={domainForm} domainSaving={domainSaving} proxyRoutes={proxyRoutes} rootDomainInput={rootDomainInput} onAddDomain={() => void addDomain()} onDomainFormChange={setDomainForm} onRemoveDomain={(domain) => void removeDomain(domain)} onRootDomainChange={setRootDomainInput} onSaveRootDomain={() => void saveRootDomain()} onVerifyDomain={(domain) => void verifyDomain(domain)} /> : null}

            {activeModule === "github" ? <GithubModule apps={dockerfileApps} connected={connected} github={github} githubError={githubError} githubForm={githubForm} githubSaving={githubSaving} onGithubConnect={() => void connectGithubRepository()} onGithubFormChange={setGithubForm} /> : null}

            {activeModule === "databases" ? <DatabasesModule connected={connected} databaseActionById={databaseActionById} databaseForm={databaseForm} databaseSaving={databaseSaving} databases={databases} databasesError={databasesError} onCreateDatabase={() => void createDatabase()} onDatabaseAction={(database, action) => void runDatabaseAction(database, action)} onDatabaseFormChange={setDatabaseForm} /> : null}

            {activeModule === "backups" ? <BackupsModule backupActionById={backupActionById} backupForm={backupForm} backupJobs={backupJobs} backupRuns={backupRuns} backupsError={backupsError} connected={connected} databases={databases} onBackupFormChange={setBackupForm} onEnableBackup={() => void enableBackup()} onRunBackup={(job) => void runBackup(job)} onToggleBackup={(job, enabled) => void toggleBackup(job, enabled)} /> : null}

            {activeModule === "settings" ? (
              <NotificationsPanel
                channels={notificationChannels}
                attempts={notificationAttempts}
                connected={connected}
                error={notificationsError}
                form={notificationForm}
                saving={notificationSaving}
                onChange={setNotificationForm}
                onCreate={() => void createNotificationChannel()}
                onTest={(channel) => void testNotificationChannel(channel)}
                onToggle={(channel, enabled) => void toggleNotificationChannel(channel, enabled)}
              />
            ) : null}

            {activeModule === "apps" ? <AppsModule actionByAppId={actionByAppId} actionError={actionError} appResources={appResources} apps={apps} appsError={appsError} connected={connected} disabledCount={disabledCount} form={form} formError={formError} formMode={formMode} formSaving={formSaving} health={health} loading={loading} runningCount={runningCount} selectedAppId={selectedAppId} serviceResources={serviceResources} stoppedCount={stoppedCount} onAction={(app, action) => void runAction(app, action)} onCreate={openCreateForm} onEdit={openEditForm} onFormCancel={() => setFormMode(null)} onFormChange={setForm} onFormSubmit={submitForm} onLogs={(app) => void loadLogs(app)} onSelect={setSelectedAppId} /> : null}

            {activeModule === "apps" || activeModule === "env" || activeModule === "logs" || activeModule === "health" ? <AppOperationsModule activeTab={activeModule === "apps" ? undefined : appModuleTabs[activeModule]} apps={apps} appResources={appResources} app={selectedApp} selectedAppId={selectedAppId} connected={connected} deployments={selectedDeployments} domains={selectedApp ? domainsByAppId.get(selectedApp.id) || [] : []} github={github} deploymentLogs={deploymentLogs} deploymentLogsError={deploymentLogsError} deploymentLogsLoading={deploymentLogsLoading} deploying={selectedApp ? Boolean(deployingByAppId[selectedApp.id]) : false} logs={logs} logsLoading={logsLoading} logsError={logsError} currentAction={selectedApp ? actionByAppId[selectedApp.id] : null} module={activeModule} onAction={selectedApp ? (action) => void runAction(selectedApp, action) : undefined} onDeploy={selectedApp ? () => void deployApp(selectedApp) : undefined} onDeploymentLogs={(deployment) => void loadDeploymentLogs(deployment)} onEdit={selectedApp ? () => openEditForm(selectedApp) : undefined} onLogs={(app) => void loadLogs(app)} onReload={selectedApp ? () => void loadLogs(selectedApp) : undefined} onSelect={setSelectedAppId} /> : null}

            {activeModule === "metrics" ? <MetricsModule app={selectedApp} apps={apps} appResources={appResources} connected={connected} currentAction={selectedApp ? actionByAppId[selectedApp.id] : null} deploymentLogs={deploymentLogs} deploymentLogsError={deploymentLogsError} deploymentLogsLoading={deploymentLogsLoading} deployments={selectedDeployments} domains={selectedApp ? domainsByAppId.get(selectedApp.id) || [] : []} deploying={selectedApp ? Boolean(deployingByAppId[selectedApp.id]) : false} github={github} hostMetrics={hostMetrics} hostMetricsError={hostMetricsError} logs={logs} logsError={logsError} logsLoading={logsLoading} onAction={selectedApp ? (action) => void runAction(selectedApp, action) : undefined} onDeploy={selectedApp ? () => void deployApp(selectedApp) : undefined} onDeploymentLogs={(deployment) => void loadDeploymentLogs(deployment)} onEdit={selectedApp ? () => openEditForm(selectedApp) : undefined} onReload={selectedApp ? () => void loadLogs(selectedApp) : undefined} onSelect={setSelectedAppId} selectedAppId={selectedAppId} /> : null}
    </DashboardShell>
  );
}

function AppsModule({ actionByAppId, actionError, appResources, apps, appsError, connected, disabledCount, form, formError, formMode, formSaving, health, loading, onAction, onCreate, onEdit, onFormCancel, onFormChange, onFormSubmit, onLogs, onSelect, runningCount, selectedAppId, serviceResources, stoppedCount }: { actionByAppId: Record<number, AppAction | null>; actionError: string | null; appResources: DaemonApp[]; apps: DaemonApp[]; appsError: string | null; connected: boolean; disabledCount: number; form: AppFormState; formError: string | null; formMode: FormMode | null; formSaving: boolean; health: HealthResponse | null; loading: boolean; onAction: (app: DaemonApp, action: AppAction) => void; onCreate: () => void; onEdit: (app: DaemonApp) => void; onFormCancel: () => void; onFormChange: (form: AppFormState) => void; onFormSubmit: (event: FormEvent<HTMLFormElement>) => void; onLogs: (app: DaemonApp) => void; onSelect: (id: number) => void; runningCount: number; selectedAppId: number | null; serviceResources: DaemonApp[]; stoppedCount: number }) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW}`}>
      <ModuleHeader module="apps" stats={<><MetricPill label="running" value={`${runningCount}/${apps.length}`} accent /><MetricPill label="services" value={String(serviceResources.length)} /><MetricPill label="stopped" value={String(stoppedCount)} /><MetricPill label="disabled" value={String(disabledCount)} /></>} actions={<PillButton onClick={onCreate} strong disabled={!connected}>Add resource</PillButton>} />

      {!connected && health ? <Alert title="Daemon offline" message={health.error || "Start Routely from the CLI to bring the local control plane online."} /> : null}
      {actionError ? <Alert title="Action failed" message={actionError} /> : null}
      {appsError ? <Alert title="Registry unavailable" message={appsError} /> : null}

      {formMode ? <AppForm mode={formMode} form={form} error={formError} saving={formSaving} onChange={onFormChange} onCancel={onFormCancel} onSubmit={onFormSubmit} /> : null}

      <div className="bg-black/10">
        {loading ? <LoadingRows /> : apps.length === 0 ? <EmptyState connected={connected} onAdd={onCreate} /> : (
          <>
            <ResourceSection title="Apps" count={appResources.length} />
            {appResources.map((app) => <AppRow key={app.id} app={app} active={selectedAppId === app.id} connected={connected} currentAction={actionByAppId[app.id]} onSelect={() => onSelect(app.id)} onLogs={() => onLogs(app)} onEdit={() => onEdit(app)} onAction={(action) => onAction(app, action)} />)}
            <ResourceSection title="Services & databases" count={serviceResources.length} />
            {serviceResources.length === 0 ? <ServiceEmpty /> : null}
            {serviceResources.map((app) => <AppRow key={app.id} app={app} active={selectedAppId === app.id} connected={connected} currentAction={actionByAppId[app.id]} onSelect={() => onSelect(app.id)} onLogs={() => onLogs(app)} onEdit={() => onEdit(app)} onAction={(action) => onAction(app, action)} />)}
          </>
        )}
      </div>
    </section>
  );
}

function AppOperationsModule({ activeTab, appResources, apps, app, connected, currentAction, deploying, deploymentLogs, deploymentLogsError, deploymentLogsLoading, deployments, domains, github, logs, logsError, logsLoading, module, onAction, onDeploy, onDeploymentLogs, onEdit, onLogs, onReload, onSelect, selectedAppId }: { activeTab?: InspectorTab; appResources: DaemonApp[]; apps: DaemonApp[]; app: DaemonApp | null; connected: boolean; currentAction?: AppAction | null; deploying: boolean; deploymentLogs: DeploymentLogsResponse | null; deploymentLogsError: string | null; deploymentLogsLoading: boolean; deployments: DaemonDeployment[]; domains: DaemonDomain[]; github: DaemonGithubStatus | null; logs: DaemonAppLogsResponse | null; logsError: string | null; logsLoading: boolean; module: ModuleKey; onAction?: (action: AppAction) => void; onDeploy?: () => void; onDeploymentLogs: (deployment: DaemonDeployment) => void; onEdit?: () => void; onLogs: (app: DaemonApp) => void; onReload?: () => void; onSelect: (id: number) => void; selectedAppId: number | null }) {
  useEffect(() => {
    if (module === "logs" && app && !logsLoading && logs?.app.id !== app.id) {
      onLogs(app);
    }
  }, [app, logs?.app.id, logsLoading, module, onLogs]);

  if (module === "apps") {
    return <DetailPanel activeTab={activeTab} app={app} connected={connected} deployments={deployments} domains={domains} github={github} deploymentLogs={deploymentLogs} deploymentLogsError={deploymentLogsError} deploymentLogsLoading={deploymentLogsLoading} deploying={deploying} logs={logs} loading={logsLoading} error={logsError} currentAction={currentAction} onDeploy={onDeploy} onEdit={onEdit} onDeploymentLogs={onDeploymentLogs} onReload={onReload} onAction={onAction} />;
  }
  const candidates = [...(appResources.length ? appResources : apps)].sort((a, b) => {
    if (module !== "health") return a.name.localeCompare(b.name);
    const aProblem = a.status !== "running" || Boolean(a.needsRestart || a.needsRedeploy);
    const bProblem = b.status !== "running" || Boolean(b.needsRestart || b.needsRedeploy);
    return Number(bProblem) - Number(aProblem) || a.name.localeCompare(b.name);
  });

  return (
    <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)] xl:items-start">
      <div className={`overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW}`}>
        <ModuleHeader module={module} stats={<MetricPill label="resources" value={String(candidates.length)} accent />} />
        <ResourceSection title="Choose app" count={candidates.length} />
        {candidates.length === 0 ? <p className="px-4 py-5 text-sm text-muted">No app resources are registered yet. Add one from Apps to populate this module.</p> : null}
        {candidates.map((item) => (
          <button key={item.id} type="button" onClick={() => { onSelect(item.id); if (module === "logs") onLogs(item); }} className={`block w-full border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/[0.035] ${FOCUS_RING} ${selectedAppId === item.id ? "bg-white/[0.055] shadow-[3px_0_0_0_var(--accent)_inset]" : ""}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{item.name}</p>
                <p className="mt-1 truncate font-mono text-[11px] text-muted">{item.driver} · {item.port ? `:${item.port}` : "no port"}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
          </button>
        ))}
      </div>
      <DetailPanel activeTab={activeTab} app={app} connected={connected} deployments={deployments} domains={domains} github={github} deploymentLogs={deploymentLogs} deploymentLogsError={deploymentLogsError} deploymentLogsLoading={deploymentLogsLoading} deploying={deploying} logs={logs} loading={logsLoading} error={logsError} currentAction={currentAction} onDeploy={onDeploy} onEdit={onEdit} onDeploymentLogs={onDeploymentLogs} onReload={onReload} onAction={onAction} />
    </section>
  );
}

function MetricsModule({ app, apps, appResources, connected, currentAction, deploying, deploymentLogs, deploymentLogsError, deploymentLogsLoading, deployments, domains, github, hostMetrics, hostMetricsError, logs, logsError, logsLoading, onAction, onDeploy, onDeploymentLogs, onEdit, onReload, onSelect, selectedAppId }: { app: DaemonApp | null; apps: DaemonApp[]; appResources: DaemonApp[]; connected: boolean; currentAction?: AppAction | null; deploying: boolean; deploymentLogs: DeploymentLogsResponse | null; deploymentLogsError: string | null; deploymentLogsLoading: boolean; deployments: DaemonDeployment[]; domains: DaemonDomain[]; github: DaemonGithubStatus | null; hostMetrics: DaemonMetricSample[]; hostMetricsError: string | null; logs: DaemonAppLogsResponse | null; logsError: string | null; logsLoading: boolean; onAction?: (action: AppAction) => void; onDeploy?: () => void; onDeploymentLogs: (deployment: DaemonDeployment) => void; onEdit?: () => void; onReload?: () => void; onSelect: (id: number) => void; selectedAppId: number | null }) {
  const latestHostMetric = hostMetrics[0] || null;
  const candidates = [...(appResources.length ? appResources : apps)].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.22fr)] xl:items-start">
      <div className={`overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW}`}>
        <ModuleHeader module="metrics" stats={<><ReadinessCard label="Host samples" value={String(hostMetrics.length)} status={hostMetrics.length ? "ok" : "warn"} /><ReadinessCard label="CPU" value={latestHostMetric?.cpuPercent == null ? "-" : `${latestHostMetric.cpuPercent.toFixed(1)}%`} status="ok" /><ReadinessCard label="RAM" value={latestHostMetric ? formatBytes(latestHostMetric.memoryBytes) : "-"} status="ok" /></>} />
        {hostMetricsError ? <Alert title="Metrics unavailable" message={hostMetricsError} /> : null}
        <ResourceSection title="Host samples" count={hostMetrics.length} />
        {hostMetrics.length === 0 ? <div className="px-4 py-5 text-sm text-muted">No host metric samples are available yet. App metrics load from the selected app panel.</div> : null}
        {hostMetrics.slice(0, 6).map((sample) => <MetricSampleRow key={sample.id} sample={sample} />)}
        <ResourceSection title="App samples" count={candidates.length} />
        {candidates.map((item) => (
          <button key={item.id} type="button" onClick={() => onSelect(item.id)} className={`block w-full border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/[0.035] ${FOCUS_RING} ${selectedAppId === item.id ? "bg-white/[0.055] shadow-[3px_0_0_0_var(--accent)_inset]" : ""}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{item.name}</p>
                <p className="mt-1 truncate font-mono text-[11px] text-muted">{item.driver} · {item.port ? `:${item.port}` : "no port"}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
          </button>
        ))}
      </div>
      <DetailPanel activeTab="metrics" app={app} connected={connected} deployments={deployments} domains={domains} github={github} deploymentLogs={deploymentLogs} deploymentLogsError={deploymentLogsError} deploymentLogsLoading={deploymentLogsLoading} deploying={deploying} logs={logs} loading={logsLoading} error={logsError} currentAction={currentAction} onDeploy={onDeploy} onEdit={onEdit} onDeploymentLogs={onDeploymentLogs} onReload={onReload} onAction={onAction} />
    </section>
  );
}

function MetricSampleRow({ sample }: { sample: DaemonMetricSample }) {
  return (
    <div className="border-b border-white/5 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold capitalize">{sample.scope}</p>
        <p className="text-[11px] text-muted">{timeAgo(sample.sampledAt)}</p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted sm:grid-cols-4">
        <span>CPU <strong className="text-foreground">{sample.cpuPercent == null ? "-" : `${sample.cpuPercent.toFixed(1)}%`}</strong></span>
        <span>RAM <strong className="text-foreground">{formatBytes(sample.memoryBytes)}</strong></span>
        <span>Disk <strong className="text-foreground">{formatBytes(sample.diskUsedBytes)}</strong></span>
        <span>Net <strong className="text-foreground">{formatBytes(sample.networkRxBytes)} / {formatBytes(sample.networkTxBytes)}</strong></span>
      </div>
      {sample.message ? <p className="mt-2 truncate text-[11px] text-muted">{sample.message}</p> : null}
    </div>
  );
}

function DeploymentsModule({ apps, connected, deployments, deployingByAppId, error, latestByAppId, onDeploy, onLogs, server }: { apps: DaemonApp[]; connected: boolean; deployments: DaemonDeployment[]; deployingByAppId: Record<number, boolean>; error: string | null; latestByAppId: Map<number, DaemonDeployment>; onDeploy: (app: DaemonApp) => void; onLogs: (deployment: DaemonDeployment) => void; server: DaemonServerStatus | null }) {
  const dockerReady = Boolean(server?.readiness?.checks.some((check) => check.id === "docker" && check.status === "ok"));
  const ready = connected && dockerReady && Boolean(server?.dataDir) && Boolean(!server?.auth.required || server.auth.configured);
  return (
    <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW}`}>
      <ModuleHeader module="deployments" stats={<><ReadinessCard label="Docker" value={dockerReady ? "ready" : "check"} status={dockerReady ? "ok" : "warn"} /><ReadinessCard label="History" value={String(deployments.length)} status={deployments.length ? "ok" : "warn"} /><ReadinessCard label="Failed" value={String(deployments.filter((item) => item.status === "failed").length)} status={deployments.some((item) => item.status === "failed") ? "error" : "ok"} /></>} />
      {error ? <Alert title="Deployment action failed" message={error} /> : null}
      <div className="grid gap-0 xl:grid-cols-[minmax(0,0.95fr)_minmax(340px,1.05fr)]">
        <div className="min-w-0 border-b border-white/5 xl:border-b-0 xl:border-r">
          <ResourceSection title="Deployable Dockerfile apps" count={apps.length} />
          {apps.length === 0 ? <div className="px-4 py-5 text-sm text-muted">No app uses the Dockerfile driver yet. Edit an app in Apps when its Dockerfile path is stable.</div> : null}
          {apps.map((app) => {
            const latest = latestByAppId.get(app.id);
            const deploying = Boolean(deployingByAppId[app.id]);
            return <div key={app.id} className="grid gap-3 border-b border-white/5 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-bold">{app.name}</p>{latest ? <StatusBadge status={latest.status} /> : <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">never deployed</span>}</div><p className="mt-1 truncate font-mono text-[11px] text-muted">{shortPath(app.path)} · {latest?.hostPort ? `http://127.0.0.1:${latest.hostPort}` : "temporary URL after deploy"}</p></div><div className="flex flex-wrap gap-2 md:justify-end">{latest ? <PillButton onClick={() => onLogs(latest)}>Logs</PillButton> : null}<PillButton strong onClick={() => onDeploy(app)} disabled={!ready || deploying || !app.enabled}>{deploying ? "Deploying" : "Deploy"}</PillButton></div></div>;
          })}
        </div>
        <div className="min-w-0"><ResourceSection title="Deployment history" count={deployments.length} />{deployments.length === 0 ? <div className="px-4 py-5 text-sm text-muted">Deployment history appears after the first Dockerfile deploy.</div> : deployments.map((deployment) => <DeploymentSummaryRow key={deployment.id} deployment={deployment} onLogs={() => onLogs(deployment)} />)}</div>
      </div>
    </section>
  );
}

function DomainsModule({ apps, connected, domains, domainsError, domainsMeta, domainActionByHostname, domainForm, domainSaving, onAddDomain, onDomainFormChange, onRemoveDomain, onRootDomainChange, onSaveRootDomain, onVerifyDomain, proxyRoutes, rootDomainInput }: { apps: DaemonApp[]; connected: boolean; domains: DaemonDomain[]; domainsError: string | null; domainsMeta: { rootDomain: string | null; serverPublicIp: string | null }; domainActionByHostname: Record<string, string | null>; domainForm: { appId: string; hostname: string }; domainSaving: boolean; onAddDomain: () => void; onDomainFormChange: (form: { appId: string; hostname: string }) => void; onRemoveDomain: (domain: DaemonDomain) => void; onRootDomainChange: (value: string) => void; onSaveRootDomain: () => void; onVerifyDomain: (domain: DaemonDomain) => void; proxyRoutes: DaemonProxyRoute[]; rootDomainInput: string }) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW}`}>
      <ModuleHeader module="domains" stats={<><ReadinessCard label="Root" value={domainsMeta.rootDomain || "unset"} status={domainsMeta.rootDomain ? "ok" : "warn"} /><ReadinessCard label="Hosts" value={String(domains.length)} status={domains.length ? "ok" : "warn"} /><ReadinessCard label="Routes" value={String(proxyRoutes.filter((route) => route.enabled).length)} status={proxyRoutes.some((route) => route.enabled) ? "ok" : "warn"} /></>} />
      {domainsError ? <Alert title="Domain or proxy action failed" message={domainsError} /> : null}
      <div className="grid gap-0 xl:grid-cols-[minmax(0,0.85fr)_minmax(340px,1.15fr)]">
        <div className="min-w-0 border-b border-white/5 xl:border-b-0 xl:border-r">
          <ResourceSection title="Root domain" count={domainsMeta.rootDomain ? 1 : 0} />
          <div className="border-b border-white/5 px-4 py-3"><div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><Field label="Root domain" value={rootDomainInput} onChange={onRootDomainChange} placeholder="example.com" disabled={!connected || domainSaving} /><div className="flex items-end"><PillButton onClick={onSaveRootDomain} disabled={!connected || domainSaving || !rootDomainInput.trim()} strong>Save root</PillButton></div></div><div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><Meta label="Server IP" value={domainsMeta.serverPublicIp || "set ROUTELY_SERVER_PUBLIC_IP"} mono /><Meta label="Wildcard" value={domainsMeta.rootDomain ? `*.${domainsMeta.rootDomain}` : "set root domain"} mono /></div></div>
          <ResourceSection title="Add hostname" count={apps.length} />
          <div className="px-4 py-3"><div className="grid gap-2 sm:grid-cols-[minmax(120px,0.8fr)_minmax(0,1.2fr)_auto]"><UiSelect value={domainForm.appId} onChange={(event) => onDomainFormChange({ ...domainForm, appId: event.target.value })} disabled={!connected || domainSaving} label="App"><option value="">Choose app</option>{apps.map((app) => <option key={app.id} value={app.id}>{app.name}</option>)}</UiSelect><Field label="Hostname" value={domainForm.hostname} onChange={(value) => onDomainFormChange({ ...domainForm, hostname: value })} placeholder={domainsMeta.rootDomain ? `web.${domainsMeta.rootDomain}` : "web.example.com"} disabled={!connected || domainSaving} /><div className="flex items-end"><PillButton onClick={onAddDomain} disabled={!connected || domainSaving || !domainForm.appId || !domainForm.hostname.trim()} strong>Add</PillButton></div></div></div>
        </div>
        <div className="min-w-0"><ResourceSection title="Hostnames" count={domains.length} />{domains.length === 0 ? <div className="px-4 py-5 text-sm text-muted">Add a hostname after a Dockerfile app has a successful deployment. DNS verification creates proxy route state.</div> : domains.map((domain) => { const action = domainActionByHostname[domain.hostname]; const route = proxyRoutes.find((item) => item.domainId === domain.id); return <div key={domain.id} className="border-b border-white/5 px-4 py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-mono text-sm font-bold">{domain.hostname}</p><p className="mt-1 text-[11px] text-muted">{domain.appName || `app ${domain.appId}`} · {route?.targetUrl || (domain.targetPort ? `http://127.0.0.1:${domain.targetPort}` : "route pending")}</p></div><StatusBadge status={domain.status} /></div><div className="mt-3 grid grid-cols-3 gap-2"><ReadinessCard label="DNS" value={domain.dnsStatus} status={domain.dnsStatus === "verified" ? "ok" : "warn"} /><ReadinessCard label="TLS" value={domain.tlsStatus} status={domain.tlsStatus === "active" || domain.tlsStatus === "issuing" ? "ok" : "warn"} /><ReadinessCard label="Proxy" value={route?.enabled ? "ready" : "pending"} status={route?.enabled ? "ok" : "warn"} /></div>{domain.verificationMessage ? <p className="mt-2 text-xs text-muted">{domain.verificationMessage}</p> : null}<div className="mt-3 flex flex-wrap gap-2"><PillButton onClick={() => onVerifyDomain(domain)} disabled={!connected || Boolean(action)}>{action === "verify" ? "Checking" : "Verify DNS"}</PillButton><ActionLink href={domain.status === "ready" ? `https://${domain.hostname.replace(/^\*\./, "")}` : null}>Open HTTPS</ActionLink><PillButton onClick={() => onRemoveDomain(domain)} disabled={!connected || Boolean(action)}>{action === "remove" ? "Removing" : "Remove"}</PillButton></div></div>; })}</div>
      </div>
    </section>
  );
}

function GithubModule({ apps, connected, github, githubError, githubForm, githubSaving, onGithubConnect, onGithubFormChange }: { apps: DaemonApp[]; connected: boolean; github: DaemonGithubStatus | null; githubError: string | null; githubForm: { appId: string; fullName: string; branch: string; autoDeploy: boolean }; githubSaving: boolean; onGithubConnect: () => void; onGithubFormChange: (form: { appId: string; fullName: string; branch: string; autoDeploy: boolean }) => void }) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW}`}>
      <ModuleHeader module="github" stats={<><ReadinessCard label="App" value={github?.configured ? "configured" : "missing"} status={github?.configured ? "ok" : "warn"} /><ReadinessCard label="Webhook" value={github?.webhookSecretConfigured ? "signed" : "missing"} status={github?.webhookSecretConfigured ? "ok" : "error"} /><ReadinessCard label="Repos" value={String(github?.repositories.length || 0)} status={github?.repositories.length ? "ok" : "warn"} /></>} />
      {githubError ? <Alert title="GitHub action failed" message={githubError} /> : null}
      <div className="grid gap-0 xl:grid-cols-[minmax(0,0.82fr)_minmax(340px,1.18fr)]"><div className="min-w-0 border-b border-white/5 xl:border-b-0 xl:border-r"><ResourceSection title="Connect repository" count={apps.length} /><div className="px-4 py-3"><div className="grid gap-2 sm:grid-cols-[minmax(120px,0.8fr)_minmax(0,1.2fr)_110px_auto]"><UiSelect value={githubForm.appId} onChange={(event) => onGithubFormChange({ ...githubForm, appId: event.target.value })} disabled={!connected || githubSaving} label="App"><option value="">Choose app</option>{apps.map((app) => <option key={app.id} value={app.id}>{app.name}</option>)}</UiSelect><Field label="Repository" value={githubForm.fullName} onChange={(value) => onGithubFormChange({ ...githubForm, fullName: value })} placeholder="owner/repo" disabled={!connected || githubSaving} /><Field label="Branch" value={githubForm.branch} onChange={(value) => onGithubFormChange({ ...githubForm, branch: value })} placeholder="main" disabled={!connected || githubSaving} /><div className="flex items-end"><PillButton onClick={onGithubConnect} disabled={!connected || githubSaving || !githubForm.appId || !githubForm.fullName.trim()} strong>{githubSaving ? "Saving" : "Connect"}</PillButton></div></div><label className="mt-3 flex items-center justify-between gap-3 rounded-md bg-black/20 px-3 py-2 text-xs"><span><span className="font-bold">Auto deploy on push</span><span className="block text-muted">Only matching branch push events queue deployments.</span></span><input type="checkbox" checked={githubForm.autoDeploy} onChange={(event) => onGithubFormChange({ ...githubForm, autoDeploy: event.target.checked })} disabled={githubSaving} className="h-4 w-4 accent-[var(--accent)]" /></label></div></div><div className="min-w-0"><ResourceSection title="Repositories" count={github?.repositories.length || 0} />{github?.repositories.length ? github.repositories.map((repo) => <div key={repo.id} className="border-b border-white/5 px-4 py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-mono text-sm font-bold">{repo.fullName}</p><p className="mt-1 text-[11px] text-muted">{repo.connectedAppName || "not connected"} · {repo.selectedBranch || repo.defaultBranch || "branch not set"} · {repo.private ? "private" : "public"}</p></div><StatusBadge status={repo.autoDeployEnabled ? "running" : "stopped"} /></div></div>) : <div className="border-b border-white/5 px-4 py-5 text-sm text-muted">Connect a repository to store source metadata and enable signed push-to-deploy.</div>}<ResourceSection title="Webhook deliveries" count={github?.deliveries.length || 0} />{github?.deliveries.length ? github.deliveries.slice(0, 12).map((delivery) => <TimelineRow key={delivery.deliveryId} title={delivery.repo || delivery.event} detail={`${delivery.status} · ${delivery.branch || "-"} · ${delivery.commitSha?.slice(0, 7) || "no commit"} · ${timeAgo(delivery.receivedAt)}`} tone={delivery.status === "accepted" || delivery.status === "deployed" ? "ok" : delivery.status === "failed" ? "error" : "warn"} />) : <div className="px-4 py-5 text-sm text-muted">Signed push deliveries appear here after GitHub sends webhooks.</div>}</div></div>
    </section>
  );
}

function DatabasesModule({ connected, databaseActionById, databaseForm, databaseSaving, databases, databasesError, onCreateDatabase, onDatabaseAction, onDatabaseFormChange }: { connected: boolean; databaseActionById: Record<number, string | null>; databaseForm: { type: string; name: string }; databaseSaving: boolean; databases: DaemonDatabase[]; databasesError: string | null; onCreateDatabase: () => void; onDatabaseAction: (database: DaemonDatabase, action: "start" | "stop") => void; onDatabaseFormChange: (form: { type: string; name: string }) => void }) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW}`}>
      <ModuleHeader module="databases" stats={<><ReadinessCard label="Records" value={String(databases.length)} status={databases.length ? "ok" : "warn"} /><ReadinessCard label="Running" value={String(databases.filter((database) => database.status === "running").length)} status={databases.some((database) => database.status === "running") ? "ok" : "warn"} /><ReadinessCard label="Network" value="internal" status="ok" /></>} />
      {databasesError ? <Alert title="Database action failed" message={databasesError} /> : null}
      <div className="grid gap-0 xl:grid-cols-[minmax(0,0.72fr)_minmax(340px,1.28fr)]">
        <div className="min-w-0 border-b border-white/5 xl:border-b-0 xl:border-r">
          <ResourceSection title="Create database" count={5} />
          <div className="px-4 py-3"><div className="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)_auto]"><UiSelect value={databaseForm.type} onChange={(event) => onDatabaseFormChange({ ...databaseForm, type: event.target.value, name: databaseForm.name || event.target.value })} disabled={!connected || databaseSaving} label="Type" options={["postgres", "mysql", "mariadb", "redis", "mongodb"]} /><Field label="Name" value={databaseForm.name} onChange={(value) => onDatabaseFormChange({ ...databaseForm, name: value })} placeholder="postgres" disabled={!connected || databaseSaving} /><div className="flex items-end"><PillButton strong onClick={onCreateDatabase} disabled={!connected || databaseSaving || !databaseForm.name.trim()}>{databaseSaving ? "Creating" : "Create"}</PillButton></div></div><p className="mt-3 text-xs text-muted">Database services are Compose-backed and internal-only by default. The UI shows env key names, never raw values.</p></div>
        </div>
        <div className="min-w-0"><ResourceSection title="Database services" count={databases.length} />{databases.length === 0 ? <div className="px-4 py-5 text-sm text-muted">No production database records yet. Create one to add a Compose-backed internal service.</div> : databases.map((database) => { const busy = databaseActionById[database.id]; const running = database.status === "running"; return <div key={database.id} className="border-b border-white/5 px-4 py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{database.name}</p><p className="mt-1 truncate font-mono text-[11px] text-muted">{database.image || database.type} · {database.composeService || "compose"} · {database.volumeName || "volume pending"}</p></div><StatusBadge status={database.status} /></div><div className="mt-2 grid grid-cols-3 gap-2"><ReadinessCard label="Network" value={database.internal ? "internal" : "public"} status={database.internal ? "ok" : "error"} /><ReadinessCard label="Port" value={database.port ? `:${database.port}` : "none"} status="ok" /><ReadinessCard label="Env" value={`${database.envKeys.length} keys`} status="ok" /></div>{database.envKeys.length ? <p className="mt-2 break-all font-mono text-[11px] text-muted">{database.envKeys.join(", ")}</p> : null}<div className="mt-3 flex flex-wrap gap-2"><PillButton onClick={() => onDatabaseAction(database, "start")} disabled={!connected || Boolean(busy) || running}>{busy === "start" ? "Starting" : "Start"}</PillButton><PillButton onClick={() => onDatabaseAction(database, "stop")} disabled={!connected || Boolean(busy) || !running}>{busy === "stop" ? "Stopping" : "Stop"}</PillButton></div></div>; })}</div>
      </div>
    </section>
  );
}

function BackupsModule({ backupActionById, backupForm, backupJobs, backupRuns, backupsError, connected, databases, onBackupFormChange, onEnableBackup, onRunBackup, onToggleBackup }: { backupActionById: Record<number, string | null>; backupForm: { databaseId: string; schedule: string; retentionDays: string }; backupJobs: DaemonBackupJob[]; backupRuns: DaemonBackupRun[]; backupsError: string | null; connected: boolean; databases: DaemonDatabase[]; onBackupFormChange: (form: { databaseId: string; schedule: string; retentionDays: string }) => void; onEnableBackup: () => void; onRunBackup: (job: DaemonBackupJob) => void; onToggleBackup: (job: DaemonBackupJob, enabled: boolean) => void }) {
  const latestRun = backupRuns[0] || null;
  const failedRuns = backupRuns.filter((run) => run.status === "failed");
  return (
    <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW}`}>
      <ModuleHeader module="backups" stats={<><ReadinessCard label="Jobs" value={String(backupJobs.length)} status={backupJobs.length ? "ok" : "warn"} /><ReadinessCard label="Latest" value={latestRun?.status || "never"} status={latestRun?.status === "succeeded" ? "ok" : latestRun?.status === "failed" ? "error" : "warn"} /><ReadinessCard label="Failed" value={String(failedRuns.length)} status={failedRuns.length ? "error" : "ok"} /></>} />
      {backupsError ? <Alert title="Backup action failed" message={backupsError} /> : null}
      <div className="grid gap-0 xl:grid-cols-[minmax(0,0.82fr)_minmax(340px,1.18fr)]">
        <div className="min-w-0 border-b border-white/5 xl:border-b-0 xl:border-r"><ResourceSection title="Enable backup job" count={databases.length} /><div className="px-4 py-3"><div className="grid gap-2 sm:grid-cols-[minmax(120px,0.9fr)_minmax(0,1fr)_100px_auto]"><UiSelect value={backupForm.databaseId} onChange={(event) => onBackupFormChange({ ...backupForm, databaseId: event.target.value })} disabled={!connected || databases.length === 0} label="Database"><option value="">Choose</option>{databases.map((database) => <option key={database.id} value={database.id}>{database.name}</option>)}</UiSelect><Field label="Schedule" value={backupForm.schedule} onChange={(value) => onBackupFormChange({ ...backupForm, schedule: value })} placeholder="0 2 * * *" disabled={!connected} mono /><Field label="Keep days" value={backupForm.retentionDays} onChange={(value) => onBackupFormChange({ ...backupForm, retentionDays: value })} placeholder="7" disabled={!connected} type="number" /><div className="flex items-end"><PillButton strong onClick={onEnableBackup} disabled={!connected || !backupForm.databaseId}>Enable</PillButton></div></div><p className="mt-3 text-xs text-muted">Backups write local files only. Restore automation and external storage are later checkpoint scope.</p></div><ResourceSection title="Backup jobs" count={backupJobs.length} />{backupJobs.length === 0 ? <div className="px-4 py-5 text-sm text-muted">Enable backups for a database to schedule local backup files and run manual backups.</div> : backupJobs.map((job) => { const busy = backupActionById[job.id]; return <div key={job.id} className="border-b border-white/5 px-4 py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{job.databaseName || `database ${job.databaseId}`}</p><p className="mt-1 truncate font-mono text-[11px] text-muted">{job.schedule || "manual only"} · retain {job.retentionDays}d · {job.localDir || "default backup dir"}</p></div><StatusBadge status={job.enabled ? "running" : "stopped"} /></div>{job.lastRunMessage ? <p className="mt-2 text-xs text-muted">Last run: {job.lastRunStatus || "unknown"} · {job.lastRunAt ? timeAgo(job.lastRunAt) : "never"} · {job.lastRunMessage}</p> : null}<div className="mt-3 flex flex-wrap gap-2"><PillButton onClick={() => onRunBackup(job)} disabled={!connected || Boolean(busy)}>{busy === "run" ? "Running" : "Run now"}</PillButton><PillButton onClick={() => onToggleBackup(job, !job.enabled)} disabled={!connected || Boolean(busy)}>{job.enabled ? "Disable" : "Enable"}</PillButton></div></div>; })}</div>
        <div className="min-w-0"><ResourceSection title="Backup runs" count={backupRuns.length} />{backupRuns.length === 0 ? <div className="px-4 py-5 text-sm text-muted">Backup run history appears after a manual or scheduled run.</div> : backupRuns.map((run) => <div key={run.id} className="border-b border-white/5 px-4 py-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold">#{run.id} {run.databaseName || `database ${run.databaseId}`}</p><p className="mt-1 truncate font-mono text-[11px] text-muted">{run.trigger} · {run.finishedAt ? timeAgo(run.finishedAt) : timeAgo(run.createdAt)} · {formatBytes(run.sizeBytes)}</p></div><StatusBadge status={run.status} /></div><p className="mt-2 break-all text-xs text-muted">{run.filePath || run.message || "no backup file"}</p></div>)}</div>
      </div>
    </section>
  );
}

function OverviewPanel({ apps, backupJobs, backupRuns, deployments, healthchecksUnavailable, onSelect, server }: { apps: DaemonApp[]; backupJobs: DaemonBackupJob[]; backupRuns: DaemonBackupRun[]; deployments: DaemonDeployment[]; healthchecksUnavailable: string | null | undefined; onSelect: (module: ModuleKey) => void; server: DaemonServerStatus | null }) {
  const failedDeploys = deployments.filter((deployment) => deployment.status === "failed").slice(0, 3);
  const recentDeploys = deployments.slice(0, 5);
  const backupFailures = backupRuns.filter((run) => run.status === "failed").slice(0, 3);
  const pendingApps = apps.filter((app) => app.needsRedeploy || app.needsRestart);
  const running = apps.filter((app) => app.status === "running").length;

  return (
    <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW} lg:col-span-2`}>
      <div className="grid gap-3 border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent px-4 py-4 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Overview</p>
          <h1 className="text-xl font-bold leading-tight">Fleet status</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">Server readiness, app counts, recent deploys, backup status, and urgent actions.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ReadinessCard label="Server" value={server?.readiness?.ok ? "ready" : server?.production ? "check" : "local"} status={server?.readiness?.ok || !server?.production ? "ok" : "warn"} />
          <ReadinessCard label="Apps" value={`${running}/${apps.length} running`} status={running ? "ok" : "warn"} />
          <ReadinessCard label="Deploys" value={failedDeploys.length ? `${failedDeploys.length} failed` : `${deployments.length} total`} status={failedDeploys.length ? "error" : "ok"} />
          <ReadinessCard label="Backups" value={backupFailures.length ? `${backupFailures.length} failed` : `${backupJobs.length} jobs`} status={backupFailures.length ? "error" : backupJobs.length ? "ok" : "warn"} />
        </div>
      </div>
      {healthchecksUnavailable ? <Alert title="Some overview data is stale" message={healthchecksUnavailable} /> : null}
      <div className="grid gap-3 px-4 py-4 lg:grid-cols-3">
        <OverviewList title="Recent deployments" empty="No deployments yet." action="Deployments" onAction={() => onSelect("deployments")}>
          {recentDeploys.map((deployment) => <TimelineRow key={deployment.id} title={`#${deployment.id} ${deployment.appName || "app"}`} detail={`${deployment.status} · ${timeAgo(deployment.updatedAt)}`} tone={deployment.status === "failed" ? "error" : deployment.status === "succeeded" ? "ok" : "warn"} />)}
        </OverviewList>
        <OverviewList title="Health failures" empty="No urgent health failures." action="Health" onAction={() => onSelect("health")}>
          {failedDeploys.map((deployment) => <TimelineRow key={deployment.id} title={deployment.appName || `deployment ${deployment.id}`} detail={deployment.errorMessage || deployment.phase} tone="error" />)}
        </OverviewList>
        <OverviewList title="Next actions" empty="No urgent actions." action="Settings" onAction={() => onSelect("settings")}>
          {pendingApps.slice(0, 4).map((app) => <TimelineRow key={app.id} title={app.name} detail={pendingStateLabel(app)} tone="warn" />)}
          {backupFailures.map((run) => <TimelineRow key={`backup-${run.id}`} title={run.databaseName || `backup ${run.id}`} detail={run.message || "Backup failed"} tone="error" />)}
        </OverviewList>
      </div>
    </section>
  );
}

function OverviewList({ action, children, empty, onAction, title }: { action: string; children: ReactNode; empty: string; onAction: () => void; title: string }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const hasItems = Array.isArray(items) ? items.length > 0 : Boolean(items);
  return (
    <div className={`min-w-0 rounded-md bg-black/20 ${INSET_RING}`}>
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <h2 className="text-sm font-bold">{title}</h2>
        <button type="button" onClick={onAction} className={`rounded-full bg-surface-raised px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted transition hover:text-accent ${FOCUS_RING}`}>{action}</button>
      </div>
      <div className="divide-y divide-white/5">{hasItems ? items : <p className="px-3 py-3 text-xs text-muted">{empty}</p>}</div>
    </div>
  );
}

function NotificationsPanel({ attempts, channels, connected, error, form, onChange, onCreate, onTest, onToggle, saving }: { attempts: DaemonNotificationAttempt[]; channels: DaemonNotificationChannel[]; connected: boolean; error: string | null; form: { type: string; name: string; url: string; botToken: string; chatId: string; events: string }; onChange: (form: { type: string; name: string; url: string; botToken: string; chatId: string; events: string }) => void; onCreate: () => void; onTest: (channel: DaemonNotificationChannel) => void; onToggle: (channel: DaemonNotificationChannel, enabled: boolean) => void; saving: boolean }) {
  const update = (patch: Partial<typeof form>) => onChange({ ...form, ...patch });
  return (
    <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW} lg:col-span-2`}>
      <div className="flex flex-col gap-3 border-b border-white/5 bg-gradient-to-b from-white/[0.035] to-transparent px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Settings</p>
          <h1 className="text-xl font-bold leading-tight">Notifications</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">Deploy success, deploy failure, and backup failure alerts through real daemon delivery attempts.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <ReadinessCard label="Channels" value={String(channels.length)} status={channels.length ? "ok" : "warn"} />
          <ReadinessCard label="Enabled" value={String(channels.filter((channel) => channel.enabled).length)} status={channels.some((channel) => channel.enabled) ? "ok" : "warn"} />
          <ReadinessCard label="Attempts" value={String(attempts.length)} status={attempts.some((attempt) => attempt.status === "failed") ? "warn" : "ok"} />
        </div>
      </div>
      {error ? <Alert title="Notifications unavailable" message={error} /> : null}
      <div className="grid gap-3 px-4 py-4 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={(event) => { event.preventDefault(); onCreate(); }} className={`grid gap-3 rounded-md bg-black/20 p-3 ${INSET_RING}`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Channel" value={form.type} values={["webhook", "discord", "telegram"]} onChange={(value) => update({ type: value })} disabled={!connected || saving} />
            <Field label="Name" value={form.name} onChange={(value) => update({ name: value })} disabled={!connected || saving} />
            {form.type === "telegram" ? <Field label="Bot token" value={form.botToken} onChange={(value) => update({ botToken: value })} disabled={!connected || saving} mono /> : <Field label="Webhook URL" value={form.url} onChange={(value) => update({ url: value })} disabled={!connected || saving} mono wide />}
            {form.type === "telegram" ? <Field label="Chat ID" value={form.chatId} onChange={(value) => update({ chatId: value })} disabled={!connected || saving} mono /> : null}
            <Field label="Events" value={form.events} onChange={(value) => update({ events: value })} disabled={!connected || saving} mono wide />
          </div>
          <PillButton type="submit" strong disabled={!connected || saving}>{saving ? "Saving" : "Add channel"}</PillButton>
        </form>
        <div className="grid gap-3">
          <div className={`overflow-hidden rounded-md bg-black/20 ${INSET_RING}`}>
            <ResourceSection title="Channels" count={channels.length} />
            {channels.length === 0 ? <p className="px-3 py-3 text-sm text-muted">No notification channels configured yet.</p> : null}
            {channels.map((channel) => <NotificationChannelRow key={channel.id} channel={channel} connected={connected} onTest={onTest} onToggle={onToggle} />)}
          </div>
          <div className={`overflow-hidden rounded-md bg-black/20 ${INSET_RING}`}>
            <ResourceSection title="Delivery attempts" count={attempts.length} />
            {attempts.length === 0 ? <p className="px-3 py-3 text-sm text-muted">No notification deliveries recorded yet.</p> : null}
            {attempts.slice(0, 8).map((attempt) => <TimelineRow key={attempt.id} title={`${attempt.event} · ${attempt.channelName || "deleted channel"}`} detail={`${attempt.status}${attempt.httpStatus ? ` · HTTP ${attempt.httpStatus}` : ""}${attempt.message ? ` · ${attempt.message}` : ""}`} tone={attempt.status === "succeeded" ? "ok" : attempt.status === "failed" ? "error" : "warn"} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function NotificationChannelRow({ channel, connected, onTest, onToggle }: { channel: DaemonNotificationChannel; connected: boolean; onTest: (channel: DaemonNotificationChannel) => void; onToggle: (channel: DaemonNotificationChannel, enabled: boolean) => void }) {
  return (
    <div className="grid gap-2 border-b border-white/5 px-3 py-3 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={channel.enabled ? "running" : "stopped"} />
          <p className="truncate text-sm font-bold">{channel.name}</p>
          <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{channel.type}</span>
        </div>
        <p className="mt-1 truncate font-mono text-[11px] text-muted">{channel.target || "[redacted]"}</p>
        <p className="mt-1 truncate text-[11px] text-muted">{channel.events.join(", ")}</p>
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <PillButton onClick={() => onTest(channel)} disabled={!connected || !channel.enabled}>Test</PillButton>
        <PillButton onClick={() => onToggle(channel, !channel.enabled)} disabled={!connected}>{channel.enabled ? "Disable" : "Enable"}</PillButton>
      </div>
    </div>
  );
}

function TimelineRow({ detail, title, tone }: { detail: string; title: string; tone: "ok" | "warn" | "error" }) {
  const color = tone === "ok" ? "bg-accent" : tone === "warn" ? "bg-warning" : "bg-negative";
  return (
    <div className="grid grid-cols-[auto_1fr] gap-2 px-3 py-2">
      <span className={`mt-1.5 h-2 w-2 rounded-full ${color}`} />
      <div className="min-w-0">
        <p className="truncate text-xs font-bold">{title}</p>
        <p className="truncate text-[11px] text-muted">{detail}</p>
      </div>
    </div>
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
              {app.needsRestart || app.needsRedeploy ? <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-warning">pending</span> : null}
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

// Kept during the IA split as reference for the older combined production panel.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ProductionDeployPanel({
  apps,
  connected,
  deployments,
  domains,
  domainsByAppId,
  domainsError,
  domainsMeta,
  domainActionByHostname,
  domainForm,
  domainSaving,
  deployingByAppId,
  error,
  github,
  githubError,
  githubForm,
  githubSaving,
  latestByAppId,
  proxyRoutes,
  rootDomainInput,
  onAddDomain,
  onDomainFormChange,
  onDeploy,
  onGithubConnect,
  onGithubFormChange,
  onLogs,
  onRemoveDomain,
  onRootDomainChange,
  onSaveRootDomain,
  onVerifyDomain,
  server
}: {
  apps: DaemonApp[];
  connected: boolean;
  deployments: DaemonDeployment[];
  domains: DaemonDomain[];
  domainsByAppId: Map<number, DaemonDomain[]>;
  domainsError: string | null;
  domainsMeta: { rootDomain: string | null; serverPublicIp: string | null };
  domainActionByHostname: Record<string, string | null>;
  domainForm: { appId: string; hostname: string };
  domainSaving: boolean;
  deployingByAppId: Record<number, boolean>;
  error: string | null;
  github: DaemonGithubStatus | null;
  githubError: string | null;
  githubForm: { appId: string; fullName: string; branch: string; autoDeploy: boolean };
  githubSaving: boolean;
  latestByAppId: Map<number, DaemonDeployment>;
  proxyRoutes: DaemonProxyRoute[];
  rootDomainInput: string;
  onAddDomain: () => void;
  onDomainFormChange: (form: { appId: string; hostname: string }) => void;
  onDeploy: (app: DaemonApp) => void;
  onGithubConnect: () => void;
  onGithubFormChange: (form: { appId: string; fullName: string; branch: string; autoDeploy: boolean }) => void;
  onLogs: (deployment: DaemonDeployment) => void;
  onRemoveDomain: (domain: DaemonDomain) => void;
  onRootDomainChange: (value: string) => void;
  onSaveRootDomain: () => void;
  onVerifyDomain: (domain: DaemonDomain) => void;
  server: DaemonServerStatus | null;
}) {
  const dockerReady = Boolean(server?.readiness?.checks.some((check) => check.id === "docker" && check.status === "ok"));
  const dataReady = Boolean(server?.dataDir);
  const authReady = Boolean(!server?.auth.required || server.auth.configured);
  const ready = connected && dockerReady && dataReady && authReady;
  const recent = deployments.slice(0, 4);
  const recentDeliveries = github?.deliveries.slice(0, 4) || [];

  return (
    <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW} lg:col-span-2`}>
      <div className="grid gap-3 border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent px-4 py-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Production deploy</p>
          <h2 className="text-lg font-bold leading-tight sm:text-xl">Dockerfile vertical slice</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Dockerfile deployments run on temporary host ports, then verified domains generate Traefik-compatible HTTPS routes.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ReadinessCard label="Docker" value={dockerReady ? "ready" : "check"} status={dockerReady ? "ok" : "warn"} />
          <ReadinessCard label="Auth" value={authReady ? "ready" : "missing"} status={authReady ? "ok" : "error"} />
          <ReadinessCard label="Data dir" value={dataReady ? "ready" : "pending"} status={dataReady ? "ok" : "warn"} />
          <ReadinessCard label="Domains" value={domains.length ? `${domains.length}` : "none"} status={domains.length ? "ok" : "warn"} />
        </div>
      </div>

      {error ? <Alert title="Deployment action failed" message={error} /> : null}
      {domainsError ? <Alert title="Domain or proxy action failed" message={domainsError} /> : null}
      {githubError ? <Alert title="GitHub action failed" message={githubError} /> : null}

      <div className="grid gap-0 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <div className="min-w-0 border-b border-white/5 lg:border-b-0 lg:border-r">
          <ResourceSection title="Deployable Dockerfile apps" count={apps.length} />
          {apps.length === 0 ? (
            <div className="px-4 py-5 text-sm text-muted">No app is configured with the Dockerfile driver yet. Edit an app and set driver to dockerfile when its Dockerfile path is stable.</div>
          ) : apps.map((app) => {
            const latest = latestByAppId.get(app.id);
            const deploying = Boolean(deployingByAppId[app.id]);
            const disabled = !ready || deploying || !app.enabled;
            return (
              <div key={app.id} className="grid gap-3 border-b border-white/5 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold">{app.name}</p>
                    {latest ? <StatusBadge status={latest.status} /> : <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">never deployed</span>}
                  </div>
                  <p className="mt-1 truncate font-mono text-[11px] text-muted">{shortPath(app.path)} to Dockerfile</p>
                  <p className="mt-1 text-[11px] text-muted">{latest?.hostPort ? `temporary URL http://127.0.0.1:${latest.hostPort}` : "temporary URL assigned after deploy"}</p>
                  <p className="mt-1 truncate text-[11px] text-muted">{(domainsByAppId.get(app.id) || []).map((domain) => domain.hostname).join(", ") || "no production domains"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  {latest ? <PillButton onClick={() => onLogs(latest)}>Logs</PillButton> : null}
                  <PillButton strong onClick={() => onDeploy(app)} disabled={disabled}>{deploying ? "Deploying" : "Deploy"}</PillButton>
                </div>
              </div>
            );
          })}
        </div>

        <div className="min-w-0">
          <ResourceSection title="Domains, proxy, HTTPS" count={domains.length} />
          <div className="border-b border-white/5 px-4 py-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Field label="Root domain" value={rootDomainInput} onChange={onRootDomainChange} placeholder="example.com" disabled={!connected || domainSaving} />
              <div className="flex items-end">
                <PillButton onClick={onSaveRootDomain} disabled={!connected || domainSaving || !rootDomainInput.trim()} strong>Save root</PillButton>
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <Meta label="Server IP" value={domainsMeta.serverPublicIp || "set ROUTELY_SERVER_PUBLIC_IP"} mono />
              <Meta label="Wildcard" value={domainsMeta.rootDomain ? `*.${domainsMeta.rootDomain}` : "set root domain"} mono />
            </div>
          </div>

          <div className="border-b border-white/5 px-4 py-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(120px,0.8fr)_minmax(0,1.2fr)_auto]">
              <UiSelect value={domainForm.appId} onChange={(event) => onDomainFormChange({ ...domainForm, appId: event.target.value })} disabled={!connected || domainSaving} label="App">
                <option value="">Choose app</option>
                {apps.map((app) => <option key={app.id} value={app.id}>{app.name}</option>)}
              </UiSelect>
              <Field label="Hostname" value={domainForm.hostname} onChange={(value) => onDomainFormChange({ ...domainForm, hostname: value })} placeholder={domainsMeta.rootDomain ? `web.${domainsMeta.rootDomain}` : "web.example.com"} disabled={!connected || domainSaving} />
              <div className="flex items-end">
                <PillButton onClick={onAddDomain} disabled={!connected || domainSaving || !domainForm.appId || !domainForm.hostname.trim()} strong>Add</PillButton>
              </div>
            </div>
          </div>

          {domains.length === 0 ? (
            <div className="border-b border-white/5 px-4 py-5 text-sm text-muted">Add a hostname after a Dockerfile app has a successful deployment. DNS must resolve before the route is marked ready.</div>
          ) : domains.map((domain) => {
            const action = domainActionByHostname[domain.hostname];
            const route = proxyRoutes.find((item) => item.domainId === domain.id);
            return (
              <div key={domain.id} className="border-b border-white/5 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-bold">{domain.hostname}</p>
                    <p className="mt-1 text-[11px] text-muted">{domain.appName || `app ${domain.appId}`} · {route?.targetUrl || (domain.targetPort ? `http://127.0.0.1:${domain.targetPort}` : "route pending")}</p>
                  </div>
                  <StatusBadge status={domain.status} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <ReadinessCard label="DNS" value={domain.dnsStatus} status={domain.dnsStatus === "verified" ? "ok" : "warn"} />
                  <ReadinessCard label="TLS" value={domain.tlsStatus} status={domain.tlsStatus === "active" || domain.tlsStatus === "issuing" ? "ok" : "warn"} />
                  <ReadinessCard label="Proxy" value={route?.enabled ? "ready" : "pending"} status={route?.enabled ? "ok" : "warn"} />
                </div>
                {domain.verificationMessage ? <p className="mt-2 text-xs text-muted">{domain.verificationMessage}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <PillButton onClick={() => onVerifyDomain(domain)} disabled={!connected || Boolean(action)}>{action === "verify" ? "Checking" : "Verify DNS"}</PillButton>
                  <ActionLink href={domain.status === "ready" ? `https://${domain.hostname.replace(/^\*\./, "")}` : null}>Open HTTPS</ActionLink>
                  <PillButton onClick={() => onRemoveDomain(domain)} disabled={!connected || Boolean(action)}>{action === "remove" ? "Removing" : "Remove"}</PillButton>
                </div>
              </div>
            );
          })}

          <ResourceSection title="GitHub repository" count={github?.repositories.length || 0} />
          <div className="border-b border-white/5 px-4 py-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ReadinessCard label="App" value={github?.configured ? "configured" : "missing"} status={github?.configured ? "ok" : "warn"} />
              <ReadinessCard label="Webhook" value={github?.webhookSecretConfigured ? "signed" : "missing"} status={github?.webhookSecretConfigured ? "ok" : "error"} />
              <ReadinessCard label="Key" value={github?.privateKeyConfigured ? "ready" : "later"} status={github?.privateKeyConfigured ? "ok" : "warn"} />
              <ReadinessCard label="Repos" value={String(github?.repositories.length || 0)} status={github?.repositories.length ? "ok" : "warn"} />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(120px,0.8fr)_minmax(0,1.2fr)_110px_auto]">
              <UiSelect value={githubForm.appId} onChange={(event) => onGithubFormChange({ ...githubForm, appId: event.target.value })} disabled={!connected || githubSaving} label="App">
                <option value="">Choose app</option>
                {apps.map((app) => <option key={app.id} value={app.id}>{app.name}</option>)}
              </UiSelect>
              <Field label="Repository" value={githubForm.fullName} onChange={(value) => onGithubFormChange({ ...githubForm, fullName: value })} placeholder="owner/repo" disabled={!connected || githubSaving} />
              <Field label="Branch" value={githubForm.branch} onChange={(value) => onGithubFormChange({ ...githubForm, branch: value })} placeholder="main" disabled={!connected || githubSaving} />
              <div className="flex items-end">
                <PillButton onClick={onGithubConnect} disabled={!connected || githubSaving || !githubForm.appId || !githubForm.fullName.trim()} strong>{githubSaving ? "Saving" : "Connect"}</PillButton>
              </div>
            </div>
            <label className="mt-3 flex items-center justify-between gap-3 rounded-md bg-black/20 px-3 py-2 text-xs">
              <span><span className="font-bold">Auto deploy on push</span><span className="block text-muted">Only matching branch push events can queue deployments.</span></span>
              <input type="checkbox" checked={githubForm.autoDeploy} onChange={(event) => onGithubFormChange({ ...githubForm, autoDeploy: event.target.checked })} disabled={githubSaving} className="h-4 w-4 accent-[var(--accent)]" />
            </label>
          </div>

          {github?.repositories.length ? github.repositories.map((repo) => (
            <div key={repo.id} className="border-b border-white/5 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-bold">{repo.fullName}</p>
                  <p className="mt-1 text-[11px] text-muted">{repo.connectedAppName || "not connected"} · {repo.selectedBranch || repo.defaultBranch || "branch not set"} · {repo.private ? "private" : "public"}</p>
                </div>
                <StatusBadge status={repo.autoDeployEnabled ? "running" : "stopped"} />
              </div>
            </div>
          )) : <div className="border-b border-white/5 px-4 py-5 text-sm text-muted">Connect a repository to store source metadata and enable signed push-to-deploy.</div>}

          <ResourceSection title="Webhook deliveries" count={recentDeliveries.length} />
          {recentDeliveries.length === 0 ? <div className="border-b border-white/5 px-4 py-5 text-sm text-muted">Signed push deliveries will appear here after GitHub sends webhooks.</div> : recentDeliveries.map((delivery) => (
            <div key={delivery.deliveryId} className="border-b border-white/5 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{delivery.repo || delivery.event}</p>
                  <p className="mt-1 truncate font-mono text-[11px] text-muted">{delivery.branch || "-"} · {delivery.commitSha?.slice(0, 7) || "no commit"} · {timeAgo(delivery.receivedAt)}</p>
                </div>
                <StatusBadge status={delivery.status} />
              </div>
              {delivery.message ? <p className="mt-2 text-xs text-muted">{delivery.message}</p> : null}
            </div>
          ))}

          <ResourceSection title="Recent deployment phases" count={recent.length} />
          {recent.length === 0 ? (
            <div className="px-4 py-5 text-sm text-muted">Deployment history will appear here after the first Dockerfile deploy.</div>
          ) : recent.map((deployment) => (
            <DeploymentSummaryRow key={deployment.id} deployment={deployment} onLogs={() => onLogs(deployment)} />
          ))}
          <div className="border-t border-white/5 bg-black/20 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {['Backups', 'Metrics', 'Rollback'].map((item) => (
                <span key={item} className="rounded-full bg-surface-raised px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted/60">{item} locked</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DeploymentSummaryRow({ deployment, onLogs }: { deployment: DaemonDeployment; onLogs: () => void }) {
  return (
    <button type="button" onClick={onLogs} className={`block w-full border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/[0.035] ${FOCUS_RING}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">#{deployment.id} {deployment.appName || `app ${deployment.appId}`}</p>
          <p className="mt-1 truncate text-[11px] text-muted">{deployment.phase} · {deployment.startedAt ? timeAgo(deployment.startedAt) : timeAgo(deployment.createdAt)}</p>
        </div>
        <StatusBadge status={deployment.status} />
      </div>
    </button>
  );
}

// Kept during the IA split as reference for the older combined data panel.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DatabaseBackupPanel({
  backupActionById,
  backupForm,
  backupJobs,
  backupRuns,
  backupsError,
  connected,
  databaseActionById,
  databaseForm,
  databaseSaving,
  databases,
  databasesError,
  onBackupFormChange,
  onCreateDatabase,
  onDatabaseAction,
  onDatabaseFormChange,
  onEnableBackup,
  onRunBackup,
  onToggleBackup
}: {
  backupActionById: Record<number, string | null>;
  backupForm: { databaseId: string; schedule: string; retentionDays: string };
  backupJobs: DaemonBackupJob[];
  backupRuns: DaemonBackupRun[];
  backupsError: string | null;
  connected: boolean;
  databaseActionById: Record<number, string | null>;
  databaseForm: { type: string; name: string };
  databaseSaving: boolean;
  databases: DaemonDatabase[];
  databasesError: string | null;
  onBackupFormChange: (form: { databaseId: string; schedule: string; retentionDays: string }) => void;
  onCreateDatabase: () => void;
  onDatabaseAction: (database: DaemonDatabase, action: "start" | "stop") => void;
  onDatabaseFormChange: (form: { type: string; name: string }) => void;
  onEnableBackup: () => void;
  onRunBackup: (job: DaemonBackupJob) => void;
  onToggleBackup: (job: DaemonBackupJob, enabled: boolean) => void;
}) {
  const latestRun = backupRuns[0] || null;
  return (
    <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW} lg:col-span-2`}>
      <div className="grid gap-3 border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent px-4 py-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Databases & backups</p>
          <h2 className="text-lg font-bold leading-tight sm:text-xl">Internal services with local-file backups</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">Create supported database services, keep them internal by default, and run manual or scheduled local backups.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ReadinessCard label="Databases" value={String(databases.length)} status={databases.length ? "ok" : "warn"} />
          <ReadinessCard label="Backups" value={String(backupJobs.length)} status={backupJobs.length ? "ok" : "warn"} />
          <ReadinessCard label="Latest" value={latestRun?.status || "never"} status={latestRun?.status === "succeeded" ? "ok" : latestRun?.status === "failed" ? "error" : "warn"} />
          <ReadinessCard label="Storage" value="local file" status="ok" />
        </div>
      </div>

      {databasesError ? <Alert title="Database action failed" message={databasesError} /> : null}
      {backupsError ? <Alert title="Backup action failed" message={backupsError} /> : null}

      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
        <div className="min-w-0 border-b border-white/5 xl:border-b-0 xl:border-r">
          <ResourceSection title="Database services" count={databases.length} />
          <div className="border-b border-white/5 px-4 py-3">
            <div className="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)_auto]">
              <UiSelect value={databaseForm.type} onChange={(event) => onDatabaseFormChange({ ...databaseForm, type: event.target.value, name: databaseForm.name || event.target.value })} disabled={!connected || databaseSaving} label="Type" options={["postgres", "mysql", "mariadb", "redis", "mongodb"]} />
              <Field label="Name" value={databaseForm.name} onChange={(value) => onDatabaseFormChange({ ...databaseForm, name: value })} placeholder="postgres" disabled={!connected || databaseSaving} />
              <div className="flex items-end"><PillButton strong onClick={onCreateDatabase} disabled={!connected || databaseSaving || !databaseForm.name.trim()}>{databaseSaving ? "Creating" : "Create"}</PillButton></div>
            </div>
          </div>

          {databases.length === 0 ? <div className="px-4 py-5 text-sm text-muted">No production database records yet. Create one to add a Compose-backed internal service.</div> : databases.map((database) => {
            const busy = databaseActionById[database.id];
            const running = database.status === "running";
            return (
              <div key={database.id} className="border-b border-white/5 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{database.name}</p>
                    <p className="mt-1 truncate font-mono text-[11px] text-muted">{database.image || database.type} · {database.composeService || "compose"} · {database.volumeName || "volume pending"}</p>
                  </div>
                  <StatusBadge status={database.status} />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <ReadinessCard label="Network" value={database.internal ? "internal" : "public"} status={database.internal ? "ok" : "error"} />
                  <ReadinessCard label="Port" value={database.port ? `:${database.port}` : "none"} status="ok" />
                  <ReadinessCard label="Env" value={`${database.envKeys.length} keys`} status="ok" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <PillButton onClick={() => onDatabaseAction(database, "start")} disabled={!connected || Boolean(busy) || running}>{busy === "start" ? "Starting" : "Start"}</PillButton>
                  <PillButton onClick={() => onDatabaseAction(database, "stop")} disabled={!connected || Boolean(busy) || !running}>{busy === "stop" ? "Stopping" : "Stop"}</PillButton>
                </div>
              </div>
            );
          })}
        </div>

        <div className="min-w-0">
          <ResourceSection title="Backup jobs" count={backupJobs.length} />
          <div className="border-b border-white/5 px-4 py-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(120px,0.9fr)_minmax(0,1fr)_100px_auto]">
              <UiSelect value={backupForm.databaseId} onChange={(event) => onBackupFormChange({ ...backupForm, databaseId: event.target.value })} disabled={!connected || databases.length === 0} label="Database">
                <option value="">Choose</option>
                {databases.map((database) => <option key={database.id} value={database.id}>{database.name}</option>)}
              </UiSelect>
              <Field label="Schedule" value={backupForm.schedule} onChange={(value) => onBackupFormChange({ ...backupForm, schedule: value })} placeholder="0 2 * * *" disabled={!connected} mono />
              <Field label="Keep days" value={backupForm.retentionDays} onChange={(value) => onBackupFormChange({ ...backupForm, retentionDays: value })} placeholder="7" disabled={!connected} type="number" />
              <div className="flex items-end"><PillButton strong onClick={onEnableBackup} disabled={!connected || !backupForm.databaseId}>Enable</PillButton></div>
            </div>
          </div>

          {backupJobs.length === 0 ? <div className="border-b border-white/5 px-4 py-5 text-sm text-muted">Enable backups for a database to schedule local backup files and run manual backups.</div> : backupJobs.map((job) => {
            const busy = backupActionById[job.id];
            return (
              <div key={job.id} className="border-b border-white/5 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{job.databaseName || `database ${job.databaseId}`}</p>
                    <p className="mt-1 truncate font-mono text-[11px] text-muted">{job.schedule || "manual only"} · retain {job.retentionDays}d · {job.localDir || "default backup dir"}</p>
                  </div>
                  <StatusBadge status={job.enabled ? "running" : "stopped"} />
                </div>
                {job.lastRunMessage ? <p className="mt-2 text-xs text-muted">Last run: {job.lastRunStatus || "unknown"} · {job.lastRunAt ? timeAgo(job.lastRunAt) : "never"} · {job.lastRunMessage}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <PillButton onClick={() => onRunBackup(job)} disabled={!connected || Boolean(busy)}>{busy === "run" ? "Running" : "Run now"}</PillButton>
                  <PillButton onClick={() => onToggleBackup(job, !job.enabled)} disabled={!connected || Boolean(busy)}>{job.enabled ? "Disable" : "Enable"}</PillButton>
                </div>
              </div>
            );
          })}

          <ResourceSection title="Backup runs" count={backupRuns.length} />
          {backupRuns.length === 0 ? <div className="px-4 py-5 text-sm text-muted">Backup run history will appear here after a manual or scheduled run.</div> : backupRuns.slice(0, 6).map((run) => (
            <div key={run.id} className="border-b border-white/5 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">#{run.id} {run.databaseName || `database ${run.databaseId}`}</p>
                  <p className="mt-1 truncate font-mono text-[11px] text-muted">{run.trigger} · {run.finishedAt ? timeAgo(run.finishedAt) : timeAgo(run.createdAt)} · {formatBytes(run.sizeBytes)}</p>
                </div>
                <StatusBadge status={run.status} />
              </div>
              <p className="mt-2 truncate text-xs text-muted">{run.filePath || run.message || "no backup file"}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DetailPanel({
  activeTab,
  app,
  connected,
  currentAction,
  deploymentLogs,
  deploymentLogsError,
  deploymentLogsLoading,
  deployments,
  domains,
  github,
  deploying,
  error,
  loading,
  logs,
  onAction,
  onDeploy,
  onDeploymentLogs,
  onEdit,
  onReload
}: {
  activeTab?: InspectorTab;
  app: DaemonApp | null;
  connected: boolean;
  currentAction?: AppAction | null;
  deploymentLogs: DeploymentLogsResponse | null;
  deploymentLogsError: string | null;
  deploymentLogsLoading: boolean;
  deployments: DaemonDeployment[];
  domains: DaemonDomain[];
  github: DaemonGithubStatus | null;
  deploying: boolean;
  error: string | null;
  loading: boolean;
  logs: DaemonAppLogsResponse | null;
  onAction?: (action: AppAction) => void;
  onDeploy?: () => void;
  onDeploymentLogs?: (deployment: DaemonDeployment) => void;
  onEdit?: () => void;
  onReload?: () => void;
}) {
  const [tab, setTab] = useState<InspectorTab>(activeTab || "overview");
  const [appEnv, setAppEnv] = useState<AppEnvResponse["env"] | null>(null);
  const [appHealth, setAppHealth] = useState<AppHealthResponse["health"] | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [appMetrics, setAppMetrics] = useState<DaemonMetricSample[]>([]);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);
  const [envLoading, setEnvLoading] = useState(false);
  const [envSaving, setEnvSaving] = useState(false);
  const [envForm, setEnvForm] = useState({ key: "", value: "", isSecret: true, scope: "all" });
  const selectedTab = activeTab || tab;

  const loadEnv = useCallback(async (target: DaemonApp) => {
    setEnvLoading(true);
    setEnvError(null);
    try {
      const response = await fetch(`/api/apps/${target.id}/env`, { cache: "no-store" });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as AppEnvResponse;
      setAppEnv(data.env);
    } catch (error) {
      setEnvError(error instanceof Error ? error.message : "Could not load environment variables.");
    } finally {
      setEnvLoading(false);
    }
  }, []);

  const loadHealthAndMetrics = useCallback(async (target: DaemonApp) => {
    setHealthLoading(true);
    setMetricsLoading(true);
    setHealthError(null);
    setMetricsError(null);
    try {
      const [healthResponse, metricsResponse] = await Promise.all([
        fetch(`/api/apps/${target.id}/health`, { cache: "no-store" }),
        fetch(`/api/apps/${target.id}/metrics`, { cache: "no-store" })
      ]);
      if (!healthResponse.ok) throw new Error(await readError(healthResponse));
      const healthData = (await healthResponse.json()) as AppHealthResponse;
      setAppHealth(healthData.health);
      if (!metricsResponse.ok) throw new Error(await readError(metricsResponse));
      const metricsData = (await metricsResponse.json()) as AppMetricsResponse;
      setAppMetrics(metricsData.metrics || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load health and metrics.";
      setHealthError(message);
      setMetricsError(message);
    } finally {
      setHealthLoading(false);
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!app) {
      return;
    }
    const timer = window.setTimeout(() => {
      void loadEnv(app);
      void loadHealthAndMetrics(app);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [app, loadEnv, loadHealthAndMetrics]);

  async function saveEnv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!app || !envForm.key.trim()) return;
    setEnvSaving(true);
    setEnvError(null);
    try {
      const response = await fetch(`/api/apps/${app.id}/env`, {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: envForm.key.trim(), value: envForm.value, isSecret: envForm.isSecret, scope: envForm.scope })
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as AppEnvResponse;
      setAppEnv(data.env);
      setEnvForm({ key: "", value: "", isSecret: true, scope: "all" });
    } catch (error) {
      setEnvError(error instanceof Error ? error.message : "Could not save environment variable.");
    } finally {
      setEnvSaving(false);
    }
  }

  async function unsetEnv(key: string) {
    if (!app) return;
    setEnvSaving(true);
    setEnvError(null);
    try {
      const response = await fetch(`/api/apps/${app.id}/env/${encodeURIComponent(key)}`, {
        method: "DELETE",
        cache: "no-store"
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as AppEnvResponse;
      setAppEnv(data.env);
    } catch (error) {
      setEnvError(error instanceof Error ? error.message : `Could not unset ${key}.`);
    } finally {
      setEnvSaving(false);
    }
  }

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
  const latestDeployment = deployments[0] || null;
  const canDeploy = app.driver === "dockerfile" && Boolean(app.path) && app.enabled && connected;
  const healthStatus = appHealth?.status || "unknown";
  const latestMetric = appMetrics[0] || null;
  const redeployPending = envRedeployLabel(app, appEnv?.pending.needsRedeploy);

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
          <PillButton onClick={onDeploy} disabled={!canDeploy || deploying} strong>{deploying ? "Deploying" : "Deploy"}</PillButton>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 border-b border-white/5 bg-black/20 px-2 py-2 sm:grid-cols-4">
        {(["overview", "health", "metrics", "deployments", "domains", "proxy", "github", "env", "logs", "config"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-2 py-1.5 text-[11px] font-bold capitalize ${FOCUS_RING} ${selectedTab === item ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground"}`}>{item}</button>
        ))}
      </div>

      {selectedTab === "overview" ? (
        <div className="px-4 py-4">
          <div className="mb-4 grid grid-cols-3 gap-2">
            <ReadinessCard label="Health" value={healthStatus} status={healthStatus === "healthy" ? "ok" : healthStatus === "unknown" ? "warn" : "error"} />
            <ReadinessCard label="CPU" value={latestMetric?.cpuPercent == null ? "-" : `${latestMetric.cpuPercent.toFixed(1)}%`} status="ok" />
            <ReadinessCard label="Memory" value={latestMetric ? formatBytes(latestMetric.memoryBytes) : "-"} status="ok" />
          </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-xs">
          <Meta label="Type" value={app.type} />
          <Meta label="Driver" value={app.driver} />
          <Meta label="Preset" value={app.preset} />
          <Meta label="Port" value={app.port ? String(app.port) : "-"} mono />
          <Meta label="Updated" value={timeAgo(app.updatedAt)} />
          <Meta label="Latest deploy" value={latestDeployment ? `${latestDeployment.status} #${latestDeployment.id}` : "never"} />
          <Meta label="Settings state" value={pendingStateLabel(app)} />
          <Meta label="Temporary URL" value={latestDeployment?.hostPort ? `http://127.0.0.1:${latestDeployment.hostPort}` : "-"} mono wide />
          <Meta label="Production domains" value={domains.map((domain) => `${domain.hostname} (${domain.status})`).join(", ") || "none"} mono wide />
          <Meta label="Path" value={app.path || "-"} mono wide />
          <Meta label="Healthcheck" value={app.healthcheck?.path ? `${app.healthcheck.path} -> ${app.healthcheck.expected_status || 200}` : "container state"} wide />
        </dl>
        </div>
      ) : null}

      {selectedTab === "health" ? (
        <div>
          <div className="border-b border-white/5 px-4 py-3">
            <div className="grid grid-cols-3 gap-2">
              <ReadinessCard label="State" value={healthStatus} status={healthStatus === "healthy" ? "ok" : healthStatus === "unknown" ? "warn" : "error"} />
              <ReadinessCard label="Response" value={appHealth?.checks[0]?.responseTimeMs == null ? "-" : `${appHealth.checks[0].responseTimeMs}ms`} status="ok" />
              <ReadinessCard label="Checks" value={String(appHealth?.checks.length || 0)} status={appHealth?.checks.length ? "ok" : "warn"} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PillButton onClick={() => void loadHealthAndMetrics(app)} disabled={!connected || healthLoading || metricsLoading}>{healthLoading || metricsLoading ? "Refreshing" : "Refresh health"}</PillButton>
              {healthError ? <span className="text-xs text-negative">{healthError}</span> : null}
            </div>
          </div>

          {appHealth?.checks.length === 0 && !healthLoading ? <div className="px-4 py-5 text-sm text-muted">No health sample recorded yet. Refresh health to evaluate the configured endpoint or runtime state.</div> : null}
          {appHealth?.checks.map((check) => (
            <div key={check.id} className="border-b border-white/5 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold capitalize">{check.target} health</p>
                  <p className="mt-1 truncate text-[11px] text-muted">{check.message || "No message"}</p>
                </div>
                <StatusBadge status={check.status} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted">
                <Meta label="Path" value={check.path || "runtime state"} mono />
                <Meta label="HTTP" value={check.httpStatus == null ? "-" : String(check.httpStatus)} mono />
                <Meta label="Response" value={check.responseTimeMs == null ? "-" : `${check.responseTimeMs}ms`} mono />
                <Meta label="Checked" value={timeAgo(check.checkedAt)} />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {selectedTab === "metrics" ? (
        <div>
          <div className="border-b border-white/5 px-4 py-3">
            <div className="grid grid-cols-3 gap-2">
              <ReadinessCard label="Samples" value={String(appMetrics.length)} status={appMetrics.length ? "ok" : "warn"} />
              <ReadinessCard label="CPU" value={latestMetric?.cpuPercent == null ? "-" : `${latestMetric.cpuPercent.toFixed(1)}%`} status="ok" />
              <ReadinessCard label="Memory" value={latestMetric ? formatBytes(latestMetric.memoryBytes) : "-"} status="ok" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PillButton onClick={() => void loadHealthAndMetrics(app)} disabled={!connected || healthLoading || metricsLoading}>{metricsLoading ? "Refreshing" : "Refresh metrics"}</PillButton>
              {metricsError ? <span className="text-xs text-negative">{metricsError}</span> : null}
            </div>
          </div>
          <div className="border-b border-white/5 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Container and app samples</p>
            <div className="mt-3 grid gap-2">
              {appMetrics.length === 0 ? <p className="text-sm text-muted">No metrics sampled yet. Refresh metrics to collect available host or container data for this app.</p> : null}
              {appMetrics.slice(0, 10).map((sample) => <MetricSampleRow key={sample.id} sample={sample} />)}
            </div>
          </div>
        </div>
      ) : null}

      {selectedTab === "deployments" ? (
        <div>
          {deployments.length === 0 ? <div className="px-4 py-6 text-sm text-muted">No deployments recorded for this app.</div> : deployments.map((deployment) => (
            <DeploymentTimeline key={deployment.id} deployment={deployment} onLogs={onDeploymentLogs ? () => onDeploymentLogs(deployment) : undefined} />
          ))}
        </div>
      ) : null}

      {selectedTab === "domains" ? (
        <div>
          {domains.length === 0 ? <div className="px-4 py-6 text-sm text-muted">No domains are attached to this app.</div> : domains.map((domain) => (
            <div key={domain.id} className="border-b border-white/5 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-bold">{domain.hostname}</p>
                  <p className="mt-1 text-[11px] text-muted">target {domain.targetPort ? `:${domain.targetPort}` : "pending"} · {domain.verificationMessage || "verification pending"}</p>
                </div>
                <StatusBadge status={domain.status} />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {selectedTab === "proxy" ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 px-4 py-4 text-xs">
          <Meta label="Proxy exposure" value={app.internal || app.type === "database" ? "blocked" : "allowed after DNS verification"} />
          <Meta label="HTTPS" value={domains.some((domain) => domain.tlsStatus === "issuing" || domain.tlsStatus === "active") ? "route generated" : "pending"} />
          <Meta label="Public routes" value={domains.map((domain) => `${domain.hostname}:${domain.tlsStatus}`).join(", ") || "none"} mono wide />
        </dl>
      ) : null}

      {selectedTab === "github" ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 px-4 py-4 text-xs">
          <Meta label="GitHub App" value={github?.configured ? "configured" : "not configured"} />
          <Meta label="Webhook" value={github?.webhookSecretConfigured ? "signed" : "missing secret"} />
          <Meta label="Repository" value={app.source?.repo || "not connected"} mono wide />
          <Meta label="Branch" value={app.source?.branch || "main/master default"} mono />
          <Meta label="Auto deploy" value={app.source?.auto_deploy?.enabled === false ? "disabled" : app.source?.type === "github" ? "enabled" : "not connected"} />
          <Meta label="Recent delivery" value={github?.deliveries.find((delivery) => delivery.appId === app.id || delivery.repo === app.source?.repo)?.status || "none"} wide />
        </dl>
      ) : null}

      {selectedTab === "env" ? (
        <div>
          <div className="border-b border-white/5 px-4 py-3">
            <div className="grid grid-cols-3 gap-2">
              <ReadinessCard label="Stored" value={String(appEnv?.pending.count || 0)} status={appEnv?.pending.count ? "ok" : "warn"} />
              <ReadinessCard label="Restart" value={appEnv?.pending.needsRestart ? "needed" : "clean"} status={appEnv?.pending.needsRestart ? "warn" : "ok"} />
              <ReadinessCard label="Redeploy" value={redeployPending.label} status={redeployPending.status} />
            </div>
            <p className="mt-3 text-xs text-muted">Stored env values override portable `routely.yml` env at runtime. Secret values are hidden after save and injected into local starts and Dockerfile deployments.</p>
          </div>

          {envError ? <div className="border-b border-negative/20 bg-negative/10 px-4 py-2 text-xs text-negative">{envError}</div> : null}

          <form onSubmit={saveEnv} className="border-b border-white/5 px-4 py-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(100px,0.8fr)_minmax(0,1fr)]">
              <Field label="Key" value={envForm.key} onChange={(value) => setEnvForm((current) => ({ ...current, key: value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") }))} placeholder="DATABASE_URL" disabled={!connected || envSaving} mono />
              <Field label="Value" value={envForm.value} onChange={(value) => setEnvForm((current) => ({ ...current, value }))} placeholder="stored outside routely.yml" disabled={!connected || envSaving} mono />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(110px,0.8fr)_minmax(0,1fr)_auto] sm:items-end">
              <UiSelect value={envForm.scope} onChange={(event) => setEnvForm((current) => ({ ...current, scope: event.target.value }))} disabled={!connected || envSaving} label="Scope">
                <option value="all">all</option>
                <option value="local">local</option>
                <option value="production">production</option>
              </UiSelect>
              <label className={`flex min-h-10 items-center justify-between rounded-full bg-surface-raised px-3 ${INSET_RING} ${!connected || envSaving ? "opacity-60" : ""}`}>
                <span className="text-xs font-bold">Secret value</span>
                <input type="checkbox" checked={envForm.isSecret} onChange={(event) => setEnvForm((current) => ({ ...current, isSecret: event.target.checked }))} disabled={!connected || envSaving} className="h-4 w-4 accent-[var(--accent)]" />
              </label>
              <PillButton type="submit" strong disabled={!connected || envSaving || !envForm.key.trim()}>{envSaving ? "Saving" : "Set env"}</PillButton>
            </div>
          </form>

          {envLoading && !appEnv ? <div className="px-4 py-5 text-sm text-muted">Loading env vars...</div> : null}
          {appEnv?.vars.length === 0 ? <div className="px-4 py-5 text-sm text-muted">No stored env vars yet. Non-secret defaults can still live in the registry config tab.</div> : null}
          {appEnv?.vars.map((row) => (
            <div key={row.id} className="border-b border-white/5 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-bold">{row.key}</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-muted">{row.displayValue}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{row.scope}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${row.isSecret ? "bg-warning/15 text-warning" : "bg-white/10 text-muted"}`}>{row.isSecret ? "secret" : "plain"}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {row.needsRestart ? <span className="rounded-full bg-warning/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-warning">restart needed</span> : null}
                {row.needsRedeploy && appCanRedeploy(app) ? <span className="rounded-full bg-warning/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-warning">redeploy needed</span> : null}
                {row.needsRedeploy && !appCanRedeploy(app) ? <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">local only</span> : null}
                <PillButton onClick={() => void unsetEnv(row.key)} disabled={!connected || envSaving}>Unset</PillButton>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {selectedTab === "config" ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 px-4 py-4 text-xs">
          <Meta label="Enabled" value={app.enabled ? "yes" : "no"} />
          <Meta label="Internal" value={app.internal ? "yes" : "no"} />
          <Meta label="Install" value={app.install || "-"} mono wide />
          <Meta label="Dev" value={app.dev || app.command || "-"} mono wide />
          <Meta label="Build" value={app.build || "-"} mono wide />
          <Meta label="Start" value={app.start || "-"} mono wide />
          <Meta label="Image" value={app.image || "-"} mono wide />
          <Meta label="Compose" value={[app.composeFile, app.composeService].filter(Boolean).join(" / ") || "generated"} mono wide />
          <Meta label="Depends on" value={(app.dependsOn || []).join(", ") || "-"} wide />
          <Meta label="Domains" value={(app.domains || []).join(", ") || "locked"} wide />
          <Meta label="Source" value={app.source?.repo ? `${app.source.repo}:${app.source.branch || "main"}` : "-"} mono wide />
          <Meta label="Volumes" value={(app.volumes || []).join(", ") || "-"} mono wide />
          <Meta label="Env" value={Object.keys(app.env || {}).length > 0 ? Object.keys(app.env || {}).join(", ") : "-"} mono wide />
        </dl>
      ) : null}

      {selectedTab === "logs" ? <div className="border-t border-white/5">
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
        <div className="border-t border-white/5 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Deployment logs</p>
          {deploymentLogsError ? <p className="mt-2 text-xs text-negative">{deploymentLogsError}</p> : null}
          <pre className="mt-2 max-h-[260px] overflow-auto whitespace-pre-wrap rounded-md bg-black/45 px-3 py-3 font-mono text-xs leading-5 text-[#d9d9d9]">
            {deploymentLogsLoading && !deploymentLogs ? "Loading deployment logs..." : deploymentLogs?.logs.map((log) => log.message).join("") || "Select a deployment log from the deploy panel or Deployments tab."}
          </pre>
        </div>
      </div> : null}
    </aside>
  );
}

function DeploymentTimeline({ deployment, onLogs }: { deployment: DaemonDeployment; onLogs?: () => void }) {
  const phases = ["queued", "preparing", "building", "starting", "healthchecking", deployment.status === "failed" ? "failed" : "succeeded"];
  const currentIndex = phases.indexOf(deployment.phase);
  return (
    <div className="border-b border-white/5 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">Deployment #{deployment.id}</p>
          <p className="truncate text-[11px] text-muted">{deployment.containerName || "container pending"}</p>
        </div>
        <StatusBadge status={deployment.status} />
      </div>
      <div className="mt-3 grid gap-1.5">
        {phases.map((phase, index) => (
          <div key={phase} className="flex items-center gap-2 text-xs">
            <span className={`h-2 w-2 rounded-full ${index <= currentIndex ? "bg-accent" : "bg-white/15"}`} />
            <span className={index <= currentIndex ? "font-bold text-foreground" : "text-muted"}>{phase}</span>
          </div>
        ))}
      </div>
      {deployment.errorMessage ? <p className="mt-2 text-xs text-negative">{deployment.errorMessage}</p> : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {deployment.hostPort ? <ActionLink href={`http://127.0.0.1:${deployment.hostPort}`}>Open</ActionLink> : null}
        <PillButton onClick={onLogs} disabled={!onLogs}>Logs</PillButton>
      </div>
    </div>
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
    <UiTextAreaField
      disabled={disabled}
      label={label}
      mono={mono}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={3}
      value={value}
    />
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
    <UiField
      disabled={disabled}
      error={error}
      label={label}
      mono={mono}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      required={required}
      type={type}
      value={value}
      wide={wide}
    />
  );
}

function SelectField({ disabled, label, onChange, value, values }: { disabled?: boolean; label: string; onChange: (value: string) => void; value: string; values: string[] }) {
  return (
    <UiSelect
      disabled={disabled}
      label={label}
      onChange={(event) => onChange(event.target.value)}
      options={values}
      value={value}
    />
  );
}

function RoundAction({ active, disabled, label, onClick }: { active?: boolean; disabled?: boolean; label: string; onClick: () => void }) {
  return (
    <Button onClick={onClick} disabled={disabled} loading={active} loadingLabel="Working" variant={active ? "primary" : "secondary"}>
      {active ? "Working" : label}
    </Button>
  );
}

function PillButton({ children, disabled, onClick, strong, type = "button" }: { children: ReactNode; disabled?: boolean; onClick?: () => void; strong?: boolean; type?: "button" | "submit" }) {
  return (
    <Button type={type} onClick={onClick} disabled={disabled} variant={strong ? "primary" : "secondary"}>
      {children}
    </Button>
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
    <UiAlert className="border-x-0 border-t-0" title={title} variant="danger">
      {message}
    </UiAlert>
  );
}

function LoadingRows() {
  return <SkeletonRows />;
}

function EmptyState({ connected, onAdd }: { connected: boolean; onAdd: () => void }) {
  return (
    <UiEmptyState
      action={<PillButton onClick={onAdd} strong disabled={!connected}>Add app</PillButton>}
      icon="R"
      message="Create a command app here or sync an existing `routely.yml` registry."
      title="No local apps registered"
    />
  );
}
