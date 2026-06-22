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
import { DashboardShell } from "@/components/dashboard-shell/dashboard-shell";
import { ModuleHeader } from "@/components/dashboard-shell/module-header";
import type { DashboardModuleKey, ServerRailSignal } from "@/components/dashboard-shell/types";
import { appActionBlockReason, appSupportsBulkStart, bulkStartSkipReason, bulkStartStateLabel, isAppRuntimeRunning, startAllBlockReason, startAllPlan, type BulkStartPlan } from "@/lib/app-lifecycle";
import { APP_DRIVERS, APP_PRESETS, APP_TYPES, appDriverPatch, appFormFromDaemonApp, appFormPayload, appFormValidationError, blankAppForm, type AppFormState } from "@/lib/app-registry-form";
import { backupRestoreLabel, backupRunFileState, backupStorageLabel, databaseExposureLabel, deploymentLogsLabel, deploymentStateLabel, domainDnsLabel, domainProxyLabel, domainTargetLabel, domainTlsLabel, envVisibilityLabel, githubConnectionState, githubDeliveryLogPath, githubDeliveryState, githubLatestDelivery, githubRepositoryBranch, isDeploymentInProgress, latestDeployment, latestSuccessfulDeployment, logAvailabilityLabel, productionAuthState, safeEnvDisplay } from "@/lib/dashboard-operations";

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
  envKeys?: string[];
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

