export type OperationDeployment = {
  id: number;
  appId?: number | null;
  appName?: string | null;
  status: string;
  phase: string;
  repo?: string | null;
  branch?: string | null;
  commitSha?: string | null;
  errorMessage?: string | null;
  logsUrl?: string | null;
  logsStreamUrl?: string | null;
  finishedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

export type OperationDomain = {
  dnsStatus?: string | null;
  proxyStatus?: string | null;
  tlsStatus?: string | null;
  targetPort?: number | null;
  targetUrl?: string | null;
};

export type OperationEnvVar = {
  displayValue?: string | null;
  isSecret: boolean;
  value?: string | null;
};

export type OperationLogState = {
  bytes?: number | null;
  path?: string | null;
  truncated?: boolean | null;
};

export type OperationServerState = {
  auth?: {
    required: boolean;
    configured: boolean;
  } | null;
} | null;

export type OperationDatabase = {
  internal?: boolean;
  connectionScope?: string | null;
};

export type OperationBackupJob = {
  storageType?: string | null;
  storageStatus?: string | null;
  restoreStatus?: string | null;
  storage?: { type?: string | null; servesFiles?: boolean | null } | null;
};

export type OperationBackupRun = OperationBackupJob & {
  status: string;
  filePath?: string | null;
  fileName?: string | null;
  downloadUrl?: string | null;
  file?: {
    available?: boolean | null;
    name?: string | null;
    servesFile?: boolean | null;
    downloadUrl?: string | null;
  } | null;
};

export type OperationGithubConnection = {
  configured?: boolean | null;
  webhookSecretConfigured?: boolean | null;
  privateKeyConfigured?: boolean | null;
  repositories?: Array<{ connectedAppId?: number | null }> | null;
} | null;

export type OperationGithubDelivery = {
  deliveryId?: string | null;
  repo?: string | null;
  branch?: string | null;
  commitSha?: string | null;
  status?: string | null;
  signatureValid?: boolean | null;
  appId?: number | null;
  deploymentId?: number | null;
  message?: string | null;
  receivedAt?: string | null;
  processedAt?: string | null;
  updatedAt?: string | null;
};

export type OperationGithubRepository = {
  fullName: string;
  connectedAppId?: number | null;
  selectedBranch?: string | null;
  defaultBranch?: string | null;
};

export type OperationStateLabel = {
  label: string;
  tone: "ok" | "warn" | "error";
  detail?: string | null;
};

const ACTIVE_DEPLOYMENT_STATUSES = new Set(["queued", "preparing", "building", "starting", "healthchecking", "running"]);
const FAILED_STATUSES = new Set(["failed", "error", "invalid"]);
const IGNORED_GITHUB_DELIVERY_STATUSES = new Set(["ignored", "skipped", "duplicate", "deduped", "unmatched", "branch-ignored", "repo-ignored"]);
const FAILED_GITHUB_DELIVERY_STATUSES = new Set(["rejected", "deploy_rejected", "failed", "error", "invalid"]);
const READY_GITHUB_DELIVERY_STATUSES = new Set(["accepted", "deployed", "processed", "deployment_queued"]);
const REDACTED_MARKERS = ["redacted", "***", "•••", "[hidden]", "[secret]"];

function timestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isMissingAuthError(error: string | null | undefined): boolean {
  return Boolean(error && /admin token|requires.*auth|unauthorized/i.test(error));
}

export function productionAuthState(server: OperationServerState, errors: Array<string | null | undefined> = []): OperationStateLabel {
  const authError = errors.find(isMissingAuthError) || null;
  if (authError) return { label: "missing auth", tone: "error", detail: authError };
  if (!server?.auth) return { label: "unavailable", tone: "warn", detail: "Server status is unavailable." };
  if (!server.auth.required) return { label: "local bypass", tone: "ok" };
  return server.auth.configured
    ? { label: "ready", tone: "ok" }
    : { label: "missing auth", tone: "error", detail: "Production APIs require an admin token." };
}

export function githubConnectionState(github: OperationGithubConnection): OperationStateLabel {
  if (!github) return { label: "unavailable", tone: "warn", detail: "GitHub status is unavailable." };
  if (!github.configured) return { label: "GitHub app missing", tone: "warn", detail: "Server-side GitHub App configuration is not complete." };
  if (!github.webhookSecretConfigured) return { label: "webhook secret missing", tone: "error", detail: "Signed webhook delivery validation is required before redeploy." };
  if (!github.privateKeyConfigured) return { label: "private key missing", tone: "warn", detail: "GitHub App private key is needed for installation-backed operations." };
  if (!github.repositories?.some((repo) => repo.connectedAppId != null)) return { label: "no repo connected", tone: "warn", detail: "Connect an app to a repository and branch." };
  return { label: "ready", tone: "ok" };
}

export function githubDeliveryState(delivery: OperationGithubDelivery | null | undefined, deployment?: OperationDeployment | null): OperationStateLabel {
  if (!delivery) return { label: "no delivery", tone: "warn" };
  const status = delivery.status || "received";
  if (delivery.signatureValid === false) return { label: "invalid signature", tone: "error", detail: delivery.message || "Webhook signature failed validation." };
  if (deployment?.status === "failed") return { label: `deploy failed: ${deployment.phase || "unknown"}`, tone: "error", detail: deployment.errorMessage || delivery.message || null };
  if (deployment && isDeploymentInProgress(deployment)) return { label: `deploy in progress: ${deployment.phase || deployment.status}`, tone: "warn", detail: delivery.message || null };
  if (deployment?.status === "succeeded") return { label: `deploy succeeded #${deployment.id}`, tone: "ok", detail: delivery.message || null };
  if (FAILED_GITHUB_DELIVERY_STATUSES.has(status) || FAILED_STATUSES.has(status)) return { label: `failing event: ${status}`, tone: "error", detail: delivery.message || null };
  if (IGNORED_GITHUB_DELIVERY_STATUSES.has(status)) return { label: `ignored event: ${status}`, tone: "warn", detail: delivery.message || null };
  if (status === "deployment_active") return { label: delivery.deploymentId ? `active deploy #${delivery.deploymentId}` : "deployment already active", tone: "warn", detail: delivery.message || null };
  if (delivery.deploymentId) return { label: `deploy #${delivery.deploymentId}`, tone: "ok", detail: delivery.message || null };
  if (READY_GITHUB_DELIVERY_STATUSES.has(status)) return { label: status, tone: "ok", detail: delivery.message || null };
  return { label: status, tone: "warn", detail: delivery.message || null };
}

export function isDeploymentInProgress(deployment: OperationDeployment | null | undefined): boolean {
  return Boolean(deployment && ACTIVE_DEPLOYMENT_STATUSES.has(deployment.status));
}

export function latestSuccessfulDeployment<T extends OperationDeployment>(deployments: T[]): T | null {
  return deployments
    .filter((deployment) => deployment.status === "succeeded")
    .sort((a, b) => timestamp(b.finishedAt || b.updatedAt || b.createdAt) - timestamp(a.finishedAt || a.updatedAt || a.createdAt))[0] || null;
}

export function latestDeployment<T extends OperationDeployment>(deployments: T[]): T | null {
  return deployments
    .slice()
    .sort((a, b) => timestamp(b.updatedAt || b.finishedAt || b.createdAt) - timestamp(a.updatedAt || a.finishedAt || a.createdAt))[0] || null;
}

export function githubRepositoryBranch(repo: OperationGithubRepository): string {
  return repo.selectedBranch || repo.defaultBranch || "branch not set";
}

export function githubLatestDelivery<T extends OperationGithubDelivery>(deliveries: T[], repo?: OperationGithubRepository | string | null): T | null {
  const repoName = typeof repo === "string" ? repo : repo?.fullName;
  return deliveries
    .filter((delivery) => !repoName || delivery.repo === repoName)
    .slice()
    .sort((a, b) => timestamp(b.receivedAt || b.updatedAt || b.processedAt) - timestamp(a.receivedAt || a.updatedAt || a.processedAt))[0] || null;
}

export function githubDeliveryLogPath(delivery: OperationGithubDelivery | null | undefined, deployment?: OperationDeployment | null): string {
  const id = deployment?.id || delivery?.deploymentId;
  if (!id) return "no deployment logs";
  return `/api/deployments/${id}/logs`;
}

export function deploymentStateLabel(deployment: OperationDeployment | null | undefined): string {
  if (!deployment) return "no deployment recorded";
  if (isDeploymentInProgress(deployment)) return `deploy in progress: ${deployment.phase || deployment.status}`;
  if (deployment.status === "failed") return `failed phase: ${deployment.phase || "unknown"}`;
  if (deployment.status === "succeeded") return `latest successful deployment #${deployment.id}`;
  return `${deployment.status}${deployment.phase && deployment.phase !== deployment.status ? ` phase: ${deployment.phase}` : ""}`;
}

export function deploymentLogsLabel(deployment: OperationDeployment | null | undefined): string {
  if (!deployment) return "deployment logs unavailable";
  return deployment.logsUrl || deployment.logsStreamUrl ? "deployment logs available" : "deployment logs unavailable";
}

export function domainDnsLabel(status: string | null | undefined): string {
  if (!status) return "DNS unknown";
  if (status === "verified") return "DNS verified";
  if (status === "pending") return "DNS pending";
  if (status === "not-configured") return "DNS not configured";
  if (["failed", "error", "mismatch", "invalid"].includes(status)) return "DNS mismatch";
  return `DNS ${status}`;
}

export function domainProxyLabel(domain: OperationDomain, routeEnabled: boolean): string {
  const status = domain.proxyStatus || (routeEnabled ? "generated" : "pending");
  if (status === "generated") return "generated route";
  if (status === "not-configured") return "proxy not configured";
  if (FAILED_STATUSES.has(status)) return "proxy failed";
  return "proxy pending";
}

export function domainTlsLabel(status: string | null | undefined): string {
  if (!status) return "TLS unknown";
  if (["active", "verified"].includes(status)) return "verified TLS";
  if (["issuing", "pending"].includes(status)) return "pending TLS";
  if (status === "not-configured") return "TLS not configured";
  if (FAILED_STATUSES.has(status)) return "failed TLS";
  return `TLS ${status}`;
}

export function domainTargetLabel(domain: OperationDomain): string {
  return domain.targetUrl || (domain.targetPort ? `:${domain.targetPort}` : "target pending");
}

export function safeEnvDisplay(row: OperationEnvVar): string {
  if (!row.isSecret) return row.displayValue ?? row.value ?? "";

  const display = row.displayValue || "[redacted]";
  const normalized = display.toLowerCase();
  const isRedacted = REDACTED_MARKERS.some((marker) => normalized.includes(marker));
  return isRedacted ? display : "[redacted]";
}

export function envVisibilityLabel(row: OperationEnvVar): string {
  return row.isSecret ? "secret metadata" : "plain value";
}

export function logAvailabilityLabel(logs: OperationLogState | null | undefined): string {
  if (!logs) return "logs not loaded";
  if (logs.bytes === 0) return "logs available: empty";
  if (logs.path) return logs.truncated ? "logs available: truncated tail" : "logs available";
  return "logs unavailable";
}

export function databaseExposureLabel(database: OperationDatabase): OperationStateLabel {
  if (database.connectionScope === "internal-only" || database.internal) return { label: "internal-only", tone: "ok" };
  return { label: database.connectionScope || "public requested", tone: "error" };
}

export function backupStorageLabel(job: OperationBackupJob): OperationStateLabel {
  const type = job.storageType || job.storage?.type || "local";
  const status = job.storageStatus || "metadata-only";
  return { label: `${type} · ${status}`, tone: job.storage?.servesFiles ? "error" : "ok" };
}

export function backupRestoreLabel(job: OperationBackupJob): OperationStateLabel {
  const status = job.restoreStatus || "deferred";
  return { label: status === "deferred" ? "restore deferred" : status, tone: status === "deferred" ? "warn" : "ok" };
}

export function backupRunFileState(run: OperationBackupRun): OperationStateLabel {
  if (run.downloadUrl || run.file?.downloadUrl || run.file?.servesFile) {
    return { label: "download exposed", tone: "error" };
  }
  if (run.file?.available || run.filePath) {
    return { label: run.fileName || run.file?.name || "local file recorded", tone: "ok" };
  }
  if (run.status === "failed") return { label: "no backup file", tone: "error" };
  if (ACTIVE_DEPLOYMENT_STATUSES.has(run.status)) return { label: "backup running", tone: "warn" };
  return { label: run.storageStatus || "metadata-only", tone: "warn" };
}