type DaemonAppStartAllResponse = {
  started: Array<{ app: DaemonApp; pid?: number | null }>;
  skipped: Array<{ app: DaemonApp; code: string; reason: string }>;
  failed: Array<{ app: DaemonApp; code: string; error: string }>;
  apps: DaemonApp[];
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
  logsUrl?: string | null;
  logsStreamUrl?: string | null;
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
  available?: boolean;
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
  connectionScope?: string;
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
  retentionStatus?: string;
  storageType?: string;
  storageStatus?: string;
  restoreStatus?: string;
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
  storageType?: string;
  storageStatus?: string;
  restoreStatus?: string;
  downloadUrl?: string | null;
  filePath: string | null;
  fileName?: string | null;
  file?: {
    available: boolean;
    path: string | null;
    name: string | null;
    sizeBytes: number | null;
    servesFile: boolean;
    downloadUrl: string | null;
  };
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
  health: { status: string; available?: boolean; reason?: string | null; message?: string | null; checkedAt?: string | null; checks: DaemonHealthcheck[] };
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
  proxyStatus?: string | null;
  targetPort: number | null;
  targetDeploymentId?: number | null;
  targetUrl?: string | null;
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
  status?: string | null;
  domainStatus?: string | null;
  dnsStatus?: string | null;
  tlsStatus?: string | null;
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
type InspectorTab = "overview" | "runtime" | "env" | "logs" | "health" | "deployments" | "domains";

const POLL_INTERVAL_MS = 4000;
const PANEL_SHADOW = "shadow-[var(--panel-shadow)]";
const INSET_RING = "shadow-[var(--inset-border)]";
const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

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

function timeValue(iso: string | null | undefined): number {
  if (!iso) return 0;
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : 0;
}

function appUrl(app: DaemonApp): string | null {
  return app.port ? `http://localhost:${app.port}` : null;
}

function appCanRedeploy(app: DaemonApp): boolean {
  return app.driver === "dockerfile";
}

function serverCheck(server: DaemonServerStatus | null, id: string): DaemonServerCheck | undefined {
  return server?.readiness?.checks.find((check) => check.id === id);
}

function deployBlockReason(app: DaemonApp, connected: boolean, server: DaemonServerStatus | null): string | null {
  if (!connected) return "daemon offline";
  if (!app.enabled) return "resource disabled";
  if (!appCanRedeploy(app)) return "deploy deferred for this driver";
  if (!app.path) return "Dockerfile path missing";
  if (!server) return "server status unavailable";
  if (serverCheck(server, "docker")?.status !== "ok") return "Docker not ready";
  if (!server.dataDir) return "data dir pending";
  if (server.auth.required && !server.auth.configured) return "auth missing";
  if (server.readiness && !server.readiness.ok) return "server doctor check";
  return null;
}

function pendingStateLabel(app: DaemonApp): string {
  const restart = app.needsRestart;
  const redeploy = app.needsRedeploy && appCanRedeploy(app);
  const localOnly = app.needsRedeploy && !appCanRedeploy(app);
  if (restart && redeploy) return "restart + redeploy needed";
  if (restart) return "restart needed";
  if (redeploy) return "redeploy needed";
  if (localOnly) return "local restart applies";
  return "no pending changes";
}

function envRedeployLabel(app: DaemonApp, needsRedeploy?: boolean): { label: string; status: "ok" | "warn" } {
  if (!needsRedeploy) return { label: "no pending", status: "ok" };
  return appCanRedeploy(app)
    ? { label: "needed", status: "warn" }
    : { label: "not deployable", status: "ok" };
}

function shortPath(path: string | null): string {
  if (!path) return "-";
  const parts = path.split("/").filter(Boolean);
  return parts.length > 3 ? `.../${parts.slice(-3).join("/")}` : path;
}

function compactSource(app: DaemonApp): string {
  if (app.source?.repo) return `${app.source.repo}:${app.source.branch || "main"}`;
  if (app.image) return app.image;
  return app.driver === "compose" ? app.composeService || app.image || "compose service" : app.command || app.dev || "no command";
}

function domainSummary(domains: DaemonDomain[]): string {
  if (domains.length === 0) return "no domain";
  const ready = domains.filter((domain) => (domain.status === "ready" || domain.status === "generated") && domain.dnsStatus === "verified" && ["active", "verified"].includes(domain.tlsStatus)).length;
  return ready === domains.length ? `${domains.length} ready` : `${ready}/${domains.length} ready`;
}

function statusTone(status: string): "ok" | "warn" | "error" {
  if (["running", "succeeded", "healthy", "ready", "verified", "active", "enabled", "ok"].includes(status)) return "ok";
  if (["failed", "crashed", "error", "unhealthy"].includes(status)) return "error";
  return "warn";
}

function readinessFromStatus(status: string | null | undefined, ready: string[] = []): "ok" | "warn" | "error" {
  if (!status) return "warn";
  if (ready.includes(status) || ["running", "succeeded", "healthy", "ready", "verified", "active", "ok"].includes(status)) return "ok";
  if (["failed", "crashed", "error", "unhealthy", "invalid"].includes(status)) return "error";
  return "warn";
}

function domainStepTone(domain: DaemonDomain, route: DaemonProxyRoute | undefined, step: "root" | "hostname" | "dns" | "proxy" | "tls" | "target", hasRoot: boolean): "ok" | "warn" | "error" {
  if (step === "root") return hasRoot ? "ok" : "warn";
  if (step === "hostname") return domain.hostname ? "ok" : "warn";
  if (step === "dns") return readinessFromStatus(domain.dnsStatus, ["verified"]);
  if (step === "proxy") return route?.enabled || domain.proxyStatus === "generated" ? "ok" : domain.proxyStatus === "failed" || domain.status === "error" ? "error" : "warn";
  if (step === "tls") return domain.tlsStatus === "active" || domain.tlsStatus === "verified" ? "ok" : domain.tlsStatus === "failed" || domain.tlsStatus === "error" ? "error" : "warn";
  return domain.targetUrl || domain.targetPort ? "ok" : "warn";
}

function tlsTone(status: string | null | undefined): "ok" | "warn" | "error" {
  if (status === "active" || status === "verified") return "ok";
  if (status === "failed" || status === "error") return "error";
  return "warn";
}

function httpsSummary(domains: DaemonDomain[]): string {
  if (domains.length === 0) return "no domains";
  if (domains.some((domain) => domain.tlsStatus === "failed" || domain.tlsStatus === "error")) return "TLS failed";
  if (domains.every((domain) => domain.tlsStatus === "active" || domain.tlsStatus === "verified")) return "verified TLS";
  if (domains.some((domain) => domain.tlsStatus === "issuing")) return "certificate issuing";
  return "pending TLS";
}

function deploymentSource(deployment: DaemonDeployment): string {
  const branch = deployment.branch ? `:${deployment.branch}` : "";
  const commit = deployment.commitSha ? ` @ ${deployment.commitSha.slice(0, 7)}` : "";
  return deployment.repo ? `${deployment.repo}${branch}${commit}` : deployment.sourceType || "local source";
}

function appDeployMetadata(app: DaemonApp, latest: DaemonDeployment | undefined): string {
  const image = latest?.imageTag || app.image || "image pending";
  const container = latest?.containerName || "container pending";
  const ports = latest?.hostPort ? `127.0.0.1:${latest.hostPort}->${latest.containerPort || "container"}` : app.port ? `local :${app.port}` : "port pending";
  return `${image} · ${container} · ${ports}`;
}

function envMetadata(app: DaemonApp): string {
  const keys = app.envKeys || Object.keys(app.env || {});
  return keys.length > 0 ? keys.join(", ") : "-";
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

function serverCheckRailSignal(label: string, check: DaemonServerCheck | undefined, okValue = "ok"): ServerRailSignal {
  return {
    label,
    value: check ? (check.status === "ok" ? okValue : check.status) : "pending",
    detail: check?.message || undefined,
    tone: check ? check.status : "muted"
  };
}

function metricRailSignal(label: string, value: string | null, detail?: string): ServerRailSignal {
  return {
    label,
    value: value || "pending",
    detail,
    tone: value ? "ok" : "muted"
  };
}

function formatPercent(value: number | null): string | null {
  return value == null ? null : `${value.toFixed(1)}%`;
}

function formatUsedTotal(used: number | null, total: number | null): { value: string | null; detail?: string } {
  if (used == null) return { value: null };
  return {
    value: formatBytes(used),
    detail: total == null ? undefined : `of ${formatBytes(total)}`
  };
}

function redactedTarget(target: string | null, type: string): string {
  if (!target) return "[redacted]";
  if (target.includes("***") || target.includes("...") || target.startsWith("[")) return target;
  if (/^https?:\/\//i.test(target)) {
    try {
      const url = new URL(target);
      return `${url.protocol}//${url.hostname}/...redacted`;
    } catch {
      return "[redacted URL]";
    }
  }
  if (type === "telegram") return "telegram:...redacted";
  if (target.length <= 6) return "[redacted]";
  return `${target.slice(0, 3)}...${target.slice(-2)}`;
}

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error || `Request failed with HTTP ${response.status}`;
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
  const [notificationActionById, setNotificationActionById] = useState<Record<number, string | null>>({});
  const [notificationForm, setNotificationForm] = useState({ type: "webhook", name: "deploy-alerts", url: "", botToken: "", chatId: "", events: "deploy_succeeded,deploy_failed" });
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
  const [startAllBusy, setStartAllBusy] = useState(false);
  const [startAllResult, setStartAllResult] = useState<DaemonAppStartAllResponse | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [logs, setLogs] = useState<DaemonAppLogsResponse | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingAppId, setEditingAppId] = useState<number | null>(null);
  const [form, setForm] = useState<AppFormState>(blankAppForm);
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

  const latestSuccessfulDeploymentByAppId = useMemo(() => {
    const grouped = new Map<number, DaemonDeployment[]>();
    for (const deployment of deployments) {
      const items = grouped.get(deployment.appId) || [];
      items.push(deployment);
      grouped.set(deployment.appId, items);
    }

    const latest = new Map<number, DaemonDeployment>();
    for (const [appId, appDeployments] of grouped) {
      const successful = latestSuccessfulDeployment(appDeployments);
      if (successful) latest.set(appId, successful);
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
    setNotificationActionById((current) => ({ ...current, [channel.id]: "test" }));
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
    } finally {
      setNotificationActionById((current) => ({ ...current, [channel.id]: null }));
    }
  }, [applyNotifications]);

  const toggleNotificationChannel = useCallback(async (channel: DaemonNotificationChannel, enabled: boolean) => {
    setNotificationsError(null);
    setNotificationActionById((current) => ({ ...current, [channel.id]: enabled ? "enable" : "disable" }));
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
    } finally {
      setNotificationActionById((current) => ({ ...current, [channel.id]: null }));
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
    setForm(blankAppForm);
    setFormError(null);
  }

  function openEditForm(app: DaemonApp) {
    setFormMode("edit");
    setEditingAppId(app.id);
    setForm(appFormFromDaemonApp(app));
    setFormError(null);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const validationError = appFormValidationError(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormSaving(true);

    try {
      const isEdit = formMode === "edit" && editingAppId != null;
      const response = await fetch(isEdit ? `/api/apps/${editingAppId}` : "/api/apps", {
        method: isEdit ? "PATCH" : "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(appFormPayload(form))
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
  const moduleLoading = loading || refreshing;
  const bulkStartPlan = useMemo(() => startAllPlan(apps), [apps]);
  const startAllReason = startAllBlockReason(apps, connected, startAllBusy);

  const runStartAll = useCallback(async () => {
    const blocked = startAllBlockReason(apps, connected, startAllBusy);
    if (blocked) {
      setActionError(blocked);
      return;
    }

    const startableIds = apps
      .filter((app) => app.enabled && appSupportsBulkStart(app) && !isAppRuntimeRunning(app))
      .map((app) => app.id);

    setActionError(null);
    setStartAllResult(null);
    setStartAllBusy(true);
    setActionByAppId((current) => ({
      ...current,
      ...Object.fromEntries(startableIds.map((id) => [id, "start" as AppAction]))
    }));

    try {
      const response = await fetch("/api/apps/start-all", {
        method: "POST",
        cache: "no-store"
      });
      const data = (await response.json().catch(() => null)) as (Partial<DaemonAppStartAllResponse> & { error?: string }) | null;

      if (!response.ok) {
        throw new Error(data?.error || `Start All failed with HTTP ${response.status}.`);
      }

      const result = data as DaemonAppStartAllResponse;
      setStartAllResult(result);
      if (Array.isArray(result.apps)) setApps(result.apps);
      const firstChangedApp = result.started[0]?.app || result.failed[0]?.app || null;
      if (firstChangedApp) setSelectedAppId(firstChangedApp.id);
      setLastUpdated(new Date().toISOString());
      void poll();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not start enabled resources.");
    } finally {
      setStartAllBusy(false);
      setActionByAppId((current) => {
        const next = { ...current };
        for (const id of startableIds) next[id] = null;
        return next;
      });
    }
  }, [apps, connected, poll, startAllBusy]);

  const latestHostMetric = hostMetrics[0] || null;
  const memoryRail = formatUsedTotal(latestHostMetric?.memoryBytes ?? null, latestHostMetric?.memoryLimitBytes ?? null);
  const diskRail = formatUsedTotal(latestHostMetric?.diskUsedBytes ?? null, latestHostMetric?.diskTotalBytes ?? null);
  const metricDetail = latestHostMetric?.sampledAt ? `sampled ${timeAgo(latestHostMetric.sampledAt)}` : undefined;
  const metricUnavailable = hostMetricsError ? { value: "unavailable", detail: hostMetricsError, tone: "warn" as const } : null;
  const dockerCheck = serverCheck(serverStatus, "docker");
  const composeCheck = serverCheck(serverStatus, "docker-compose");

  return (
    <DashboardShell
      activeModule={activeModule}
      onSelect={setActiveModule}
      status={{
        compose: serverCheckRailSignal("compose", composeCheck),
        connected,
        cpu: metricUnavailable ? { label: "CPU", ...metricUnavailable } : metricRailSignal("CPU", formatPercent(latestHostMetric?.cpuPercent ?? null), metricDetail),
        daemonUrl: health?.daemonUrl || "-",
        disk: metricUnavailable ? { label: "disk", ...metricUnavailable } : metricRailSignal("disk", diskRail.value, diskRail.detail || metricDetail),
        docker: serverCheckRailSignal("docker", dockerCheck),
        loading,
        memory: metricUnavailable ? { label: "RAM", ...metricUnavailable } : metricRailSignal("RAM", memoryRail.value, memoryRail.detail || metricDetail),
        mode: serverStatus?.mode || "local",
        refreshing,
        updated: timeAgo(lastUpdated),
        uptime: health?.health?.startedAt ? timeAgo(health.health.startedAt) : "pending",
        workspace,
        onRefresh: () => void poll(true)
      }}
    >
            {activeModule === "overview" ? (
              <OverviewPanel
                apps={apps}
                connected={connected}
                deployments={deployments}
                domains={domains}
                domainsMeta={domainsMeta}
                github={github}
                healthchecksUnavailable={appsError || deploymentsError}
                onSelect={setActiveModule}
                proxyRoutes={proxyRoutes}
                server={serverStatus}
                workspace={workspace}
              />
            ) : null}

            {activeModule === "overview" ? (
              <ServerFoundationPanel
                connected={connected}
                error={serverError}
                server={serverStatus}
              />
            ) : null}

            {activeModule === "deployments" ? <DeploymentsModule apps={dockerfileApps} connected={connected} deployments={deployments} deployingByAppId={deployingByAppId} error={deployError || deploymentsError} latestByAppId={latestDeploymentByAppId} latestSuccessfulByAppId={latestSuccessfulDeploymentByAppId} server={serverStatus} onDeploy={(app) => void deployApp(app)} onLogs={(deployment) => void loadDeploymentLogs(deployment)} /> : null}

            {activeModule === "domains" ? <DomainsModule apps={dockerfileApps} connected={connected} domains={domains} domainsError={domainsError || proxyError} domainsMeta={domainsMeta} domainActionByHostname={domainActionByHostname} domainForm={domainForm} domainSaving={domainSaving} proxyRoutes={proxyRoutes} rootDomainInput={rootDomainInput} onAddDomain={() => void addDomain()} onDomainFormChange={setDomainForm} onRemoveDomain={(domain) => void removeDomain(domain)} onRootDomainChange={setRootDomainInput} onSaveRootDomain={() => void saveRootDomain()} onVerifyDomain={(domain) => void verifyDomain(domain)} /> : null}

            {activeModule === "github" ? <GithubModule apps={dockerfileApps} connected={connected} deployments={deployments} github={github} githubError={githubError} githubForm={githubForm} githubSaving={githubSaving} onDeploymentLogs={(deployment) => void loadDeploymentLogs(deployment)} onGithubConnect={() => void connectGithubRepository()} onGithubFormChange={setGithubForm} /> : null}

            {activeModule === "databases" ? <DatabasesModule connected={connected} databaseActionById={databaseActionById} databaseForm={databaseForm} databaseSaving={databaseSaving} databases={databases} databasesError={databasesError} loading={moduleLoading} onCreateDatabase={() => void createDatabase()} onDatabaseAction={(database, action) => void runDatabaseAction(database, action)} onDatabaseFormChange={setDatabaseForm} /> : null}

            {activeModule === "backups" ? <BackupsModule backupActionById={backupActionById} backupForm={backupForm} backupJobs={backupJobs} backupRuns={backupRuns} backupsError={backupsError} connected={connected} databases={databases} loading={moduleLoading} onBackupFormChange={setBackupForm} onEnableBackup={() => void enableBackup()} onRunBackup={(job) => void runBackup(job)} onToggleBackup={(job, enabled) => void toggleBackup(job, enabled)} /> : null}

            {activeModule === "settings" ? (
              <NotificationsPanel
                channels={notificationChannels}
                attempts={notificationAttempts}
                connected={connected}
                error={notificationsError}
                form={notificationForm}
                loading={moduleLoading}
                notificationActionById={notificationActionById}
                saving={notificationSaving}
                onChange={setNotificationForm}
                onCreate={() => void createNotificationChannel()}
                onTest={(channel) => void testNotificationChannel(channel)}
                onToggle={(channel, enabled) => void toggleNotificationChannel(channel, enabled)}
              />
            ) : null}

            {activeModule === "server" ? (
              <ServerFoundationPanel
                connected={connected}
                error={serverError}
                server={serverStatus}
              />
            ) : null}

            {activeModule === "apps" ? <AppsModule actionByAppId={actionByAppId} actionError={actionError} appResources={appResources} apps={apps} appsError={appsError} connected={connected} deployingByAppId={deployingByAppId} deploymentsByAppId={latestDeploymentByAppId} disabledCount={disabledCount} domainsByAppId={domainsByAppId} form={form} formError={formError} formMode={formMode} formSaving={formSaving} health={health} loading={loading} runningCount={runningCount} selectedAppId={selectedAppId} server={serverStatus} serviceResources={serviceResources} startAllBusy={startAllBusy} startAllPlan={bulkStartPlan} startAllReason={startAllReason} startAllResult={startAllResult} stoppedCount={stoppedCount} onAction={(app, action) => void runAction(app, action)} onCreate={openCreateForm} onDeploy={(app) => void deployApp(app)} onEdit={openEditForm} onFormCancel={() => setFormMode(null)} onFormChange={setForm} onFormSubmit={submitForm} onLogs={(app) => void loadLogs(app)} onSelect={setSelectedAppId} onStartAll={() => void runStartAll()} /> : null}

            {activeModule === "apps" || activeModule === "env" || activeModule === "logs" || activeModule === "health" ? <AppOperationsModule activeTab={activeModule === "apps" ? undefined : appModuleTabs[activeModule]} apps={apps} appResources={appResources} app={selectedApp} selectedAppId={selectedAppId} connected={connected} deployments={selectedDeployments} domains={selectedApp ? domainsByAppId.get(selectedApp.id) || [] : []} github={github} deploymentLogs={deploymentLogs} deploymentLogsError={deploymentLogsError} deploymentLogsLoading={deploymentLogsLoading} deploying={selectedApp ? Boolean(deployingByAppId[selectedApp.id]) : false} logs={logs} logsLoading={logsLoading} logsError={logsError} currentAction={selectedApp ? actionByAppId[selectedApp.id] : null} module={activeModule} server={serverStatus} onAction={selectedApp ? (action) => void runAction(selectedApp, action) : undefined} onDeploy={selectedApp ? () => void deployApp(selectedApp) : undefined} onDeploymentLogs={(deployment) => void loadDeploymentLogs(deployment)} onEdit={selectedApp ? () => openEditForm(selectedApp) : undefined} onLogs={(app) => void loadLogs(app)} onReload={selectedApp ? () => void loadLogs(selectedApp) : undefined} onSelect={setSelectedAppId} /> : null}

            {activeModule === "metrics" ? <MetricsModule app={selectedApp} apps={apps} appResources={appResources} connected={connected} currentAction={selectedApp ? actionByAppId[selectedApp.id] : null} deploymentLogs={deploymentLogs} deploymentLogsError={deploymentLogsError} deploymentLogsLoading={deploymentLogsLoading} deployments={selectedDeployments} domains={selectedApp ? domainsByAppId.get(selectedApp.id) || [] : []} deploying={selectedApp ? Boolean(deployingByAppId[selectedApp.id]) : false} github={github} hostMetrics={hostMetrics} hostMetricsError={hostMetricsError} logs={logs} logsError={logsError} logsLoading={logsLoading} server={serverStatus} onAction={selectedApp ? (action) => void runAction(selectedApp, action) : undefined} onDeploy={selectedApp ? () => void deployApp(selectedApp) : undefined} onDeploymentLogs={(deployment) => void loadDeploymentLogs(deployment)} onEdit={selectedApp ? () => openEditForm(selectedApp) : undefined} onReload={selectedApp ? () => void loadLogs(selectedApp) : undefined} onSelect={setSelectedAppId} selectedAppId={selectedAppId} /> : null}
    </DashboardShell>
  );
}

function AppsModule({ actionByAppId, actionError, appResources, apps, appsError, connected, deployingByAppId, deploymentsByAppId, disabledCount, domainsByAppId, form, formError, formMode, formSaving, health, loading, onAction, onCreate, onDeploy, onEdit, onFormCancel, onFormChange, onFormSubmit, onLogs, onSelect, onStartAll, runningCount, selectedAppId, server, serviceResources, startAllBusy, startAllPlan: bulkPlan, startAllReason, startAllResult, stoppedCount }: { actionByAppId: Record<number, AppAction | null>; actionError: string | null; appResources: DaemonApp[]; apps: DaemonApp[]; appsError: string | null; connected: boolean; deployingByAppId: Record<number, boolean>; deploymentsByAppId: Map<number, DaemonDeployment>; disabledCount: number; domainsByAppId: Map<number, DaemonDomain[]>; form: AppFormState; formError: string | null; formMode: FormMode | null; formSaving: boolean; health: HealthResponse | null; loading: boolean; onAction: (app: DaemonApp, action: AppAction) => void; onCreate: () => void; onDeploy: (app: DaemonApp) => void; onEdit: (app: DaemonApp) => void; onFormCancel: () => void; onFormChange: (form: AppFormState) => void; onFormSubmit: (event: FormEvent<HTMLFormElement>) => void; onLogs: (app: DaemonApp) => void; onSelect: (id: number) => void; onStartAll: () => void; runningCount: number; selectedAppId: number | null; server: DaemonServerStatus | null; serviceResources: DaemonApp[]; startAllBusy: boolean; startAllPlan: BulkStartPlan; startAllReason: string | null; startAllResult: DaemonAppStartAllResponse | null; stoppedCount: number }) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW}`}>
      <ModuleHeader module="apps" stats={<><MetricPill label="running" value={`${runningCount}/${apps.length}`} accent /><MetricPill label="services" value={String(serviceResources.length)} /><MetricPill label="stopped" value={String(stoppedCount)} /><MetricPill label="disabled" value={String(disabledCount)} /></>} actions={<><Button onClick={onStartAll} disabled={Boolean(startAllReason)} loading={startAllBusy} loadingLabel="Starting" title={startAllReason || "Start stopped enabled command and Compose resources"} variant="primary">Start All</Button><PillButton onClick={onCreate} strong disabled={!connected}>Add resource</PillButton></>} />

      {!connected && health ? <Alert title="Daemon offline" message={health.error || "Start Routely from the CLI to bring the local control plane online."} /> : null}
      {actionError ? <Alert title="Action failed" message={actionError} /> : null}
      {appsError ? <Alert title="Registry unavailable" message={appsError} /> : null}
      {startAllResult ? <StartAllReport result={startAllResult} /> : null}

      <div className="border-b border-white/5 bg-black/20 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Start All scope</p>
        <p className="mt-1 text-sm text-muted">
          Starts {bulkPlan.stoppedStartableCount} stopped enabled command/Compose resources through <code className="font-mono text-foreground">/api/apps/start-all</code>. Disabled resources stay visible and skipped; Dockerfile lifecycle remains deferred. CLI fallback: <code className="font-mono text-foreground">routely up</code>.
        </p>
      </div>

      {formMode ? <AppForm mode={formMode} form={form} error={formError} saving={formSaving} onChange={onFormChange} onCancel={onFormCancel} onSubmit={onFormSubmit} /> : null}

      <div className="bg-black/10">
        {loading ? <LoadingRows /> : apps.length === 0 ? <EmptyState connected={connected} onAdd={onCreate} /> : (
          <>
            <ResourceSection title="Apps" count={appResources.length} />
            {appResources.map((app) => <AppRow key={app.id} app={app} active={selectedAppId === app.id} connected={connected} currentAction={actionByAppId[app.id]} deploying={Boolean(deployingByAppId[app.id])} domains={domainsByAppId.get(app.id) || []} latestDeployment={deploymentsByAppId.get(app.id) || null} server={server} onSelect={() => onSelect(app.id)} onLogs={() => onLogs(app)} onDeploy={() => onDeploy(app)} onEdit={() => onEdit(app)} onAction={(action) => onAction(app, action)} />)}
            <ResourceSection title="Services & databases" count={serviceResources.length} />
            {serviceResources.length === 0 ? <ServiceEmpty /> : null}
            {serviceResources.map((app) => <AppRow key={app.id} app={app} active={selectedAppId === app.id} connected={connected} currentAction={actionByAppId[app.id]} deploying={Boolean(deployingByAppId[app.id])} domains={domainsByAppId.get(app.id) || []} latestDeployment={deploymentsByAppId.get(app.id) || null} server={server} onSelect={() => onSelect(app.id)} onLogs={() => onLogs(app)} onDeploy={() => onDeploy(app)} onEdit={() => onEdit(app)} onAction={(action) => onAction(app, action)} />)}
          </>
        )}
      </div>
    </section>
  );
}

function StartAllReport({ result }: { result: DaemonAppStartAllResponse }) {
  const variant: "danger" | "warning" | "success" = result.failed.length ? "danger" : result.skipped.length ? "warning" : "success";
  const skipped = result.skipped.slice(0, 3).map((item) => `${item.app.name}: ${item.reason}`);
  const failed = result.failed.slice(0, 3).map((item) => `${item.app.name}: ${item.error}`);
  const details = [...skipped, ...failed];

  return (
    <UiAlert className="border-x-0 border-t-0" title="Start All report" variant={variant}>
      <p>{result.started.length} started · {result.skipped.length} skipped · {result.failed.length} failed.</p>
      {details.length ? <p className="mt-1">{details.join("; ")}</p> : null}
    </UiAlert>
  );
}

function AppOperationsModule({ activeTab, appResources, apps, app, connected, currentAction, deploying, deploymentLogs, deploymentLogsError, deploymentLogsLoading, deployments, domains, github, logs, logsError, logsLoading, module, onAction, onDeploy, onDeploymentLogs, onEdit, onLogs, onReload, onSelect, selectedAppId, server }: { activeTab?: InspectorTab; appResources: DaemonApp[]; apps: DaemonApp[]; app: DaemonApp | null; connected: boolean; currentAction?: AppAction | null; deploying: boolean; deploymentLogs: DeploymentLogsResponse | null; deploymentLogsError: string | null; deploymentLogsLoading: boolean; deployments: DaemonDeployment[]; domains: DaemonDomain[]; github: DaemonGithubStatus | null; logs: DaemonAppLogsResponse | null; logsError: string | null; logsLoading: boolean; module: ModuleKey; onAction?: (action: AppAction) => void; onDeploy?: () => void; onDeploymentLogs: (deployment: DaemonDeployment) => void; onEdit?: () => void; onLogs: (app: DaemonApp) => void; onReload?: () => void; onSelect: (id: number) => void; selectedAppId: number | null; server: DaemonServerStatus | null }) {
  useEffect(() => {
    if (module === "logs" && app && !logsLoading && logs?.app.id !== app.id) {
      onLogs(app);
    }
  }, [app, logs?.app.id, logsLoading, module, onLogs]);

  if (module === "apps") {
    return <DetailPanel activeTab={activeTab} app={app} connected={connected} deployments={deployments} domains={domains} github={github} deploymentLogs={deploymentLogs} deploymentLogsError={deploymentLogsError} deploymentLogsLoading={deploymentLogsLoading} deploying={deploying} logs={logs} loading={logsLoading} error={logsError} currentAction={currentAction} server={server} onDeploy={onDeploy} onEdit={onEdit} onDeploymentLogs={onDeploymentLogs} onReload={onReload} onAction={onAction} />;
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
        <ModuleHeader module={module} stats={<><MetricPill label="resources" value={String(candidates.length)} accent />{module === "health" ? <MetricPill label="attention" value={String(candidates.filter((item) => item.status !== "running" || item.needsRestart || item.needsRedeploy).length)} /> : null}</>} />
        <ResourceSection title="Choose app" count={candidates.length} />
        {candidates.length === 0 ? <p className="px-4 py-5 text-sm text-muted">No app resources are registered yet. Add one from Apps to populate this module.</p> : null}
        {candidates.map((item) => (
          <button key={item.id} type="button" onClick={() => { onSelect(item.id); if (module === "logs") onLogs(item); }} className={`block w-full border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/[0.035] ${FOCUS_RING} ${selectedAppId === item.id ? "bg-white/[0.055] shadow-[3px_0_0_0_var(--accent)_inset]" : ""}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{item.name}</p>
                <p className="mt-1 truncate font-mono text-[11px] text-muted">{item.driver} · {item.port ? `:${item.port}` : "no port"} · {pendingStateLabel(item)}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
          </button>
        ))}
      </div>
      <DetailPanel activeTab={activeTab} app={app} connected={connected} deployments={deployments} domains={domains} github={github} deploymentLogs={deploymentLogs} deploymentLogsError={deploymentLogsError} deploymentLogsLoading={deploymentLogsLoading} deploying={deploying} logs={logs} loading={logsLoading} error={logsError} currentAction={currentAction} server={server} onDeploy={onDeploy} onEdit={onEdit} onDeploymentLogs={onDeploymentLogs} onReload={onReload} onAction={onAction} />
    </section>
  );
}

function MetricsModule({ app, apps, appResources, connected, currentAction, deploying, deploymentLogs, deploymentLogsError, deploymentLogsLoading, deployments, domains, github, hostMetrics, hostMetricsError, logs, logsError, logsLoading, onAction, onDeploy, onDeploymentLogs, onEdit, onReload, onSelect, selectedAppId, server }: { app: DaemonApp | null; apps: DaemonApp[]; appResources: DaemonApp[]; connected: boolean; currentAction?: AppAction | null; deploying: boolean; deploymentLogs: DeploymentLogsResponse | null; deploymentLogsError: string | null; deploymentLogsLoading: boolean; deployments: DaemonDeployment[]; domains: DaemonDomain[]; github: DaemonGithubStatus | null; hostMetrics: DaemonMetricSample[]; hostMetricsError: string | null; logs: DaemonAppLogsResponse | null; logsError: string | null; logsLoading: boolean; onAction?: (action: AppAction) => void; onDeploy?: () => void; onDeploymentLogs: (deployment: DaemonDeployment) => void; onEdit?: () => void; onReload?: () => void; onSelect: (id: number) => void; selectedAppId: number | null; server: DaemonServerStatus | null }) {
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
      <DetailPanel activeTab="health" app={app} connected={connected} deployments={deployments} domains={domains} github={github} deploymentLogs={deploymentLogs} deploymentLogsError={deploymentLogsError} deploymentLogsLoading={deploymentLogsLoading} deploying={deploying} logs={logs} loading={logsLoading} error={logsError} currentAction={currentAction} server={server} onDeploy={onDeploy} onEdit={onEdit} onDeploymentLogs={onDeploymentLogs} onReload={onReload} onAction={onAction} />
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
        <span>RAM <strong className="text-foreground">{formatBytes(sample.memoryBytes)}{sample.memoryLimitBytes ? ` / ${formatBytes(sample.memoryLimitBytes)}` : ""}</strong></span>
        <span>Disk <strong className="text-foreground">{formatBytes(sample.diskUsedBytes)}{sample.diskTotalBytes ? ` / ${formatBytes(sample.diskTotalBytes)}` : ""}</strong></span>
        <span>Net <strong className="text-foreground">{formatBytes(sample.networkRxBytes)} / {formatBytes(sample.networkTxBytes)}</strong></span>
      </div>
      {sample.message ? <p className="mt-2 truncate text-[11px] text-muted">{sample.message}</p> : null}
    </div>
  );
}

function DeploymentsModule({ apps, connected, deployments, deployingByAppId, error, latestByAppId, latestSuccessfulByAppId, onDeploy, onLogs, server }: { apps: DaemonApp[]; connected: boolean; deployments: DaemonDeployment[]; deployingByAppId: Record<number, boolean>; error: string | null; latestByAppId: Map<number, DaemonDeployment>; latestSuccessfulByAppId: Map<number, DaemonDeployment>; onDeploy: (app: DaemonApp) => void; onLogs: (deployment: DaemonDeployment) => void; server: DaemonServerStatus | null }) {
  const dockerReady = serverCheck(server, "docker")?.status === "ok";
  const dataReady = Boolean(server?.dataDir);
  const auth = productionAuthState(server, [error]);
  const serverReady = Boolean(server?.readiness?.ok);
  const failed = deployments.filter((item) => item.status === "failed");
  const inProgress = deployments.filter(isDeploymentInProgress);
  return (
    <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW}`}>
      <ModuleHeader module="deployments" stats={<><ReadinessCard label="Docker" value={dockerReady ? "ready" : "check"} status={dockerReady ? "ok" : "warn"} /><ReadinessCard label="Server" value={serverReady ? "ready" : "doctor"} status={serverReady ? "ok" : "warn"} /><ReadinessCard label="Data dir" value={dataReady ? "ready" : "pending"} status={dataReady ? "ok" : "warn"} /><ReadinessCard label="Auth" value={auth.label} status={auth.tone} /><ReadinessCard label="Active" value={String(inProgress.length)} status={inProgress.length ? "warn" : "ok"} /><ReadinessCard label="Failed" value={String(failed.length)} status={failed.length ? "error" : "ok"} /></>} />
      {error ? <Alert title="Deployment action failed" message={error} /> : null}
      <div className="grid gap-0 xl:grid-cols-[minmax(0,0.95fr)_minmax(340px,1.05fr)]">
        <div className="min-w-0 border-b border-white/5 xl:border-b-0 xl:border-r">
          <ResourceSection title="Dockerfile deploy bridge" count={apps.length} />
          {apps.length === 0 ? <div className="px-4 py-5 text-sm text-muted">No app uses the verified Dockerfile bridge yet. Compose production parity is deferred until the backend path exists.</div> : null}
          {apps.map((app) => {
            const latest = latestByAppId.get(app.id);
            const latestSuccessful = latestSuccessfulByAppId.get(app.id);
            const deploying = Boolean(deployingByAppId[app.id]);
            const disabledReason = deployBlockReason(app, connected, server);
            return (
              <div key={app.id} className="border-b border-white/5 px-4 py-3">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold">{app.name}</p>
                      {latest ? <StatusBadge status={latest.status} /> : <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">never deployed</span>}
                      {disabledReason ? <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-warning">{disabledReason}</span> : null}
                    </div>
                    <div className="mt-2 grid gap-2 text-[11px] text-muted sm:grid-cols-2">
                      <Meta label="Source" value={latest ? deploymentSource(latest) : compactSource(app)} mono />
                      <Meta label="Image / container / ports" value={appDeployMetadata(app, latest)} mono />
                      <Meta label="Current state" value={deploymentStateLabel(latest)} />
                      <Meta label="Latest successful" value={latestSuccessful ? `#${latestSuccessful.id} · ${latestSuccessful.hostPort ? `:${latestSuccessful.hostPort}` : "no host port"}` : "none yet"} />
                      <Meta label="Logs" value={deploymentLogsLabel(latest)} />
                      <Meta label="Updated" value={latest ? timeAgo(latest.updatedAt) : timeAgo(app.updatedAt)} />
                    </div>
                    {latest?.errorMessage ? <p className="mt-2 rounded-md bg-negative/10 px-3 py-2 text-xs text-negative">{latest.errorMessage}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {latest ? <PillButton onClick={() => onLogs(latest)}>Logs</PillButton> : null}
                    <PillButton strong onClick={() => onDeploy(app)} disabled={Boolean(disabledReason) || deploying}>{deploying ? "Deploying" : "Deploy"}</PillButton>
                  </div>
                </div>
              </div>
            );
          })}
          <DeferredCapabilityList items={["Compose production deploy parity deferred", "Preview deployments deferred", "Rollback/cancel controls deferred"]} />
        </div>
        <div className="min-w-0"><ResourceSection title="Deployment history" count={deployments.length} />{deployments.length === 0 ? <div className="px-4 py-5 text-sm text-muted">Deployment history appears after the first Dockerfile deploy.</div> : deployments.map((deployment) => <DeploymentSummaryRow key={deployment.id} deployment={deployment} onLogs={() => onLogs(deployment)} />)}</div>
      </div>
    </section>
  );
}

function DomainsModule({ apps, connected, domains, domainsError, domainsMeta, domainActionByHostname, domainForm, domainSaving, onAddDomain, onDomainFormChange, onRemoveDomain, onRootDomainChange, onSaveRootDomain, onVerifyDomain, proxyRoutes, rootDomainInput }: { apps: DaemonApp[]; connected: boolean; domains: DaemonDomain[]; domainsError: string | null; domainsMeta: { rootDomain: string | null; serverPublicIp: string | null }; domainActionByHostname: Record<string, string | null>; domainForm: { appId: string; hostname: string }; domainSaving: boolean; onAddDomain: () => void; onDomainFormChange: (form: { appId: string; hostname: string }) => void; onRemoveDomain: (domain: DaemonDomain) => void; onRootDomainChange: (value: string) => void; onSaveRootDomain: () => void; onVerifyDomain: (domain: DaemonDomain) => void; proxyRoutes: DaemonProxyRoute[]; rootDomainInput: string }) {
  const generatedRoutes = domains.filter((domain) => domain.proxyStatus === "generated" || proxyRoutes.some((route) => route.domainId === domain.id && route.enabled)).length;
  const verifiedTls = domains.filter((domain) => ["active", "verified"].includes(domain.tlsStatus)).length;

  return (
    <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW}`}>
      <ModuleHeader module="domains" stats={<><ReadinessCard label="Root" value={domainsMeta.rootDomain || "unset"} status={domainsMeta.rootDomain ? "ok" : "warn"} /><ReadinessCard label="Hosts" value={String(domains.length)} status={domains.length ? "ok" : "warn"} /><ReadinessCard label="Routes" value={`${generatedRoutes}/${domains.length}`} status={generatedRoutes ? "ok" : "warn"} /><ReadinessCard label="TLS" value={`${verifiedTls}/${domains.length}`} status={verifiedTls === domains.length && domains.length ? "ok" : "warn"} /></>} />
      {domainsError ? <Alert title="Domain or proxy action failed" message={domainsError} /> : null}
      <div className="grid gap-0 xl:grid-cols-[minmax(0,0.85fr)_minmax(340px,1.15fr)]">
        <div className="min-w-0 border-b border-white/5 xl:border-b-0 xl:border-r">
          <ResourceSection title="Root domain" count={domainsMeta.rootDomain ? 1 : 0} />
          <div className="border-b border-white/5 px-4 py-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Field label="Root domain" value={rootDomainInput} onChange={onRootDomainChange} placeholder="example.com" disabled={!connected || domainSaving} />
              <div className="flex items-end"><PillButton onClick={onSaveRootDomain} disabled={!connected || domainSaving || !rootDomainInput.trim()} strong>Save root</PillButton></div>
            </div>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><Meta label="Server IP" value={domainsMeta.serverPublicIp || "set ROUTELY_SERVER_PUBLIC_IP"} mono /><Meta label="Wildcard" value={domainsMeta.rootDomain ? `*.${domainsMeta.rootDomain}` : "set root domain"} mono /></div>
          </div>
          <ResourceSection title="Add hostname" count={apps.length} />
          <div className="px-4 py-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(120px,0.8fr)_minmax(0,1.2fr)_auto]">
              <UiSelect value={domainForm.appId} onChange={(event) => onDomainFormChange({ ...domainForm, appId: event.target.value })} disabled={!connected || domainSaving} label="App"><option value="">Choose app</option>{apps.map((app) => <option key={app.id} value={app.id}>{app.name}</option>)}</UiSelect>
              <Field label="Hostname" value={domainForm.hostname} onChange={(value) => onDomainFormChange({ ...domainForm, hostname: value })} placeholder={domainsMeta.rootDomain ? `web.${domainsMeta.rootDomain}` : "web.example.com"} disabled={!connected || domainSaving} />
              <div className="flex items-end"><PillButton onClick={onAddDomain} disabled={!connected || domainSaving || !domainForm.appId || !domainForm.hostname.trim()} strong>Add</PillButton></div>
            </div>
            <p className="mt-3 text-xs text-muted">Generated proxy config is route metadata only; TLS stays pending until the daemon reports verified certificate state.</p>
          </div>
        </div>
        <div className="min-w-0">
          <ResourceSection title="Hostnames" count={domains.length} />
          {domains.length === 0 ? <div className="px-4 py-5 text-sm text-muted">Add a hostname after a Dockerfile app has a successful deployment. DNS verification creates proxy route state; generated routes are not certificate success.</div> : domains.map((domain) => {
            const action = domainActionByHostname[domain.hostname];
            const route = proxyRoutes.find((item) => item.domainId === domain.id);
            const targetUrl = domain.targetUrl || route?.targetUrl || null;
            const targetDomain = { ...domain, targetUrl };
            const steps = [
              { label: "Root", value: domainsMeta.rootDomain || "unset", tone: domainStepTone(domain, route, "root", Boolean(domainsMeta.rootDomain)) },
              { label: "DNS", value: domainDnsLabel(domain.dnsStatus), tone: domainStepTone(domain, route, "dns", Boolean(domainsMeta.rootDomain)) },
              { label: "Proxy", value: domainProxyLabel(targetDomain, Boolean(route?.enabled)), tone: domainStepTone(domain, route, "proxy", Boolean(domainsMeta.rootDomain)) },
              { label: "TLS", value: domainTlsLabel(domain.tlsStatus), tone: domainStepTone(domain, route, "tls", Boolean(domainsMeta.rootDomain)) },
              { label: "Target", value: domainTargetLabel(targetDomain), tone: domainStepTone(targetDomain, route, "target", Boolean(domainsMeta.rootDomain)) },
              { label: "Deploy", value: domain.targetDeploymentId ? `#${domain.targetDeploymentId}` : route?.deploymentId ? `#${route.deploymentId}` : "latest success pending", tone: domain.targetDeploymentId || route?.deploymentId ? "ok" as const : "warn" as const }
            ];

            return (
              <div key={domain.id} className="border-b border-white/5 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-bold">{domain.hostname}</p>
                    <p className="mt-1 text-[11px] text-muted">{domain.appName || `app ${domain.appId}`} · {targetUrl || (domain.targetPort ? `http://127.0.0.1:${domain.targetPort}` : "route pending")}</p>
                  </div>
                  <StatusBadge status={domain.status} />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">{steps.map((step) => <ReadinessCard key={step.label} label={step.label} value={step.value} status={step.tone} />)}</div>
                {domain.verificationMessage ? <p className="mt-2 text-xs text-muted">{domain.verificationMessage}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <PillButton onClick={() => onVerifyDomain(domain)} disabled={!connected || Boolean(action)}>{action === "verify" ? "Checking" : "Verify DNS"}</PillButton>
                  <ActionLink href={["active", "verified"].includes(domain.tlsStatus) ? `https://${domain.hostname.replace(/^\*\./, "")}` : null}>Open HTTPS</ActionLink>
                  <PillButton onClick={() => onRemoveDomain(domain)} disabled={!connected || Boolean(action)}>{action === "remove" ? "Removing" : "Remove"}</PillButton>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function GithubModule({ apps, connected, deployments, github, githubError, githubForm, githubSaving, onDeploymentLogs, onGithubConnect, onGithubFormChange }: { apps: DaemonApp[]; connected: boolean; deployments: DaemonDeployment[]; github: DaemonGithubStatus | null; githubError: string | null; githubForm: { appId: string; fullName: string; branch: string; autoDeploy: boolean }; githubSaving: boolean; onDeploymentLogs: (deployment: DaemonDeployment) => void; onGithubConnect: () => void; onGithubFormChange: (form: { appId: string; fullName: string; branch: string; autoDeploy: boolean }) => void }) {
  const connectedRepos = github?.repositories.filter((repo) => repo.connectedAppId != null).length || 0;
  const connection = githubConnectionState(github);
  const deliveries = [...(github?.deliveries || [])].sort((a, b) => timeValue(b.receivedAt || b.updatedAt) - timeValue(a.receivedAt || a.updatedAt));
  const deliveryByDeploymentId = new Map(deliveries.filter((delivery) => delivery.deploymentId != null).map((delivery) => [delivery.deploymentId as number, delivery]));
  const githubDeployments = deployments
    .filter((deployment) => deployment.sourceType === "github" || Boolean(deployment.repo) || deliveryByDeploymentId.has(deployment.id))
    .sort((a, b) => timeValue(b.finishedAt || b.updatedAt || b.createdAt) - timeValue(a.finishedAt || a.updatedAt || a.createdAt));
  const deploymentsById = new Map(githubDeployments.map((deployment) => [deployment.id, deployment]));
  const latestDelivery = githubLatestDelivery(deliveries);
  const latestDeploy = latestDeployment(githubDeployments);
  const latestSuccess = latestSuccessfulDeployment(githubDeployments);
  const latestDeliveryDeployment = latestDelivery?.deploymentId ? deploymentsById.get(latestDelivery.deploymentId) || null : null;
  const latestDeliveryState = githubDeliveryState(latestDelivery, latestDeliveryDeployment);
  const ignoredDeliveries = deliveries.filter((delivery) => githubDeliveryState(delivery, delivery.deploymentId ? deploymentsById.get(delivery.deploymentId) : null).label.startsWith("ignored event"));
  const failingDeliveries = deliveries.filter((delivery) => githubDeliveryState(delivery, delivery.deploymentId ? deploymentsById.get(delivery.deploymentId) : null).tone === "error");
  return (
    <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW}`}>
      <ModuleHeader module="github" stats={<><ReadinessCard label="Connection" value={connection.label} status={connection.tone} /><ReadinessCard label="Webhook" value={github?.webhookSecretConfigured ? "signed" : "missing"} status={github?.webhookSecretConfigured ? "ok" : "error"} /><ReadinessCard label="Repos" value={`${connectedRepos}/${github?.repositories.length || 0}`} status={connectedRepos ? "ok" : "warn"} /><ReadinessCard label="Latest" value={latestDeploy ? `#${latestDeploy.id}` : "none"} status={latestDeploy ? readinessFromStatus(latestDeploy.status) : "warn"} /><ReadinessCard label="Ignored" value={String(ignoredDeliveries.length)} status={ignoredDeliveries.length ? "warn" : "ok"} /><ReadinessCard label="Failing" value={String(failingDeliveries.length)} status={failingDeliveries.length ? "error" : "ok"} /></>} />
      {githubError ? <Alert title="GitHub action failed" message={githubError} /> : null}
      <div className="grid gap-0 xl:grid-cols-[minmax(0,0.82fr)_minmax(340px,1.18fr)]">
        <div className="min-w-0 border-b border-white/5 xl:border-b-0 xl:border-r">
          <ResourceSection title="Configuration" count={github ? 1 : 0} />
          <div className="border-b border-white/5 px-4 py-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ReadinessCard label="App ID" value={github?.appId || "unset"} status={github?.configured ? "ok" : "warn"} />
              <ReadinessCard label="Client ID" value={github?.clientId ? "set" : "unset"} status={github?.clientId ? "ok" : "warn"} />
              <ReadinessCard label="Webhook" value={github?.webhookSecretConfigured ? "signed" : "missing"} status={github?.webhookSecretConfigured ? "ok" : "error"} />
              <ReadinessCard label="Private key" value={github?.privateKeyConfigured ? "ready" : "missing"} status={github?.privateKeyConfigured ? "ok" : "warn"} />
            </div>
            {connection.detail ? <p className={`mt-3 text-xs ${connection.tone === "error" ? "text-negative" : "text-muted"}`}>{connection.detail}</p> : null}
            <p className="mt-2 text-xs text-muted">Webhook payloads, branch names, commit SHAs, and messages are rendered as text-only metadata. This alpha does not browse repository contents or write commit statuses.</p>
          </div>
          <ResourceSection title="Connect repository" count={apps.length} />
          <div className="px-4 py-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(120px,0.8fr)_minmax(0,1.2fr)_110px_auto]">
              <UiSelect value={githubForm.appId} onChange={(event) => onGithubFormChange({ ...githubForm, appId: event.target.value })} disabled={!connected || githubSaving} label="App"><option value="">Choose app</option>{apps.map((app) => <option key={app.id} value={app.id}>{app.name}</option>)}</UiSelect>
              <Field label="Repository" value={githubForm.fullName} onChange={(value) => onGithubFormChange({ ...githubForm, fullName: value })} placeholder="owner/repo" disabled={!connected || githubSaving} />
              <Field label="Branch" value={githubForm.branch} onChange={(value) => onGithubFormChange({ ...githubForm, branch: value })} placeholder="main" disabled={!connected || githubSaving} />
              <div className="flex items-end"><PillButton onClick={onGithubConnect} disabled={!connected || githubSaving || !githubForm.appId || !githubForm.fullName.trim()} strong>{githubSaving ? "Saving" : "Connect"}</PillButton></div>
            </div>
            <label className="mt-3 flex items-center justify-between gap-3 rounded-md bg-black/20 px-3 py-2 text-xs">
              <span><span className="font-bold">Auto deploy on push</span><span className="block text-muted">Only matching branch push events queue deployments.</span></span>
              <input type="checkbox" checked={githubForm.autoDeploy} onChange={(event) => onGithubFormChange({ ...githubForm, autoDeploy: event.target.checked })} disabled={githubSaving} className="h-4 w-4 accent-[var(--accent)]" />
            </label>
          </div>
          <DeferredCapabilityList items={["OAuth install callback deferred", "Live repo browsing deferred", "Commit status updates deferred", "Preview deployments deferred", "RBAC deferred", "Multi-server deploys deferred"]} />
        </div>
        <div className="min-w-0">
          <ResourceSection title="Repositories" count={github?.repositories.length || 0} />
          {github?.repositories.length ? github.repositories.map((repo) => {
            const repoDeployments = githubDeployments.filter((deployment) => deployment.repo === repo.fullName || (repo.connectedAppId != null && deployment.appId === repo.connectedAppId));
            const latestRepoDeploy = repoDeployments[0] || null;
            const latestRepoDelivery = githubLatestDelivery(deliveries, repo) || deliveries.find((delivery) => repo.connectedAppId != null && delivery.appId === repo.connectedAppId) || null;
            const latestRepoDeliveryDeployment = latestRepoDelivery?.deploymentId ? deploymentsById.get(latestRepoDelivery.deploymentId) : latestRepoDeploy;
            const deliveryState = githubDeliveryState(latestRepoDelivery, latestRepoDeliveryDeployment);
            return (
              <div key={repo.id} className="border-b border-white/5 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-bold">{repo.fullName}</p>
                    <p className="mt-1 text-[11px] text-muted">{repo.connectedAppName || "not connected"} · {githubRepositoryBranch(repo)} · {repo.private ? "private" : "public"}</p>
                  </div>
                  <StatusBadge status={repo.autoDeployEnabled ? "running" : "stopped"} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <ReadinessCard label="Auto deploy" value={repo.autoDeployEnabled ? "on" : "off"} status={repo.autoDeployEnabled ? "ok" : "warn"} />
                  <ReadinessCard label="Branch" value={githubRepositoryBranch(repo)} status={repo.selectedBranch || repo.defaultBranch ? "ok" : "warn"} />
                  <ReadinessCard label="Latest delivery" value={deliveryState.label} status={deliveryState.tone} />
                  <ReadinessCard label="Latest deploy" value={latestRepoDeploy ? `#${latestRepoDeploy.id}` : "none"} status={latestRepoDeploy ? readinessFromStatus(latestRepoDeploy.status) : "warn"} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                  <Meta label="Install" value={repo.installationId ? String(repo.installationId) : "manual"} mono />
                  <Meta label="Synced" value={timeAgo(repo.lastSyncedAt)} />
                  <Meta label="Commit" value={latestRepoDeploy?.commitSha?.slice(0, 12) || latestRepoDelivery?.commitSha?.slice(0, 12) || "none"} mono />
                  <Meta label="Logs path" value={latestRepoDeploy ? githubDeliveryLogPath(latestRepoDelivery, latestRepoDeploy) : "deploy pending"} mono />
                </div>
              </div>
            );
          }) : <div className="border-b border-white/5 px-4 py-5 text-sm text-muted">Connect a repository to store source metadata and enable signed push-to-deploy.</div>}
          <ResourceSection title="Recent deliveries" count={github?.deliveries.length || 0} />
          {deliveries.length ? deliveries.slice(0, 12).map((delivery) => {
            const deployment = delivery.deploymentId ? deploymentsById.get(delivery.deploymentId) || null : null;
            const deliveryState = githubDeliveryState(delivery, deployment);
            return (
              <div key={delivery.deliveryId} className="border-b border-white/5 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{delivery.repo || delivery.event}</p>
                    <p className="mt-1 truncate font-mono text-[11px] text-muted">{delivery.event}{delivery.action ? `:${delivery.action}` : ""} · {delivery.branch || "-"} · {delivery.commitSha?.slice(0, 12) || "no commit"} · {timeAgo(delivery.receivedAt)}</p>
                  </div>
                  <StatusBadge status={delivery.status} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                  <Meta label="Diagnosis" value={deliveryState.label} />
                  <Meta label="Signature" value={delivery.signatureValid ? "valid" : "invalid"} />
                  <Meta label="App" value={delivery.appName || "unmatched"} />
                  <Meta label="Deploy" value={delivery.deploymentId ? `#${delivery.deploymentId}` : "none"} />
                  <Meta label="Phase" value={deployment ? deploymentStateLabel(deployment) : "not queued"} />
                  <Meta label="Logs path" value={githubDeliveryLogPath(delivery, deployment)} mono />
                  <Meta label="Processed" value={timeAgo(delivery.processedAt)} />
                  <Meta label="Delivery ID" value={delivery.deliveryId} mono />
                </div>
                {deliveryState.detail || delivery.message ? <p className={`mt-2 text-xs ${deliveryState.tone === "error" ? "text-negative" : "text-muted"}`}>{deliveryState.detail || delivery.message}</p> : null}
                {deployment ? <div className="mt-3"><PillButton onClick={() => onDeploymentLogs(deployment)}>Open logs</PillButton></div> : null}
              </div>
            );
          }) : <div className="border-b border-white/5 px-4 py-5 text-sm text-muted">Signed push deliveries appear here after GitHub sends webhooks.</div>}
          <ResourceSection title="GitHub deploy history" count={githubDeployments.length} />
          <div className="grid grid-cols-2 gap-2 border-b border-white/5 px-4 py-3 sm:grid-cols-3">
            <ReadinessCard label="Latest deploy" value={latestDeploy ? `#${latestDeploy.id}` : "none"} status={latestDeploy ? readinessFromStatus(latestDeploy.status) : "warn"} />
            <ReadinessCard label="Latest success" value={latestSuccess ? `#${latestSuccess.id}` : "none"} status={latestSuccess ? "ok" : "warn"} />
            <ReadinessCard label="Latest delivery" value={latestDeliveryState.label} status={latestDeliveryState.tone} />
          </div>
          {githubDeployments.length ? githubDeployments.slice(0, 12).map((deployment) => (
            <div key={deployment.id} className="border-b border-white/5 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">Deployment #{deployment.id}</p>
                  <p className="mt-1 truncate font-mono text-[11px] text-muted">{deploymentSource(deployment)}</p>
                </div>
                <StatusBadge status={deployment.status} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                <Meta label="State" value={deploymentStateLabel(deployment)} />
                <Meta label="Commit" value={deployment.commitSha?.slice(0, 12) || "none"} mono />
                <Meta label="Branch" value={deployment.branch || "none"} mono />
                <Meta label="Logs path" value={githubDeliveryLogPath(null, deployment)} mono />
                <Meta label="Started" value={timeAgo(deployment.startedAt || deployment.createdAt)} />
                <Meta label="Finished" value={timeAgo(deployment.finishedAt)} />
              </div>
              {deployment.errorMessage ? <p className="mt-2 rounded-md bg-negative/10 px-3 py-2 text-xs text-negative">{deployment.errorMessage}</p> : null}
              <div className="mt-3"><PillButton onClick={() => onDeploymentLogs(deployment)}>Open logs</PillButton></div>
            </div>
          )) : <div className="px-4 py-5 text-sm text-muted">GitHub-triggered deployments appear here after a signed matching-branch push queues a deploy.</div>}
        </div>
      </div>
    </section>
  );
}

function DatabasesModule({ connected, databaseActionById, databaseForm, databaseSaving, databases, databasesError, loading, onCreateDatabase, onDatabaseAction, onDatabaseFormChange }: { connected: boolean; databaseActionById: Record<number, string | null>; databaseForm: { type: string; name: string }; databaseSaving: boolean; databases: DaemonDatabase[]; databasesError: string | null; loading: boolean; onCreateDatabase: () => void; onDatabaseAction: (database: DaemonDatabase, action: "start" | "stop") => void; onDatabaseFormChange: (form: { type: string; name: string }) => void }) {
  const running = databases.filter((database) => database.status === "running").length;
  const publicDatabases = databases.filter((database) => !database.internal).length;
  return (
    <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW}`}>
      <ModuleHeader module="databases" stats={<><ReadinessCard label="Records" value={loading ? "loading" : String(databases.length)} status={databases.length ? "ok" : "warn"} /><ReadinessCard label="Running" value={String(running)} status={running ? "ok" : "warn"} /><ReadinessCard label="Network" value={publicDatabases ? `${publicDatabases} public` : "internal"} status={publicDatabases ? "error" : "ok"} /></>} />
      {databasesError ? <Alert title="Database action failed" message={databasesError} /> : null}
      <div className="grid gap-0 xl:grid-cols-[minmax(0,0.72fr)_minmax(340px,1.28fr)]">
        <div className="min-w-0 border-b border-white/5 xl:border-b-0 xl:border-r">
          <ResourceSection title="Create database" count={5} />
          <div className="px-4 py-3"><div className="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)_auto]"><UiSelect value={databaseForm.type} onChange={(event) => onDatabaseFormChange({ ...databaseForm, type: event.target.value, name: databaseForm.name || event.target.value })} disabled={!connected || databaseSaving} label="Type" options={["postgres", "mysql", "mariadb", "redis", "mongodb"]} /><Field label="Name" value={databaseForm.name} onChange={(value) => onDatabaseFormChange({ ...databaseForm, name: value })} placeholder="postgres" disabled={!connected || databaseSaving} /><div className="flex items-end"><PillButton strong onClick={onCreateDatabase} disabled={!connected || databaseSaving || !databaseForm.name.trim()}>{databaseSaving ? "Creating" : "Create"}</PillButton></div></div><div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><Meta label="Runtime" value="Docker Compose service" /><Meta label="Secrets" value="env key names only" /></div></div>
          <DeferredCapabilityList items={["Restore automation deferred", "External database exposure deferred", "Raw env values hidden"]} />
        </div>
        <div className="min-w-0"><ResourceSection title="Database ledger" count={databases.length} />{loading ? <LoadingRows /> : databases.length === 0 ? <DataEmpty title="No database services" detail="Create a supported internal Compose database when an app needs production state." /> : databases.map((database) => <DatabaseLedgerRow key={database.id} busy={databaseActionById[database.id]} connected={connected} database={database} onAction={onDatabaseAction} />)}</div>
      </div>
    </section>
  );
}

function BackupsModule({ backupActionById, backupForm, backupJobs, backupRuns, backupsError, connected, databases, loading, onBackupFormChange, onEnableBackup, onRunBackup, onToggleBackup }: { backupActionById: Record<number, string | null>; backupForm: { databaseId: string; schedule: string; retentionDays: string }; backupJobs: DaemonBackupJob[]; backupRuns: DaemonBackupRun[]; backupsError: string | null; connected: boolean; databases: DaemonDatabase[]; loading: boolean; onBackupFormChange: (form: { databaseId: string; schedule: string; retentionDays: string }) => void; onEnableBackup: () => void; onRunBackup: (job: DaemonBackupJob) => void; onToggleBackup: (job: DaemonBackupJob, enabled: boolean) => void }) {
  const latestRun = backupRuns[0] || null;
  const failedRuns = backupRuns.filter((run) => run.status === "failed");
  return (
    <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW}`}>
      <ModuleHeader module="backups" stats={<><ReadinessCard label="Jobs" value={loading ? "loading" : String(backupJobs.length)} status={backupJobs.length ? "ok" : "warn"} /><ReadinessCard label="Latest" value={latestRun?.status || "never"} status={latestRun?.status === "succeeded" ? "ok" : latestRun?.status === "failed" ? "error" : "warn"} /><ReadinessCard label="Failed" value={String(failedRuns.length)} status={failedRuns.length ? "error" : "ok"} /><ReadinessCard label="Storage" value="local files" status="ok" /></>} />
      {backupsError ? <Alert title="Backup action failed" message={backupsError} /> : null}
      <div className="grid gap-0 xl:grid-cols-[minmax(0,0.82fr)_minmax(340px,1.18fr)]">
        <div className="min-w-0 border-b border-white/5 xl:border-b-0 xl:border-r"><ResourceSection title="Enable backup job" count={databases.length} /><div className="px-4 py-3"><div className="grid gap-2 sm:grid-cols-[minmax(120px,0.9fr)_minmax(0,1fr)_100px_auto]"><UiSelect value={backupForm.databaseId} onChange={(event) => onBackupFormChange({ ...backupForm, databaseId: event.target.value })} disabled={!connected || databases.length === 0} label="Database"><option value="">Choose</option>{databases.map((database) => <option key={database.id} value={database.id}>{database.name}</option>)}</UiSelect><Field label="Schedule" value={backupForm.schedule} onChange={(value) => onBackupFormChange({ ...backupForm, schedule: value })} placeholder="0 2 * * *" disabled={!connected} mono /><Field label="Keep days" value={backupForm.retentionDays} onChange={(value) => onBackupFormChange({ ...backupForm, retentionDays: value })} placeholder="7" disabled={!connected} type="number" /><div className="flex items-end"><PillButton strong onClick={onEnableBackup} disabled={!connected || !backupForm.databaseId}>Enable</PillButton></div></div><div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><Meta label="Storage" value="local backup directory" /><Meta label="Restore" value="deferred, not exposed" /></div></div><DeferredCapabilityList items={["External object storage deferred", "Restore UI deferred until backend exists", "Backup files stay local"]} /><ResourceSection title="Backup jobs" count={backupJobs.length} />{loading ? <LoadingRows /> : backupJobs.length === 0 ? <DataEmpty title="No backup jobs" detail="Enable a job for a database to schedule local backups or run one manually." /> : backupJobs.map((job) => <BackupJobLedgerRow key={job.id} busy={backupActionById[job.id]} connected={connected} job={job} latestRun={backupRuns.find((run) => run.backupJobId === job.id) || null} onRunBackup={onRunBackup} onToggleBackup={onToggleBackup} />)}</div>
        <div className="min-w-0"><ResourceSection title="Run history" count={backupRuns.length} />{loading ? <LoadingRows /> : backupRuns.length === 0 ? <DataEmpty title="No backup runs" detail="Manual and scheduled runs will appear here with file or failure message state." /> : backupRuns.map((run) => <BackupRunLedgerRow key={run.id} run={run} />)}</div>
      </div>
    </section>
  );
}

function DatabaseLedgerRow({ busy, connected, database, onAction }: { busy: string | null | undefined; connected: boolean; database: DaemonDatabase; onAction: (database: DaemonDatabase, action: "start" | "stop") => void }) {
  const running = database.status === "running";
  const exposure = databaseExposureLabel(database);
  return (
    <article className="grid gap-3 border-b border-white/5 px-4 py-3 transition hover:bg-white/[0.025] xl:grid-cols-[minmax(180px,0.8fr)_minmax(280px,1.2fr)_minmax(220px,0.9fr)_auto] xl:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-black/30 font-mono text-[10px] font-black uppercase text-accent shadow-[0_0_0_1px_var(--border)_inset]">{database.type.slice(0, 2)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{database.name}</p>
            <p className="truncate font-mono text-[11px] text-muted">{database.type} · {database.image || "image pending"}</p>
          </div>
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-2 text-xs sm:grid-cols-4 xl:grid-cols-2">
        <Meta label="State" value={exposure.label === "internal-only" ? "internal database" : "public requested"} />
        <Meta label="Scope" value={exposure.label} />
        <Meta label="Service" value={database.composeService || "compose pending"} mono />
        <Meta label="Volume" value={database.volumeName || "volume pending"} mono />
        <Meta label="Port" value={database.port ? `:${database.port}` : "none"} mono />
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-2 text-xs sm:grid-cols-3 xl:grid-cols-2">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Status</p><div className="mt-1"><StatusBadge status={database.status} /></div></div>
        <Meta label="App" value={database.appName || "service only"} />
        <Meta label="Env keys" value={database.envKeys.length ? database.envKeys.join(", ") : "none"} mono wide />
      </div>
      <div className="flex flex-wrap gap-1.5 xl:justify-end xl:flex-nowrap">
        <PillButton onClick={() => onAction(database, "start")} disabled={!connected || Boolean(busy) || running}>{busy === "start" ? "Starting" : "Start"}</PillButton>
        <PillButton onClick={() => onAction(database, "stop")} disabled={!connected || Boolean(busy) || !running}>{busy === "stop" ? "Stopping" : "Stop"}</PillButton>
      </div>
    </article>
  );
}

function BackupJobLedgerRow({ busy, connected, job, latestRun, onRunBackup, onToggleBackup }: { busy: string | null | undefined; connected: boolean; job: DaemonBackupJob; latestRun: DaemonBackupRun | null; onRunBackup: (job: DaemonBackupJob) => void; onToggleBackup: (job: DaemonBackupJob, enabled: boolean) => void }) {
  const storage = backupStorageLabel(job);
  const restore = backupRestoreLabel(job);
  return (
    <article className="grid gap-3 border-b border-white/5 px-4 py-3 transition hover:bg-white/[0.025] xl:grid-cols-[minmax(180px,0.85fr)_minmax(260px,1.05fr)_minmax(220px,0.95fr)_auto] xl:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={job.enabled ? "running" : "stopped"} />
          <p className="truncate text-sm font-bold">{job.databaseName || `database ${job.databaseId}`}</p>
          <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{job.databaseType || "db"}</span>
        </div>
        <p className="mt-1 truncate font-mono text-[11px] text-muted">{job.localDir || "default backup dir"} · {storage.label}</p>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-2 text-xs sm:grid-cols-3 xl:grid-cols-2">
        <Meta label="Schedule" value={job.schedule || "manual only"} mono />
        <Meta label="Retention" value={job.retentionStatus || `${job.retentionDays} days`} />
        <Meta label="Storage" value={storage.label} />
        <Meta label="Restore" value={restore.label} />
        <Meta label="Last run" value={job.lastRunAt ? timeAgo(job.lastRunAt) : "never"} />
        <Meta label="Last state" value={job.lastRunStatus || "none"} />
      </div>
      <div className="min-w-0 text-xs text-muted">
        <p className="line-clamp-2 break-words">{job.lastRunMessage || latestRun?.message || (latestRun ? backupRunFileState(latestRun).label : null) || "No run message recorded."}</p>
        {latestRun ? <p className="mt-1 truncate font-mono text-[11px]">run #{latestRun.id} · {latestRun.status} · {latestRun.storageStatus || "metadata-only"} · {formatBytes(latestRun.sizeBytes)}</p> : null}
      </div>
      <div className="flex flex-wrap gap-1.5 xl:justify-end xl:flex-nowrap">
        <PillButton onClick={() => onRunBackup(job)} disabled={!connected || Boolean(busy)}>{busy === "run" ? "Running" : "Run"}</PillButton>
        <PillButton onClick={() => onToggleBackup(job, !job.enabled)} disabled={!connected || Boolean(busy)}>{busy === "enable" ? "Enabling" : busy === "disable" ? "Disabling" : job.enabled ? "Disable" : "Enable"}</PillButton>
      </div>
    </article>
  );
}

function BackupRunLedgerRow({ run }: { run: DaemonBackupRun }) {
  const fileState = backupRunFileState(run);
  return (
    <article className="grid gap-3 border-b border-white/5 px-4 py-3 transition hover:bg-white/[0.025] xl:grid-cols-[minmax(180px,0.8fr)_minmax(220px,0.85fr)_minmax(260px,1.15fr)] xl:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={run.status} /><p className="truncate text-sm font-bold">#{run.id} {run.databaseName || `database ${run.databaseId}`}</p></div>
        <p className="mt-1 truncate font-mono text-[11px] text-muted">{run.databaseType || "database"} · {run.trigger}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Meta label="Started" value={timeAgo(run.startedAt || run.createdAt)} />
        <Meta label="Finished" value={timeAgo(run.finishedAt)} />
        <Meta label="Size" value={formatBytes(run.sizeBytes)} />
        <Meta label="Job" value={`#${run.backupJobId}`} mono />
        <Meta label="Storage" value={run.storageStatus || "metadata-only"} />
        <Meta label="Restore" value={run.restoreStatus || "deferred"} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">File / message</p>
        <p className={`mt-1 break-all font-mono text-[11px] ${fileState.tone === "error" ? "text-negative" : "text-muted"}`}>{fileState.label}{run.message ? ` · ${run.message}` : ""}</p>
        <p className={`mt-1 text-[11px] ${fileState.label === "download exposed" ? "text-negative" : "text-muted"}`}>{fileState.label === "download exposed" ? "download URL exposed unexpectedly; review daemon response" : "local file metadata only; no dashboard download"}</p>
      </div>
    </article>
  );
}

function DeferredCapabilityList({ items }: { items: string[] }) {
  return (
    <div className="border-t border-white/5 bg-black/20 px-4 py-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Deferred capabilities</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => <span key={item} className="rounded-full bg-surface-raised px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted/65">{item}</span>)}
      </div>
    </div>
  );
}

function DataEmpty({ detail, title }: { detail: string; title: string }) {
  return (
    <div className="border-b border-white/5 px-4 py-5">
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 max-w-xl text-sm text-muted">{detail}</p>
    </div>
  );
}

function OverviewPanel({ apps, connected, deployments, domains, domainsMeta, github, healthchecksUnavailable, onSelect, proxyRoutes, server, workspace }: { apps: DaemonApp[]; connected: boolean; deployments: DaemonDeployment[]; domains: DaemonDomain[]; domainsMeta: { rootDomain: string | null; serverPublicIp: string | null }; github: DaemonGithubStatus | null; healthchecksUnavailable: string | null | undefined; onSelect: (module: ModuleKey) => void; proxyRoutes: DaemonProxyRoute[]; server: DaemonServerStatus | null; workspace: string }) {
  const failedDeploys = deployments.filter((deployment) => deployment.status === "failed").slice(0, 3);
  const recentDeploys = deployments.slice(0, 5);
  const domainAttention = domains.filter((domain) => domain.dnsStatus !== "verified" || domain.tlsStatus !== "active").slice(0, 4);
  const pendingApps = apps.filter((app) => app.needsRedeploy || app.needsRestart);
  const running = apps.filter((app) => app.status === "running").length;
  const stopped = apps.filter((app) => app.status === "stopped").length;
  const crashed = apps.filter((app) => app.status === "crashed" || app.status === "failed").length;
  const disabled = apps.filter((app) => !app.enabled).length;
  const latestDeploy = deployments[0] || null;
  const verifiedDomains = domains.filter((domain) => domain.dnsStatus === "verified" || domain.status === "ready").length;
  const enabledRoutes = proxyRoutes.filter((route) => route.enabled).length;
  const githubConnected = Boolean(github?.repositories.some((repo) => repo.connectedAppId));
  const urgent = [
    ...failedDeploys.map((deployment) => ({ key: `deploy-${deployment.id}`, title: deployment.appName || `deployment ${deployment.id}`, detail: deployment.errorMessage || deployment.phase, tone: "error" as const, module: "deployments" as ModuleKey })),
    ...domainAttention.map((domain) => ({ key: `domain-${domain.id}`, title: domain.hostname, detail: `${domain.dnsStatus} DNS · ${httpsSummary([domain])}`, tone: tlsTone(domain.tlsStatus), module: "domains" as ModuleKey })),
    ...pendingApps.slice(0, 5).map((app) => ({ key: `pending-${app.id}`, title: app.name, detail: pendingStateLabel(app), tone: "warn" as const, module: "apps" as ModuleKey }))
  ].slice(0, 7);

  return (
    <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW} lg:col-span-2`}>
      <div className="grid gap-4 border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent px-4 py-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] xl:items-start">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Solo operator console</p>
          <h1 className="text-xl font-bold leading-tight">Runtime host operations</h1>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <Meta label="Daemon" value={connected ? "connected" : "offline"} />
            <Meta label="Mode" value={server?.mode || "local"} />
            <Meta label="Workspace" value={workspace} mono wide />
            <Meta label="Data dir" value={server?.dataDir || "runtime host state"} mono wide />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
          <ReadinessCard label="Daemon" value={connected ? "online" : "offline"} status={connected ? "ok" : "error"} />
          <ReadinessCard label="Server" value={server?.readiness?.ok ? "ready" : server?.production ? "check" : "local"} status={server?.readiness?.ok || !server?.production ? "ok" : "warn"} />
          <ReadinessCard label="Apps" value={`${running}/${apps.length} run`} status={running || apps.length === 0 ? "ok" : "warn"} />
          <ReadinessCard label="Pending" value={String(pendingApps.length)} status={pendingApps.length ? "warn" : "ok"} />
        </div>
      </div>
      {healthchecksUnavailable ? <Alert title="Some overview data is stale" message={healthchecksUnavailable} /> : null}
      <div className="grid gap-3 px-4 py-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          <OverviewStatusCard title="Resources" action="Apps" onAction={() => onSelect("apps")} items={[`running ${running}`, `stopped ${stopped}`, `crashed ${crashed}`, `disabled ${disabled}`]} tone={crashed ? "error" : pendingApps.length ? "warn" : "ok"} />
          <OverviewStatusCard title="Latest deploy" action="Deploy" onAction={() => onSelect("deployments")} items={latestDeploy ? [latestDeploy.appName || `app ${latestDeploy.appId}`, deploymentStateLabel(latestDeploy), timeAgo(latestDeploy.updatedAt)] : ["no deployments", "Dockerfile bridge only"]} tone={latestDeploy ? statusTone(latestDeploy.status) : "warn"} />
          <OverviewStatusCard title="Domains & proxy" action="Domains" onAction={() => onSelect("domains")} items={[domainsMeta.rootDomain || "root unset", `${verifiedDomains}/${domains.length} DNS ready`, `${enabledRoutes} generated routes`]} tone={domains.length && verifiedDomains === domains.length ? "ok" : domains.length ? "warn" : "warn"} />
          <OverviewStatusCard title="GitHub deploys" action="GitHub" onAction={() => onSelect("github")} items={[github?.configured ? "GitHub app configured" : "GitHub app missing", githubConnected ? "repo connected" : "no repo connected", latestDeploy ? `latest deploy ${deploymentStateLabel(latestDeploy)}` : "no deploy history"]} tone={githubConnected ? "ok" : "warn"} />
        </div>
        <OverviewList title="Urgent next actions" empty="No loaded blockers from current data." action="Review" onAction={() => onSelect(urgent[0]?.module || "apps")}>
          {urgent.map((item) => <TimelineRow key={item.key} title={item.title} detail={item.detail} tone={item.tone} />)}
        </OverviewList>
      </div>
      <div className="grid gap-3 border-t border-white/5 bg-black/10 px-4 py-4 lg:grid-cols-2">
        <OverviewList title="Recent deployments" empty="No deployments yet." action="Deployments" onAction={() => onSelect("deployments")}>
          {recentDeploys.slice(0, 3).map((deployment) => <TimelineRow key={deployment.id} title={`#${deployment.id} ${deployment.appName || "app"}`} detail={`${deploymentStateLabel(deployment)} · ${timeAgo(deployment.updatedAt)}`} tone={deployment.status === "failed" ? "error" : deployment.status === "succeeded" ? "ok" : "warn"} />)}
        </OverviewList>
        <OverviewList title="Domain readiness" empty="No domains configured." action="Domains" onAction={() => onSelect("domains")}>
          {domains.slice(0, 4).map((domain) => <TimelineRow key={domain.id} title={domain.hostname} detail={`${domainDnsLabel(domain.dnsStatus)} · ${domainTlsLabel(domain.tlsStatus)}`} tone={domain.dnsStatus !== "verified" ? "warn" : tlsTone(domain.tlsStatus)} />)}
        </OverviewList>
      </div>
    </section>
  );
}

function OverviewStatusCard({ action, items, onAction, title, tone }: { action: string; items: string[]; onAction: () => void; title: string; tone: "ok" | "warn" | "error" }) {
  const color = tone === "ok" ? "bg-accent" : tone === "warn" ? "bg-warning" : "bg-negative";
  return (
    <button type="button" onClick={onAction} className={`min-w-0 rounded-md bg-black/20 px-3 py-3 text-left transition hover:bg-white/[0.035] ${INSET_RING} ${FOCUS_RING}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
          <span className="truncate text-sm font-bold">{title}</span>
        </span>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{action}</span>
      </div>
      <div className="mt-3 grid gap-1">
        {items.map((item) => <p key={item} className="truncate text-[11px] text-muted">{item}</p>)}
      </div>
    </button>
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

function NotificationsPanel({ attempts, channels, connected, error, form, loading, notificationActionById, onChange, onCreate, onTest, onToggle, saving }: { attempts: DaemonNotificationAttempt[]; channels: DaemonNotificationChannel[]; connected: boolean; error: string | null; form: { type: string; name: string; url: string; botToken: string; chatId: string; events: string }; loading: boolean; notificationActionById: Record<number, string | null>; onChange: (form: { type: string; name: string; url: string; botToken: string; chatId: string; events: string }) => void; onCreate: () => void; onTest: (channel: DaemonNotificationChannel) => void; onToggle: (channel: DaemonNotificationChannel, enabled: boolean) => void; saving: boolean }) {
  const update = (patch: Partial<typeof form>) => onChange({ ...form, ...patch });
  const failedAttempts = attempts.filter((attempt) => attempt.status === "failed").length;
  return (
    <section className={`min-w-0 overflow-hidden rounded-lg bg-surface ${PANEL_SHADOW} lg:col-span-2`}>
      <div className="flex flex-col gap-3 border-b border-white/5 bg-gradient-to-b from-white/[0.035] to-transparent px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Settings</p>
          <h1 className="text-xl font-bold leading-tight">Notifications and safety</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">Webhook, Discord, and Telegram channels with redacted targets and recorded delivery attempts.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <ReadinessCard label="Channels" value={loading ? "loading" : String(channels.length)} status={channels.length ? "ok" : "warn"} />
          <ReadinessCard label="Enabled" value={String(channels.filter((channel) => channel.enabled).length)} status={channels.some((channel) => channel.enabled) ? "ok" : "warn"} />
          <ReadinessCard label="Attempts" value={String(attempts.length)} status={failedAttempts ? "warn" : "ok"} />
        </div>
      </div>
      {error ? <Alert title="Notifications unavailable" message={error} /> : null}
      <div className="grid gap-0 xl:grid-cols-[minmax(0,0.82fr)_minmax(360px,1.18fr)]">
        <div className="min-w-0 border-b border-white/5 xl:border-b-0 xl:border-r">
        <ResourceSection title="Add channel" count={3} />
        <form onSubmit={(event) => { event.preventDefault(); onCreate(); }} className="grid gap-3 border-b border-white/5 px-4 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Channel" value={form.type} values={["webhook", "discord", "telegram"]} onChange={(value) => update({ type: value })} disabled={!connected || saving} />
            <Field label="Name" value={form.name} onChange={(value) => update({ name: value })} disabled={!connected || saving} />
            {form.type === "telegram" ? <Field label="Bot token" value={form.botToken} onChange={(value) => update({ botToken: value })} disabled={!connected || saving} mono /> : <Field label="Webhook URL" value={form.url} onChange={(value) => update({ url: value })} disabled={!connected || saving} mono wide />}
            {form.type === "telegram" ? <Field label="Chat ID" value={form.chatId} onChange={(value) => update({ chatId: value })} disabled={!connected || saving} mono /> : null}
            <Field label="Events" value={form.events} onChange={(value) => update({ events: value })} disabled={!connected || saving} mono wide />
          </div>
          <PillButton type="submit" strong disabled={!connected || saving}>{saving ? "Saving" : "Add channel"}</PillButton>
        </form>
        <DeferredCapabilityList items={["Email deferred", "Raw webhook URLs hidden", "Private/loopback targets rejected by daemon"]} />
        </div>
        <div className="min-w-0">
          <ResourceSection title="Channels" count={channels.length} />
          {loading ? <LoadingRows /> : channels.length === 0 ? <DataEmpty title="No notification channels" detail="Add a channel to receive deploy failure events. Targets remain redacted after save." /> : channels.map((channel) => <NotificationChannelRow key={channel.id} action={notificationActionById[channel.id]} attempts={attempts.filter((attempt) => attempt.channelId === channel.id).slice(0, 3)} channel={channel} connected={connected} onTest={onTest} onToggle={onToggle} />)}
          <ResourceSection title="Recent delivery attempts" count={attempts.length} />
          {loading ? <LoadingRows /> : attempts.length === 0 ? <DataEmpty title="No deliveries yet" detail="Test sends and subscribed deploy events will appear here." /> : attempts.slice(0, 10).map((attempt) => <NotificationAttemptRow key={attempt.id} attempt={attempt} />)}
        </div>
      </div>
    </section>
  );
}

function NotificationChannelRow({ action, attempts, channel, connected, onTest, onToggle }: { action: string | null | undefined; attempts: DaemonNotificationAttempt[]; channel: DaemonNotificationChannel; connected: boolean; onTest: (channel: DaemonNotificationChannel) => void; onToggle: (channel: DaemonNotificationChannel, enabled: boolean) => void }) {
  return (
    <div className="grid gap-3 border-b border-white/5 px-4 py-3 transition hover:bg-white/[0.025] xl:grid-cols-[minmax(220px,0.85fr)_minmax(240px,1fr)_minmax(220px,0.85fr)_auto] xl:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={channel.enabled ? "running" : "stopped"} />
          <p className="truncate text-sm font-bold">{channel.name}</p>
          <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{channel.type}</span>
        </div>
        <p className="mt-1 truncate font-mono text-[11px] text-muted">{redactedTarget(channel.target, channel.type)}</p>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-2 text-xs sm:grid-cols-3 xl:grid-cols-2">
        <Meta label="Events" value={channel.events.length ? channel.events.join(", ") : "none"} />
        <Meta label="Enabled" value={channel.enabled ? "yes" : "no"} />
        <Meta label="Updated" value={timeAgo(channel.updatedAt)} />
        <Meta label="Created" value={timeAgo(channel.createdAt)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Recent attempts</p>
        {attempts.length === 0 ? <p className="mt-1 text-xs text-muted">No deliveries recorded.</p> : attempts.map((attempt) => <p key={attempt.id} className="mt-1 truncate text-[11px] text-muted">{attempt.event} · {attempt.status}{attempt.httpStatus ? ` · HTTP ${attempt.httpStatus}` : ""}</p>)}
      </div>
      <div className="flex flex-wrap gap-1.5 xl:justify-end xl:flex-nowrap">
        <PillButton onClick={() => onTest(channel)} disabled={!connected || !channel.enabled || Boolean(action)}>{action === "test" ? "Testing" : "Test"}</PillButton>
        <PillButton onClick={() => onToggle(channel, !channel.enabled)} disabled={!connected || Boolean(action)}>{action === "enable" ? "Enabling" : action === "disable" ? "Disabling" : channel.enabled ? "Disable" : "Enable"}</PillButton>
      </div>
    </div>
  );
}

function NotificationAttemptRow({ attempt }: { attempt: DaemonNotificationAttempt }) {
  return (
    <article className="grid gap-3 border-b border-white/5 px-4 py-3 transition hover:bg-white/[0.025] xl:grid-cols-[minmax(220px,0.9fr)_minmax(220px,0.85fr)_minmax(260px,1.05fr)] xl:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={attempt.status} /><p className="truncate text-sm font-bold">{attempt.event}</p></div>
        <p className="mt-1 truncate text-[11px] text-muted">{attempt.channelName || "deleted channel"} · {attempt.channelType || "channel"}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Meta label="Target" value={redactedTarget(attempt.target, attempt.channelType || "webhook")} mono />
        <Meta label="HTTP" value={attempt.httpStatus ? String(attempt.httpStatus) : "n/a"} />
        <Meta label="Resource" value={attempt.resourceType ? `${attempt.resourceType} ${attempt.resourceId || ""}`.trim() : "none"} />
        <Meta label="Finished" value={timeAgo(attempt.finishedAt || attempt.createdAt)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Message</p>
        <p className="mt-1 break-words text-xs text-muted">{attempt.message || "No delivery message."}</p>
      </div>
    </article>
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
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Server status</p>
          <h2 className="text-lg font-bold leading-tight sm:text-xl">Runtime host readiness</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            {server?.production
              ? "Production mode is enabled for this runtime host. Deployments, domains, GitHub, and notifications depend on the readiness checks below."
              : "This runtime host is in development mode. Run server init and server doctor before exposing deploy, domain, GitHub, or notification workflows."}
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
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Disabled / deferred actions</span>
          {(server?.disabledProductionActions || ["deployments", "domains", "https", "github"]).map((item) => (
            <span key={item} className="rounded-full bg-surface-raised px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted/60">
              {item === "backups" ? "backup/restore deferred in MVP" : `${item} disabled until ready`}
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
  deploying,
  domains,
  latestDeployment,
  server,
  onAction,
  onDeploy,
  onEdit,
  onLogs,
  onSelect
}: {
  active: boolean;
  app: DaemonApp;
  connected: boolean;
  currentAction?: AppAction | null;
  deploying: boolean;
  domains: DaemonDomain[];
  latestDeployment: DaemonDeployment | null;
  server: DaemonServerStatus | null;
  onAction: (action: AppAction) => void;
  onDeploy: () => void;
  onEdit: () => void;
  onLogs: () => void;
  onSelect: () => void;
}) {
  const busy = Boolean(currentAction);
  const running = app.status === "running" || app.status === "starting";
  const localUrl = appUrl(app);
  const disabledReason = !app.enabled ? "Disabled" : !connected ? "Offline" : null;
  const deployReason = deployBlockReason(app, connected, server);
  const pending = pendingStateLabel(app);
  const bulkStartReason = bulkStartSkipReason(app);
  const startReason = appActionBlockReason(app, "start", connected, busy);
  const stopReason = appActionBlockReason(app, "stop", connected, busy);
  const restartReason = appActionBlockReason(app, "restart", connected, busy);

  return (
    <article className={`grid min-w-0 gap-3 border-b border-white/5 px-3 py-3 transition hover:bg-white/[0.035] sm:px-4 lg:grid-cols-[minmax(220px,0.78fr)_minmax(0,1.22fr)] xl:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.28fr)] ${active ? "bg-white/[0.055] shadow-[3px_0_0_0_var(--accent)_inset]" : ""}`}>
      <button type="button" onClick={onSelect} className={`min-w-0 rounded-md text-left ${FOCUS_RING}`}>
        <div className="flex items-center gap-3">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-black ${running ? "bg-accent text-black" : "bg-surface-raised text-muted"}`}>
            {appInitials(app.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="min-w-[8rem] max-w-full flex-1 truncate text-sm font-bold">{app.name}</span>
              {disabledReason ? <span className="max-w-full rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{disabledReason}</span> : null}
              {bulkStartReason ? <span title={bulkStartReason} className="max-w-full truncate rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-warning">{bulkStartStateLabel(app)}</span> : null}
              {app.needsRestart || app.needsRedeploy ? <span className="max-w-full rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-warning">pending</span> : null}
            </span>
            <span className="block truncate font-mono text-[11px] text-muted">{resourceLabel(app)} · {app.driver}/{app.preset}</span>
          </span>
        </div>
      </button>
      <div className="grid min-w-0 grid-cols-2 gap-2 text-[11px] text-muted sm:grid-cols-4 xl:grid-cols-2">
        <Meta label="Path" value={shortPath(app.path)} mono />
        <Meta label="Port" value={app.port ? `:${app.port}` : "none"} mono />
        <Meta label="Domain" value={domainSummary(domains)} mono />
        <Meta label="Source" value={compactSource(app)} mono />
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Runtime</p>
          <div className="mt-1"><StatusBadge status={app.status} /></div>
        </div>
        <Meta label="Pending" value={pending} />
        <Meta label="Start All" value={bulkStartStateLabel(app)} />
        <Meta label="Deploy" value={deployReason || (latestDeployment ? `${latestDeployment.status} #${latestDeployment.id}` : "ready")} />
        <Meta label="Updated" value={timeAgo(app.updatedAt)} />
      </div>
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 sm:gap-2 lg:col-span-2 lg:justify-end">
        <RoundAction label="Start" onClick={() => onAction("start")} disabled={Boolean(startReason)} reason={startReason} active={currentAction === "start"} />
        <RoundAction label="Stop" onClick={() => onAction("stop")} disabled={Boolean(stopReason)} reason={stopReason} active={currentAction === "stop"} />
        <RoundAction label="Restart" onClick={() => onAction("restart")} disabled={Boolean(restartReason)} reason={restartReason} active={currentAction === "restart"} />
        <ActionLink href={localUrl}>Open</ActionLink>
        <PillButton onClick={onLogs} disabled={!connected}>Logs</PillButton>
        <PillButton onClick={onDeploy} disabled={Boolean(deployReason) || deploying}>{deploying ? "Deploying" : "Deploy"}</PillButton>
        <PillButton onClick={onEdit} disabled={!connected}>Edit</PillButton>
      </div>
      <div className="hidden">
        <StatusBadge status={app.status} />
      </div>
    </article>
  );
}

function DeploymentSummaryRow({ deployment, onLogs }: { deployment: DaemonDeployment; onLogs: () => void }) {
  return (
    <button type="button" onClick={onLogs} className={`block w-full border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/[0.035] ${FOCUS_RING}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">#{deployment.id} {deployment.appName || `app ${deployment.appId}`}</p>
          <p className="mt-1 truncate font-mono text-[11px] text-muted">{deploymentSource(deployment)}</p>
          <p className="mt-1 truncate text-[11px] text-muted">{deploymentStateLabel(deployment)} · {deployment.containerName || "container pending"} · {deployment.hostPort ? `:${deployment.hostPort}->${deployment.containerPort || "?"}` : "port pending"} · {deploymentLogsLabel(deployment)} · {deployment.startedAt ? timeAgo(deployment.startedAt) : timeAgo(deployment.createdAt)}</p>
          {deployment.errorMessage ? <p className="mt-2 text-xs text-negative">{deployment.errorMessage}</p> : null}
        </div>
        <StatusBadge status={deployment.status} />
      </div>
    </button>
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
  onReload,
  server
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
  server: DaemonServerStatus | null;
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

  const localUrl = appUrl(app);
  const latestDeployment = deployments[0] || null;
  const latestSuccessful = latestSuccessfulDeployment(deployments);
  const deployReason = deployBlockReason(app, connected, server);
  const healthStatus = appHealth?.status || "unknown";
  const healthState = appHealth?.available === false ? appHealth.reason || appHealth.message || healthStatus : healthStatus;
  const latestMetric = appMetrics[0] || null;
  const currentLogs = logs?.app.id === app.id ? logs : null;
  const currentDeploymentLogs = deploymentLogs?.deployment.appId === app.id ? deploymentLogs : null;
  const redeployPending = envRedeployLabel(app, appEnv?.pending.needsRedeploy);
  const busy = Boolean(currentAction);
  const startReason = !onAction ? "lifecycle action unavailable" : appActionBlockReason(app, "start", connected, busy);
  const stopReason = !onAction ? "lifecycle action unavailable" : appActionBlockReason(app, "stop", connected, busy);
  const restartReason = !onAction ? "lifecycle action unavailable" : appActionBlockReason(app, "restart", connected, busy);

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
          <RoundAction label="Start" onClick={() => onAction?.("start")} disabled={Boolean(startReason)} reason={startReason} active={currentAction === "start"} />
          <RoundAction label="Stop" onClick={() => onAction?.("stop")} disabled={Boolean(stopReason)} reason={stopReason} active={currentAction === "stop"} />
          <RoundAction label="Restart" onClick={() => onAction?.("restart")} disabled={Boolean(restartReason)} reason={restartReason} active={currentAction === "restart"} />
          <PillButton onClick={onEdit} disabled={!onEdit || !connected}>Edit</PillButton>
          <ActionLink href={localUrl}>Open</ActionLink>
          <PillButton onClick={onDeploy} disabled={Boolean(deployReason) || deploying} strong>{deploying ? "Deploying" : "Deploy"}</PillButton>
        </div>
        <p className="mt-2 text-[11px] text-muted">Start All state: {bulkStartStateLabel(app)}</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-white/5 bg-black/20 px-2 py-2">
        {(["overview", "runtime", "env", "logs", "health", "deployments", "domains"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`min-w-[5.8rem] rounded-full px-2 py-1.5 text-center text-[11px] font-bold capitalize ${FOCUS_RING} ${selectedTab === item ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground"}`}>{item}</button>
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
          <Meta label="Latest activity" value={latestDeployment ? deploymentStateLabel(latestDeployment) : "never deployed"} />
          <Meta label="Latest successful" value={latestSuccessful ? `#${latestSuccessful.id} · ${latestSuccessful.hostPort ? `:${latestSuccessful.hostPort}` : "no host port"}` : "none yet"} />
          <Meta label="Deploy gate" value={deployReason || "not blocked by current checks"} />
          <Meta label="Settings state" value={pendingStateLabel(app)} />
          <Meta label="Temporary URL" value={latestSuccessful?.hostPort ? `http://127.0.0.1:${latestSuccessful.hostPort}` : latestDeployment?.hostPort ? `http://127.0.0.1:${latestDeployment.hostPort}` : "-"} mono wide />
          <Meta label="Production domains" value={domains.map((domain) => `${domain.hostname} (${domain.status})`).join(", ") || "none"} mono wide />
          <Meta label="Path" value={app.path || "-"} mono wide />
          <Meta label="Healthcheck" value={app.healthcheck?.path ? `${app.healthcheck.path} -> ${app.healthcheck.expected_status || 200}` : "container state"} wide />
        </dl>
        </div>
      ) : null}

      {selectedTab === "runtime" ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 px-4 py-4 text-xs">
          <Meta label="Runtime" value={app.driver} />
          <Meta label="Preset" value={app.preset} />
          <Meta label="Enabled" value={app.enabled ? "yes" : "no"} />
          <Meta label="Internal" value={app.internal ? "yes" : "no"} />
          <Meta label="Install" value={app.install || "-"} mono wide />
          <Meta label="Dev" value={app.dev || app.command || "-"} mono wide />
          <Meta label="Build" value={app.build || "-"} mono wide />
          <Meta label="Start" value={app.start || "-"} mono wide />
          <Meta label="Image" value={app.image || "-"} mono wide />
          <Meta label="Compose" value={[app.composeFile, app.composeService].filter(Boolean).join(" / ") || "generated"} mono wide />
          <Meta label="Depends on" value={(app.dependsOn || []).join(", ") || "-"} wide />
          <Meta label="GitHub App" value={github?.configured ? "configured" : "not configured"} />
          <Meta label="Webhook" value={github?.webhookSecretConfigured ? "signed" : "missing secret"} />
          <Meta label="Source" value={app.source?.repo ? `${app.source.repo}:${app.source.branch || "main"}` : "-"} mono wide />
          <Meta label="Auto deploy" value={app.source?.auto_deploy?.enabled === false ? "disabled" : app.source?.type === "github" ? "enabled" : "not connected"} />
          <Meta label="Recent delivery" value={github?.deliveries.find((delivery) => delivery.appId === app.id || delivery.repo === app.source?.repo)?.status || "none"} wide />
          <Meta label="Volumes" value={(app.volumes || []).join(", ") || "-"} mono wide />
          <Meta label="Config env" value={envMetadata(app)} mono wide />
        </dl>
      ) : null}

      {selectedTab === "health" ? (
        <div>
          <div className="border-b border-white/5 px-4 py-3">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              <ReadinessCard label="State" value={healthState} status={healthStatus === "healthy" ? "ok" : healthStatus === "unknown" || appHealth?.available === false ? "warn" : "error"} />
              <ReadinessCard label="Response" value={appHealth?.checks[0]?.responseTimeMs == null ? "-" : `${appHealth.checks[0].responseTimeMs}ms`} status="ok" />
              <ReadinessCard label="Checks" value={String(appHealth?.checks.length || 0)} status={appHealth?.checks.length ? "ok" : "warn"} />
              <ReadinessCard label="CPU" value={latestMetric?.cpuPercent == null ? "-" : `${latestMetric.cpuPercent.toFixed(1)}%`} status="ok" />
              <ReadinessCard label="RAM" value={latestMetric ? formatBytes(latestMetric.memoryBytes) : "-"} status="ok" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PillButton onClick={() => void loadHealthAndMetrics(app)} disabled={!connected || healthLoading || metricsLoading}>{healthLoading || metricsLoading ? "Refreshing" : "Refresh health"}</PillButton>
              {healthError ? <span className="text-xs text-negative">{healthError}</span> : null}
            </div>
            {appHealth?.message ? <p className="mt-2 text-xs text-muted">{appHealth.message}</p> : null}
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
          <div className="border-b border-white/5 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Container and app samples</p>
            {metricsError ? <p className="mt-2 text-xs text-negative">{metricsError}</p> : null}
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
                  <p className="mt-1 text-[11px] text-muted">{domainTargetLabel(domain)} · {domain.verificationMessage || "verification pending"}</p>
                </div>
                <StatusBadge status={domain.status} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ReadinessCard label="DNS" value={domainDnsLabel(domain.dnsStatus)} status={domain.dnsStatus === "verified" ? "ok" : ["failed", "error", "mismatch"].includes(domain.dnsStatus) ? "error" : "warn"} />
                <ReadinessCard label="Proxy" value={domainProxyLabel(domain, domain.proxyStatus === "generated")} status={domain.proxyStatus === "generated" ? "ok" : domain.proxyStatus === "failed" ? "error" : "warn"} />
                <ReadinessCard label="TLS" value={domainTlsLabel(domain.tlsStatus)} status={tlsTone(domain.tlsStatus)} />
                <ReadinessCard label="Target" value={domainTargetLabel(domain)} status={domain.targetUrl || domain.targetPort ? "ok" : "warn"} />
              </div>
            </div>
          ))}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-3 border-t border-white/5 px-4 py-4 text-xs">
            <Meta label="Proxy exposure" value={app.internal || app.type === "database" ? "blocked" : "allowed after DNS verification"} />
            <Meta label="HTTPS" value={httpsSummary(domains)} />
            <Meta label="Public routes" value={domains.map((domain) => `${domain.hostname}:${domain.tlsStatus}`).join(", ") || "none"} mono wide />
          </dl>
        </div>
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
                  <p className="mt-1 break-all font-mono text-[11px] text-muted">{safeEnvDisplay(row)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{row.scope}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${row.isSecret ? "bg-warning/15 text-warning" : "bg-white/10 text-muted"}`}>{envVisibilityLabel(row)}</span>
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

      {selectedTab === "logs" ? <div className="border-t border-white/5">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Recent logs</p>
            <p className="text-xs text-muted">{currentLogs?.path ? `${logAvailabilityLabel(currentLogs)} · ${shortPath(currentLogs.path)}` : logAvailabilityLabel(currentLogs)}</p>
          </div>
          <PillButton onClick={onReload} disabled={!onReload || loading || !connected}>{loading ? "Loading" : "Reload"}</PillButton>
        </div>
        {error ? <div className="border-y border-negative/20 bg-negative/10 px-4 py-2 text-xs text-negative">{error}</div> : null}
        <TerminalSurface minHeight="min-h-[260px]" maxHeight="max-h-[420px]">
          {loading && !currentLogs ? "Loading logs..." : currentLogs ? currentLogs.logs || "Logs available but empty." : "Logs not loaded for this app."}
        </TerminalSurface>
        <div className="border-t border-white/5 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Deployment logs</p>
          {deploymentLogsError ? <p className="mt-2 text-xs text-negative">{deploymentLogsError}</p> : null}
          <TerminalSurface className="mt-2" minHeight="min-h-[180px]" maxHeight="max-h-[280px]">
            {deploymentLogsLoading && !currentDeploymentLogs ? "Loading deployment logs..." : currentDeploymentLogs?.logs.map((log) => log.message).join("") || "Select a deployment log from this app's deploy panel or Deployments tab."}
          </TerminalSurface>
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
          <p className="truncate text-[11px] text-muted">{deploymentStateLabel(deployment)} · {deployment.containerName || "container pending"}</p>
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
  const commandFieldsEnabled = form.driver === "command";
  const composeFieldsEnabled = form.driver === "compose";
  const sourceIntentConfigured = form.sourceRepo.trim() || form.sourceBranch.trim() || form.sourceAutoDeployConfigured;
  const portInvalid = form.port.trim() !== "" && (!Number.isInteger(Number(form.port)) || Number(form.port) <= 0);
  const healthStatusInvalid = form.healthcheckStatus.trim() !== "" && (!Number.isInteger(Number(form.healthcheckStatus)) || Number(form.healthcheckStatus) <= 0);
  const nameMissing = form.name.trim() === "";
  const sourceMissing = Boolean((form.sourceBranch.trim() || form.sourceAutoDeployConfigured) && !form.sourceRepo.trim());
  const envHelper = form.envLocked
    ? "Stored env keys are preserved by this form; edit values in Env/Secrets."
    : "Portable non-secret KEY=value metadata. Store secrets in Env/Secrets.";
  const commandHelper = commandFieldsEnabled ? "Saved for local command-driver resources." : "Deferred for this driver; not saved.";
  const composeHelper = composeFieldsEnabled ? "Saved for Compose-backed apps and services." : "Only saved for compose-driver resources.";

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
      <div className="mt-3 rounded-md border border-info/20 bg-info-soft px-3 py-2 text-xs text-foreground-secondary">
        Driver-scoped fields are saved only when their driver supports them. Domains and GitHub source are registry intent; live DNS/proxy and repository connection stay in their dedicated modules.
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Name" value={form.name} onChange={(value) => update({ name: value })} required error={nameMissing && error ? "Required" : undefined} disabled={saving} />
        <SelectField label="Type" value={form.type} values={APP_TYPES} onChange={(value) => update({ type: value })} disabled={saving} />
        <SelectField label="Preset" value={form.preset} values={APP_PRESETS} onChange={(value) => update({ preset: value })} disabled={saving} />
        <SelectField label="Driver" value={form.driver} values={APP_DRIVERS} onChange={(value) => update(appDriverPatch(value))} disabled={saving} />
        <Field label="Path" value={form.path} onChange={(value) => update({ path: value })} mono wide disabled={saving} placeholder="/path/to/app" />
        <Field label="Command" value={form.command} onChange={(value) => update({ command: value, dev: value || form.dev })} mono wide disabled={saving || !commandFieldsEnabled} helper={commandHelper} placeholder="npm run dev" />
        <Field label="Install" value={form.install} onChange={(value) => update({ install: value })} mono disabled={saving || !commandFieldsEnabled} helper={commandHelper} placeholder="npm install" />
        <Field label="Dev" value={form.dev} onChange={(value) => update({ dev: value, command: form.command || value })} mono disabled={saving || !commandFieldsEnabled} helper={commandHelper} placeholder="npm run dev" />
        <Field label="Build" value={form.build} onChange={(value) => update({ build: value })} mono disabled={saving || !commandFieldsEnabled} helper={commandHelper} placeholder="npm run build" />
        <Field label="Start" value={form.start} onChange={(value) => update({ start: value })} mono disabled={saving || !commandFieldsEnabled} helper={commandHelper} placeholder="npm run start" />
        <Field label="Port" value={form.port} onChange={(value) => update({ port: value })} type="number" error={portInvalid ? "Positive integer" : undefined} disabled={saving} placeholder="3000" />
        <Field label="Depends on" value={form.dependsOn} onChange={(value) => update({ dependsOn: value })} disabled={saving} placeholder="api, postgres" />
        <Field label="Image" value={form.image} onChange={(value) => update({ image: value })} mono disabled={saving || !composeFieldsEnabled} helper={composeHelper} placeholder="postgres:16" />
        <Field label="Compose service" value={form.composeService} onChange={(value) => update({ composeService: value })} mono disabled={saving || !composeFieldsEnabled} helper={composeHelper} placeholder="postgres" />
        <Field label="Compose file" value={form.composeFile} onChange={(value) => update({ composeFile: value })} mono wide disabled={saving || !composeFieldsEnabled} helper={composeHelper} placeholder="generated if empty" />
        <Field label="Health path" value={form.healthcheckPath} onChange={(value) => update({ healthcheckPath: value })} disabled={saving} placeholder="/" />
        <Field label="Health status" value={form.healthcheckStatus} onChange={(value) => update({ healthcheckStatus: value })} type="number" error={healthStatusInvalid ? "Positive integer" : undefined} disabled={saving} placeholder="200" />
        <Field label="Domains" value={form.domains} onChange={(value) => update({ domains: value })} disabled={saving} helper="Registry intent only; Domains module verifies DNS/proxy." placeholder="local.test" />
        <Field label="Source repo" value={form.sourceRepo} onChange={(value) => update({ sourceRepo: value })} error={sourceMissing ? "Required" : undefined} disabled={saving} helper="GitHub metadata; connect webhooks in GitHub module." placeholder="owner/repo" />
        <Field label="Source branch" value={form.sourceBranch} onChange={(value) => update({ sourceBranch: value })} disabled={saving} placeholder="main" />
        <label className={`flex items-center justify-between rounded-md bg-surface-raised px-3 py-2 ${INSET_RING} ${saving ? "opacity-60" : ""}`}>
          <span>
            <span className="block text-xs font-bold">Auto-deploy metadata</span>
            <span className="text-[11px] text-muted">Preserve source intent; webhook setup is separate</span>
          </span>
          <input checked={form.sourceAutoDeployConfigured} onChange={(event) => update({ sourceAutoDeployConfigured: event.target.checked })} disabled={saving || !sourceIntentConfigured} type="checkbox" className="h-4 w-4 accent-[var(--accent)]" />
        </label>
        <label className={`flex items-center justify-between rounded-md bg-surface-raised px-3 py-2 ${INSET_RING} ${saving ? "opacity-60" : ""}`}>
          <span>
            <span className="block text-xs font-bold">Auto-deploy enabled</span>
            <span className="text-[11px] text-muted">Saved only with auto-deploy metadata</span>
          </span>
          <input checked={form.sourceAutoDeployEnabled} onChange={(event) => update({ sourceAutoDeployEnabled: event.target.checked })} disabled={saving || !form.sourceAutoDeployConfigured} type="checkbox" className="h-4 w-4 accent-[var(--accent)]" />
        </label>
        <Field label="Auto-deploy branches" value={form.sourceAutoDeployBranches} onChange={(value) => update({ sourceAutoDeployBranches: value })} disabled={saving || !form.sourceAutoDeployConfigured} helper="Comma-separated branch intent." placeholder="main" />
        <TextAreaField label="Env metadata" value={form.env} onChange={(value) => update({ env: value })} mono disabled={saving || form.envLocked} helper={envHelper} placeholder={"NODE_ENV=development"} />
        <TextAreaField label="Volumes" value={form.volumes} onChange={(value) => update({ volumes: value })} mono disabled={saving || !composeFieldsEnabled} helper={composeHelper} placeholder={"postgres_data:/var/lib/postgresql/data"} />
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
          <input checked={form.internal} onChange={(event) => update({ internal: event.target.checked })} disabled={saving || !composeFieldsEnabled} type="checkbox" className="h-4 w-4 accent-[var(--accent)]" />
        </label>
      </div>
    </form>
  );
}

function TextAreaField({ disabled, helper, label, mono, onChange, placeholder, value }: { disabled?: boolean; helper?: string; label: string; mono?: boolean; onChange: (value: string) => void; placeholder?: string; value: string }) {
  return (
    <UiTextAreaField
      disabled={disabled}
      helper={helper}
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
  helper,
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
  helper?: string;
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
      helper={helper}
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

function RoundAction({ active, disabled, label, onClick, reason }: { active?: boolean; disabled?: boolean; label: string; onClick: () => void; reason?: string | null }) {
  return (
    <Button onClick={onClick} disabled={disabled} loading={active} loadingLabel="Working" title={reason || undefined} aria-label={reason ? `${label}: ${reason}` : label} variant={active ? "primary" : "secondary"}>
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

function TerminalSurface({ children, className, maxHeight = "max-h-[360px]", minHeight = "min-h-[220px]" }: { children: ReactNode; className?: string; maxHeight?: string; minHeight?: string }) {
  return (
    <pre className={`${className || ""} ${maxHeight} ${minHeight} overflow-auto whitespace-pre-wrap border-t border-white/5 bg-black/55 px-4 py-3 font-mono text-[11px] leading-5 text-[#d9d9d9] shadow-[rgb(0,0,0)_0px_1px_0px_inset]`}>
      {children}
    </pre>
  );
}

function MetricPill({ accent, label, value }: { accent?: boolean; label: string; value: string }) {
  return (
    <div aria-label={`${value} ${label}`} className={`rounded-full bg-surface-raised px-3 py-1.5 text-xs ${INSET_RING}`}>
      <span className={accent ? "font-bold text-accent" : "font-bold text-foreground"}>{value}</span>
      <span className="ml-1 text-muted"> {label}</span>
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
