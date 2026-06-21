import Fastify from "fastify";
import "dotenv/config";
import { config as loadDotenv } from "dotenv";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync, statfsSync, unlinkSync, writeFileSync } from "node:fs";
import dns from "node:dns/promises";
import net from "node:net";
import os from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_DAEMON_PORT,
  appToPublicDto,
  appEnvVarToPublicDto,
  backupJobToPublicDto,
  backupRunToPublicDto,
  backupScheduleDue,
  buildNotificationPayload,
  databaseToPublicDto,
  defaultProductionDataDir,
  deploymentLogToPublicDto,
  deploymentToPublicDto,
  evaluateHttpHealthcheck,
  evaluateRuntimeHealth,
  formatSseEvent,
  healthcheckToPublicDto,
  loadWorkspaceConfig,
  mergeAppEnv,
  metricSampleToPublicDto,
  notificationAttemptToPublicDto,
  notificationChannelToPublicDto,
  normalizeDatabaseType,
  redactSecrets,
  runServerDoctorChecks,
  selectBackupRunsForRetention,
  upsertWorkspaceConfigEntry,
  verifyAdminToken
} from "@routely/core";
import {
  appendDeploymentLog,
  appEnvPendingState,
  createBackupRun,
  createNotificationAttempt,
  clearAppEnvPendingFlags,
  connectAppToGithubRepository,
  createDeployment,
  createDomain,
  deleteApp,
  deleteDomain,
  deleteAppEnvVar,
  deleteNotificationChannel,
  deleteProxyRouteForDomain,
  getDeploymentById,
  getBackupJobById,
  getBackupJobForDatabase,
  getBackupRunById,
  getDatabaseById,
  getDatabaseByName,
  getDomainByHostname,
  getActiveDeploymentForApp,
  getAppById,
  getGithubSourceForApp,
  getLatestSuccessfulDeploymentForApp,
  getServerFoundationState,
  getSetting,
  listHealthchecksForApp,
  listHostMetricSamples,
  listBackupJobs,
  listBackupRuns,
  listBackupRunsForJob,
  listDatabases,
  listDueBackupJobs,
  listEnabledNotificationChannelsForEvent,
  listMetricSamplesForApp,
  initializeRoutely,
  listAppEnvVars,
  listGithubConnectedAppsForPush,
  listGithubInstallations,
  listGithubRepositories,
  listGithubWebhookDeliveries,
  listDeploymentLogs,
  listDeployments,
  listDeploymentsForApp,
  listDomains,
  listDomainsForApp,
  listProxyRoutes,
  listNotificationAttempts,
  listNotificationChannels,
  listRunningRuntimeInstances,
  listSecretValuesForApp,
  listApps,
  recordMetricSample,
  markBackupRunsPruned,
  recordRuntimeStart,
  recordRuntimeStop,
  reconcileStaleRuntimeInstances,
  saveServerFoundationState,
  setSetting,
  syncWorkspaceConfig,
  recordGithubWebhookDelivery,
  updateApp,
  updateDeployment,
  updateBackupRun,
  updateNotificationAttempt,
  updateAppStatus,
  updateDatabaseStatus,
  updateDomainVerification,
  updateGithubWebhookDelivery,
  upsertHealthcheckResult,
  upsertAppEnvVar,
  upsertGithubInstallation,
  upsertGithubRepository,
  upsertProxyRoute,
  upsertBackupJob,
  upsertDatabase,
  upsertNotificationChannel,
  upsertApp
} from "@routely/db";
import {
  buildDockerfileContainerName,
  buildDockerfileImageTag,
  composeProjectName,
  dockerBuildArgs,
  dockerInspectRunningArgs,
  dockerRemoveContainerArgs,
  dockerRunArgs,
  spawnDocker,
  startCommandApp,
  startComposeService,
  stopComposeService,
  writeComposeConfig
} from "@routely/drivers";
import { createDatabaseService } from "@routely/presets";
import {
  buildTraefikDynamicConfig,
  buildTraefikRoute,
  normalizeHostname,
  validateHostname,
  verifyDnsARecord,
  wildcardInstructions
} from "@routely/proxy";
import {
  filterGithubWebhookEvent,
  getGithubAppConfig,
  githubWebhookSecret,
  validateGithubWebhookSignature
} from "@routely/github";

const port = Number(process.env.ROUTELY_DAEMON_PORT || DEFAULT_DAEMON_PORT);
const host = process.env.ROUTELY_DAEMON_HOST || "127.0.0.1";
const serverFile = fileURLToPath(import.meta.url);
const workspaceRoot = process.env.ROUTELY_WORKSPACE_ROOT || process.env.ROUTELY_REPO_ROOT || resolve(dirname(serverFile), "../../..");
loadDotenv({ path: resolve(workspaceRoot, ".env"), override: false });
const { db, databasePath } = initializeRoutely(workspaceRoot);
const startedAt = new Date().toISOString();
const LOG_TAIL_BYTES = 64 * 1024;
const lifecycleQueues = new Map();
const startupFoundationState = getServerFoundationState(db);
const startupEnvProduction = process.env.ROUTELY_SERVER_MODE === "production";

// Pick up apps declared in routely.yml on boot so the daemon and CLI agree.
try {
  const loaded = loadWorkspaceConfig(workspaceRoot);
  if (loaded) {
    syncWorkspaceConfig(db, loaded);
  }
} catch (error) {
  console.error(`Could not load routely.yml: ${error instanceof Error ? error.message : String(error)}`);
}

reconcileStaleRuntimeInstances(db);

const app = Fastify({ logger: true, bodyLimit: 2 * 1024 * 1024 });

app.removeContentTypeParser("application/json");
app.addContentTypeParser("application/json", { parseAs: "buffer" }, (request, body, done) => {
  request.rawBody = body;
  try {
    done(null, body.length > 0 ? JSON.parse(body.toString("utf8")) : {});
  } catch (error) {
    done(error);
  }
});

function serverFoundationState() {
  const state = getServerFoundationState(db);
  const envTokenConfigured = Boolean(process.env.ROUTELY_ADMIN_TOKEN);
  const processProduction = startupEnvProduction || startupFoundationState.production;

  return {
    ...state,
    mode: processProduction ? "production" : "local",
    production: processProduction,
    dataDir: state.dataDir || defaultProductionDataDir(workspaceRoot),
    auth: {
      ...state.auth,
      required: startupEnvProduction || startupFoundationState.auth.required,
      configured: state.auth.configured || envTokenConfigured,
      envTokenConfigured
    }
  };
}

function publicServerStatus() {
  const state = serverFoundationState();
  const lastDoctor = state.lastDoctor;

  return {
    mode: state.production ? "production" : "local",
    production: state.production,
    dataDir: state.dataDir,
    initializedAt: state.initializedAt,
    auth: {
      required: state.auth.required,
      configured: state.auth.configured,
      tokenCreatedAt: state.auth.tokenCreatedAt,
      tokenSource: state.auth.envTokenConfigured ? "environment" : state.auth.configured ? "settings" : null
    },
    readiness: lastDoctor
      ? {
          ok: Boolean(lastDoctor.ok),
          checkedAt: lastDoctor.checkedAt || null,
          checks: Array.isArray(lastDoctor.checks) ? lastDoctor.checks : []
        }
      : null,
    disabledProductionActions: ["rollback", "external backup storage"]
  };
}

function requestToken(request) {
  const header = request.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  const token = request.headers["x-routely-admin-token"];
  return Array.isArray(token) ? token[0] : token || null;
}

function isAuthorized(request) {
  const state = serverFoundationState();

  if (!state.production) {
    return true;
  }

  const token = requestToken(request);
  if (!token) {
    return false;
  }

  if (process.env.ROUTELY_ADMIN_TOKEN && token === process.env.ROUTELY_ADMIN_TOKEN) {
    return true;
  }

  return verifyAdminToken(token, state.auth.tokenSalt, state.auth.tokenHash);
}

app.addHook("preHandler", async (request, reply) => {
  const url = request.url.split("?")[0];
  const publicPaths = new Set(["/health", "/server/status", "/auth/status", "/github/webhook"]);

  if (publicPaths.has(url)) {
    return;
  }

  if (!isAuthorized(request)) {
    return reply.code(401).send({ error: "Routely production API requires an admin token." });
  }
});

function logDir() {
  return resolve(workspaceRoot, ".routely", "logs");
}

function safeLogName(name) {
  return name.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function logPathForApp(name) {
  return resolve(logDir(), `${safeLogName(name)}.log`);
}

function ensureLogPath(appName) {
  mkdirSync(logDir(), { recursive: true });
  return logPathForApp(appName);
}

function writeLogHeader(appName, event) {
  const logPath = ensureLogPath(appName);
  appendFileSync(logPath, `\n[${new Date().toISOString()}] ${event}\n`, "utf8");
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

function stopPid(pid) {
  try {
    if (process.platform !== "win32") {
      process.kill(-pid, "SIGTERM");
    } else {
      process.kill(pid, "SIGTERM");
    }
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Missing processes are already stopped.
    }
  }
}

function killPid(pid) {
  try {
    if (process.platform !== "win32") {
      process.kill(-pid, "SIGKILL");
    } else {
      process.kill(pid, "SIGKILL");
    }
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Missing processes are already stopped.
    }
  }
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function stopManagedPid(pid, timeoutMs = 1500) {
  if (!isPidAlive(pid)) {
    return "missing";
  }

  stopPid(pid);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (!isPidAlive(pid)) {
      return "stopped";
    }
    await sleep(100);
  }

  killPid(pid);
  return "killed";
}

function reconcileRuntimeState() {
  const stale = reconcileStaleRuntimeInstances(db, isPidAlive);
  for (const instance of stale) {
    if (instance.pid) {
      writeLogHeader(instance.app_name, `reconciled stale pid ${instance.pid}`);
    }
  }
}

function runningInstancesForApp(appId) {
  reconcileRuntimeState();
  return listRunningRuntimeInstances(db).filter((instance) => instance.app_id === appId);
}

function reconcileAppRuntimeState(appId) {
  reconcileRuntimeState();
  const record = getAppById(db, appId);
  if (!record) return null;

  if (record.driver === "command") {
    const running = listRunningRuntimeInstances(db).some((instance) => instance.app_id === appId);
    if (running && record.status !== "running") {
      updateAppStatus(db, appId, "running");
      return getAppById(db, appId);
    }
    if (!running && record.status === "running") {
      updateAppStatus(db, appId, "stopped");
      return getAppById(db, appId);
    }
  }

  return record;
}

function withAppLifecycleQueue(appId, task) {
  const previous = lifecycleQueues.get(appId) || Promise.resolve();
  const run = previous.catch(() => {}).then(task);
  const cleanup = run.finally(() => {
    if (lifecycleQueues.get(appId) === cleanup) {
      lifecycleQueues.delete(appId);
    }
  });
  lifecycleQueues.set(appId, cleanup);
  return run;
}

function findAppOrReply(request, reply) {
  const id = Number(request.params.id);
  const record = Number.isInteger(id) ? getAppById(db, id) : null;

  if (!record) {
    reply.code(404).send({ error: `App ${request.params.id} not found.` });
    return null;
  }

  return record;
}

function validateStartableApp(appRecord) {
  if (!appRecord.enabled) {
    return `${appRecord.name} is disabled.`;
  }

  if (!["command", "compose"].includes(appRecord.driver)) {
    return `Start currently supports command and Compose apps only. ${appRecord.name} uses ${appRecord.driver}.`;
  }

  if (appRecord.driver === "command" && !appRecord.command) {
    return `${appRecord.name} does not have a command configured.`;
  }

  if (appRecord.driver === "compose" && !appRecord.image && !appRecord.compose_file) {
    return `${appRecord.name} does not have a Compose image or compose_file configured.`;
  }

  return null;
}

function isPortAvailable(portNumber) {
  if (!Number.isInteger(portNumber) || portNumber <= 0) {
    return Promise.resolve(true);
  }

  return new Promise((resolvePort) => {
    const probe = net.createServer();

    probe.once("error", () => resolvePort(false));
    probe.once("listening", () => {
      probe.close(() => resolvePort(true));
    });
    probe.listen(portNumber, "127.0.0.1");
  });
}

function appPorts(appRecord) {
  return Array.isArray(appRecord.ports) && appRecord.ports.length > 0 ? appRecord.ports : appRecord.port ? [appRecord.port] : [];
}

async function startLocalApp(appRecord) {
  const validationError = validateStartableApp(appRecord);
  if (validationError) {
    return { ok: false, status: 400, error: validationError };
  }

  if (appRecord.driver === "command" && runningInstancesForApp(appRecord.id).length > 0) {
    return { ok: false, status: 409, error: `${appRecord.name} is already running.` };
  }

  if (appRecord.driver === "compose" && appRecord.status === "running") {
    return { ok: false, status: 409, error: `${appRecord.name} is already running.` };
  }

  for (const port of appPorts(appRecord)) {
    if (!(await isPortAvailable(port))) {
      return { ok: false, status: 409, error: `Port ${port} is already in use.` };
    }
  }

  updateAppStatus(db, appRecord.id, "starting");
  writeLogHeader(appRecord.name, `starting ${appRecord.driver === "compose" ? appRecord.image || appRecord.name : appRecord.command}`);

  try {
    if (appRecord.driver === "compose") {
      const logPath = ensureLogPath(appRecord.name);
      const fd = openSync(logPath, "a");
      const child = startComposeService(appRecord, workspaceRoot, { stdio: ["ignore", fd, fd] });
      await waitForChild(child);
      closeSync(fd);
      updateAppStatus(db, appRecord.id, "running");
      writeLogHeader(appRecord.name, "compose service running");
      return { ok: true, app: getAppById(db, appRecord.id), pid: null };
    }

    const logPath = ensureLogPath(appRecord.name);
    const fd = openSync(logPath, "a");
    const child = startCommandApp(appRecord, { stdio: ["ignore", fd, fd], env: runtimeEnvForApp(appRecord, "local") });
    child.unref();
    closeSync(fd);

    if (child.pid) {
      recordRuntimeStart(db, appRecord.id, child.pid);
    }
    clearAppEnvPendingFlags(db, appRecord.id, { restart: true });

    child.on("exit", (code) => {
      const status = code === 0 ? "stopped" : "crashed";
      recordRuntimeStop(db, appRecord.id, child.pid || 0, code, status);
      writeLogHeader(appRecord.name, `${status} with exit code ${code ?? "null"}`);
    });

    return { ok: true, app: getAppById(db, appRecord.id), pid: child.pid || null };
  } catch (error) {
    updateAppStatus(db, appRecord.id, "crashed");
    writeLogHeader(appRecord.name, `failed to start: ${error instanceof Error ? error.message : String(error)}`);
    return { ok: false, status: 500, error: error instanceof Error ? error.message : "Failed to start app." };
  }
}

function waitForChild(child) {
  return new Promise((resolveWait, rejectWait) => {
    child.on("error", rejectWait);
    child.on("exit", (code) => {
      if (code && code !== 0) {
        rejectWait(new Error(`command exited with code ${code}`));
      } else {
        resolveWait();
      }
    });
  });
}

function waitForLoggedChild(child, deploymentId, phase) {
  return new Promise((resolveWait, rejectWait) => {
    child.stdout?.on("data", (chunk) => {
      appendDeploymentLog(db, deploymentId, { phase, stream: "stdout", message: chunk.toString("utf8") });
    });
    child.stderr?.on("data", (chunk) => {
      appendDeploymentLog(db, deploymentId, { phase, stream: "stderr", message: chunk.toString("utf8") });
    });
    child.on("error", rejectWait);
    child.on("exit", (code) => {
      if (code && code !== 0) {
        rejectWait(new Error(`docker command exited with code ${code}`));
      } else {
        resolveWait();
      }
    });
  });
}

async function dockerAvailable() {
  try {
    await waitForChild(spawnDocker(["--version"], { cwd: workspaceRoot, stdio: ["ignore", "pipe", "pipe"] }));
    return true;
  } catch {
    return false;
  }
}

async function allocateDeploymentPort(deploymentId) {
  let candidate = 32000 + Number(deploymentId);
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (await isPortAvailable(candidate)) {
      return candidate;
    }
    candidate += 1;
  }
  throw new Error("No temporary deployment port is available in the 32000-32199 range.");
}

function deploymentUrl(deployment) {
  return deployment.host_port ? `http://127.0.0.1:${deployment.host_port}` : null;
}

function publicDomainDto(domain) {
  const proxy = proxyStateForDomain(domain);
  return {
    id: domain.id,
    appId: domain.app_id,
    appName: domain.app_name || null,
    hostname: domain.hostname,
    status: domain.status,
    dnsStatus: domain.dns_status,
    tlsStatus: domain.tls_status,
    proxyStatus: proxy.status,
    targetPort: domain.target_port == null ? null : Number(domain.target_port),
    targetDeploymentId: proxy.deployment?.id || null,
    targetUrl: proxy.targetUrl,
    verificationMessage: domain.verification_message || null,
    lastVerifiedAt: domain.last_verified_at || null,
    appType: domain.app_type || null,
    appInternal: Boolean(domain.app_internal),
    createdAt: domain.created_at,
    updatedAt: domain.updated_at
  };
}

function publicProxyRouteDto(route) {
  return {
    id: route.id,
    domainId: route.domain_id,
    appId: route.app_id,
    appName: route.app_name || null,
    deploymentId: route.deployment_id || null,
    hostname: route.hostname,
    routerName: route.router_name,
    serviceName: route.service_name,
    targetUrl: route.target_url,
    status: route.enabled ? "generated" : "pending",
    domainStatus: route.domain_status || null,
    dnsStatus: route.dns_status || null,
    tlsStatus: route.tls_status || null,
    enabled: Boolean(route.enabled),
    createdAt: route.created_at,
    updatedAt: route.updated_at
  };
}

function publicGithubInstallationDto(installation) {
  return {
    id: installation.id,
    installationId: installation.installation_id,
    accountLogin: installation.account_login,
    accountType: installation.account_type || null,
    appId: installation.app_id || null,
    targetType: installation.target_type || null,
    permissions: installation.permissions || {},
    events: installation.events || [],
    status: installation.status,
    createdAt: installation.created_at,
    updatedAt: installation.updated_at
  };
}

function publicGithubRepositoryDto(repository) {
  return {
    id: repository.id,
    installationId: repository.installation_id || null,
    repositoryId: repository.github_repository_id || null,
    fullName: repository.full_name,
    owner: repository.owner,
    name: repository.name,
    private: Boolean(repository.private),
    defaultBranch: repository.default_branch || null,
    htmlUrl: repository.html_url || null,
    connectedAppId: repository.connected_app_id || null,
    connectedAppName: repository.connected_app_name || null,
    selectedBranch: repository.selected_branch || null,
    autoDeployEnabled: Boolean(repository.auto_deploy_enabled),
    lastSyncedAt: repository.last_synced_at || null,
    createdAt: repository.created_at,
    updatedAt: repository.updated_at
  };
}

function publicGithubDeliveryDto(delivery) {
  return {
    deliveryId: delivery.delivery_id,
    event: delivery.event,
    action: delivery.action || null,
    status: delivery.status,
    signatureValid: Boolean(delivery.signature_valid),
    appId: delivery.app_id || null,
    appName: delivery.app_name || null,
    deploymentId: delivery.deployment_id || null,
    repo: delivery.repo || null,
    branch: delivery.branch || null,
    commitSha: delivery.commit_sha || null,
    message: delivery.message || null,
    receivedAt: delivery.received_at,
    processedAt: delivery.processed_at || null,
    updatedAt: delivery.updated_at
  };
}

function publicGithubStatus() {
  const config = getGithubAppConfig();
  return {
    configured: config.configured,
    appId: config.appId,
    clientId: config.clientId,
    webhookSecretConfigured: config.webhookSecretConfigured,
    privateKeyConfigured: config.privateKeyConfigured,
    installations: listGithubInstallations(db).map(publicGithubInstallationDto),
    repositories: listGithubRepositories(db).map(publicGithubRepositoryDto),
    deliveries: listGithubWebhookDeliveries(db).map(publicGithubDeliveryDto)
  };
}

function appEnvSummary(appId) {
  const env = listAppEnvVars(db, appId);
  return {
    vars: env.map(appEnvVarToPublicDto),
    pending: appEnvPendingState(db, appId)
  };
}

function runtimeEnvForApp(appRecord, scope) {
  return mergeAppEnv(appRecord.env || {}, listAppEnvVars(db, appRecord.id), { scope });
}

function secretValuesForApp(appRecord) {
  return listSecretValuesForApp(db, appRecord.id);
}

function redactForApp(appRecord, value) {
  return redactSecrets(value, secretValuesForApp(appRecord));
}

function appToPublicDtoWithoutEnv(appRecord) {
  return { ...appToPublicDto(appRecord), env: {} };
}

function appendDeploymentLogForApp(appRecord, deploymentId, input) {
  return appendDeploymentLog(db, deploymentId, {
    ...input,
    message: redactForApp(appRecord, input.message)
  });
}

function queueDeploymentForApp(appRecord, source = {}) {
  const active = getActiveDeploymentForApp(db, appRecord.id);
  if (active) {
    return { created: false, deployment: active };
  }

  const latest = getLatestSuccessfulDeploymentForApp(db, appRecord.id);
  const deployment = createDeployment(db, {
    appId: appRecord.id,
    source: {
      type: source.type || appRecord.source?.type || "local",
      repo: source.repo || appRecord.source?.repo || null,
      branch: source.branch || appRecord.source?.branch || null,
      commitSha: source.commitSha || null
    },
    previous: latest
      ? { imageTag: latest.image_tag, containerName: latest.container_name }
      : {},
    containerPort: appRecord.port || 3000
  });
  appendDeploymentLogForApp(appRecord, deployment.id, {
    phase: "queued",
    message: source.commitSha
      ? `queued GitHub deployment for ${appRecord.name} at ${source.commitSha}`
      : `queued deployment for ${appRecord.name}`
  });
  void runDockerfileDeployment(appRecord, deployment.id);
  return { created: true, deployment };
}

function serverPublicIp() {
  return process.env.ROUTELY_SERVER_PUBLIC_IP || getSetting(db, "server.public_ip") || null;
}

function proxyStateForDomain(domain) {
  const appRecord = getAppById(db, domain.app_id);
  if (!appRecord || appRecord.internal || appRecord.type === "database") {
    return { status: "failed", deployment: null, route: null, targetUrl: null };
  }

  const deployment = getLatestSuccessfulDeploymentForApp(db, domain.app_id);
  const route = buildTraefikRoute({ domain, deployment, app: appRecord });
  if (!route) {
    return { status: "pending", deployment: deployment || null, route: null, targetUrl: null };
  }

  return {
    status: "generated",
    deployment,
    route,
    targetUrl: route.targetUrl || route.service?.loadBalancer?.servers?.[0]?.url || null
  };
}

function materializeProxyRouteForDomain(domain) {
  const proxy = proxyStateForDomain(domain);

  if (proxy.status !== "generated" || !proxy.route || !proxy.deployment) {
    deleteProxyRouteForDomain(db, domain.hostname);
    return null;
  }

  return upsertProxyRoute(db, {
    domainId: domain.id,
    appId: domain.app_id,
    deploymentId: proxy.deployment.id,
    routerName: proxy.route.routerName,
    serviceName: proxy.route.serviceName,
    targetUrl: proxy.targetUrl,
    config: proxy.route,
    enabled: true
  });
}

function materializeProxyRoutesForApp(appId) {
  return listDomainsForApp(db, appId).map(materializeProxyRouteForDomain).filter(Boolean);
}

function currentTraefikConfig() {
  const routes = listDomains(db).map((domain) => proxyStateForDomain(domain).route).filter(Boolean);
  return buildTraefikDynamicConfig(routes);
}

function createDomainForPayload(payload = {}) {
  const appId = Number(payload.appId);
  const appName = payload.appName ? String(payload.appName) : null;
  const appRecord = Number.isInteger(appId) ? getAppById(db, appId) : appName ? listApps(db).find((item) => item.name === appName) : null;
  const hostname = validateHostname(payload.hostname);

  if (!appRecord) {
    return { ok: false, status: 404, error: "Target app was not found." };
  }
  if (appRecord.internal || appRecord.type === "database") {
    return { ok: false, status: 400, error: `${appRecord.name} is internal and cannot be exposed through the public proxy.` };
  }
  if (getDomainByHostname(db, hostname)) {
    return { ok: false, status: 409, error: `${hostname} is already registered.` };
  }

  const latest = getLatestSuccessfulDeploymentForApp(db, appRecord.id);
  const publicIp = serverPublicIp();
  const hasGeneratedRoute = Boolean(latest?.host_port);
  const status = publicIp ? hasGeneratedRoute ? "generated" : "pending" : "not-configured";
  const dnsStatus = publicIp ? "pending" : "not-configured";
  const tlsStatus = publicIp ? "pending" : "not-configured";
  const domain = createDomain(db, {
    appId: appRecord.id,
    hostname,
    status,
    dnsStatus,
    tlsStatus,
    targetPort: latest?.host_port || null,
    verificationMessage: publicIp
      ? `Create an A record for ${hostname} pointing to ${publicIp}.${hasGeneratedRoute ? " Proxy config can target the latest successful deployment; DNS and TLS are still pending." : " Waiting for a successful deployment before generating a proxy route."}`
      : `Set ROUTELY_SERVER_PUBLIC_IP before verifying ${hostname}. DNS, proxy reachability, and TLS remain not configured.`
  });
  materializeProxyRouteForDomain(domain);
  return { ok: true, domain: publicDomainDto(getDomainByHostname(db, hostname)) };
}

async function runHealthcheck(appRecord, deployment) {
  if (!deployment.container_name) {
    throw new Error("Deployment container name is missing.");
  }

  const healthPath = appRecord.healthcheck?.path;
  if (healthPath && deployment.host_port) {
    const expected = Number(appRecord.healthcheck?.expected_status || 200);
    const url = `${deploymentUrl(deployment)}${healthPath.startsWith("/") ? healthPath : `/${healthPath}`}`;
    let lastError = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        const response = await fetch(url);
        appendDeploymentLogForApp(appRecord, deployment.id, { phase: "healthchecking", message: `healthcheck ${url} -> ${response.status}` });
        if (response.status === expected) {
          return;
        }
        lastError = new Error(`healthcheck returned ${response.status}, expected ${expected}`);
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        appendDeploymentLogForApp(appRecord, deployment.id, { phase: "healthchecking", stream: "stderr", message: `healthcheck retry ${attempt + 1}/8 failed: ${message}` });
      }
      await sleep(750);
    }
    throw lastError || new Error("Healthcheck did not pass.");
  }

  const inspect = spawnDocker(dockerInspectRunningArgs(deployment.container_name), { cwd: workspaceRoot, stdio: ["ignore", "pipe", "pipe"] });
  await waitForLoggedChild(inspect, deployment.id, "healthchecking");
}

async function removeContainerIfPresent(containerName, deploymentId, phase = "starting") {
  if (!containerName) return;
  try {
    await waitForLoggedChild(spawnDocker(dockerRemoveContainerArgs(containerName), { cwd: workspaceRoot, stdio: ["ignore", "pipe", "pipe"] }), deploymentId, phase);
  } catch {
    // docker rm returns non-zero when the container is absent; absence is fine here.
  }
}

async function markDeploymentFailed(appRecord, deploymentId, phase, error, containerName) {
  const message = error instanceof Error ? error.message : String(error);
  appendDeploymentLogForApp(appRecord, deploymentId, { phase, stream: "stderr", message });
  upsertHealthcheckResult(db, {
    appId: appRecord.id,
    deploymentId,
    target: containerName ? "container" : "runtime",
    path: appRecord.healthcheck?.path || null,
    expectedStatus: appRecord.healthcheck?.expected_status || 200,
    status: "unhealthy",
    message: `${phase} failed: ${message}`
  });
  updateDeployment(db, deploymentId, {
    status: "failed",
    phase,
    errorMessage: message,
    finishedAt: new Date().toISOString()
  });
  void notifyEvent("deploy_failed", {
    appName: appRecord.name,
    deploymentId,
    errorMessage: message,
    resourceType: "deployment",
    resourceId: deploymentId
  });
  await removeContainerIfPresent(containerName, deploymentId, phase);
}

async function runDockerfileDeployment(appRecord, deploymentId) {
  let deployment = getDeploymentById(db, deploymentId);
  const context = appRecord.path;
  const dockerfile = context ? resolve(context, "Dockerfile") : null;
  let containerName = null;

  try {
    updateDeployment(db, deploymentId, { status: "preparing", phase: "preparing" });
    appendDeploymentLogForApp(appRecord, deploymentId, { phase: "preparing", message: `preparing Dockerfile deployment for ${appRecord.name}` });

    if (appRecord.driver !== "dockerfile") {
      throw new Error(`${appRecord.name} uses driver ${appRecord.driver}. Checkpoint 5 deploy supports dockerfile apps only.`);
    }
    if (!context) {
      throw new Error(`${appRecord.name} does not have a source path configured.`);
    }
    if (!existsSync(dockerfile)) {
      throw new Error(`Missing Dockerfile at ${dockerfile}.`);
    }
    if (!(await dockerAvailable())) {
      throw new Error("Docker is not available to the Routely daemon.");
    }

    const hostPort = await allocateDeploymentPort(deploymentId);
    const containerPort = appRecord.port || 3000;
    const imageTag = buildDockerfileImageTag(appRecord.name, deploymentId);
    containerName = buildDockerfileContainerName(appRecord.name, deploymentId);
    deployment = updateDeployment(db, deploymentId, { imageTag, containerName, hostPort, containerPort });

    updateDeployment(db, deploymentId, { status: "building", phase: "building" });
    appendDeploymentLogForApp(appRecord, deploymentId, { phase: "building", message: `docker ${dockerBuildArgs({ context, dockerfile, imageTag }).join(" ")}` });
    await waitForLoggedChild(spawnDocker(dockerBuildArgs({ context, dockerfile, imageTag }), { cwd: context }), deploymentId, "building");

    updateDeployment(db, deploymentId, { status: "starting", phase: "starting" });
    await removeContainerIfPresent(containerName, deploymentId, "starting");
    appendDeploymentLogForApp(appRecord, deploymentId, { phase: "starting", message: `starting ${containerName} on temporary port ${hostPort}` });
    await waitForLoggedChild(
      spawnDocker(dockerRunArgs({ containerName, imageTag, hostPort, containerPort, env: runtimeEnvForApp(appRecord, "production") }), { cwd: context }),
      deploymentId,
      "starting"
    );

    deployment = getDeploymentById(db, deploymentId);
    updateDeployment(db, deploymentId, { status: "healthchecking", phase: "healthchecking" });
    appendDeploymentLogForApp(appRecord, deploymentId, { phase: "healthchecking", message: appRecord.healthcheck?.path ? "running HTTP healthcheck" : "checking container state" });
    await runHealthcheck(appRecord, deployment);

    updateDeployment(db, deploymentId, {
      status: "succeeded",
      phase: "succeeded",
      errorMessage: null,
      finishedAt: new Date().toISOString()
    });
    updateAppStatus(db, appRecord.id, "running");
    await evaluateAppHealth(appRecord);
    clearAppEnvPendingFlags(db, appRecord.id, { redeploy: true });
    const routes = materializeProxyRoutesForApp(appRecord.id);
    if (routes.length > 0) {
      appendDeploymentLogForApp(appRecord, deploymentId, { phase: "succeeded", message: `refreshed ${routes.length} proxy route(s)` });
    }
    appendDeploymentLogForApp(appRecord, deploymentId, { phase: "succeeded", message: `deployment succeeded at ${deploymentUrl(getDeploymentById(db, deploymentId))}` });
    void notifyEvent("deploy_succeeded", {
      appName: appRecord.name,
      deploymentId,
      resourceType: "deployment",
      resourceId: deploymentId
    });
  } catch (error) {
    await markDeploymentFailed(appRecord, deploymentId, getDeploymentById(db, deploymentId)?.phase || "failed", error, containerName);
  }
}

async function stopLocalApp(appRecord, reason = "stop") {
  if (appRecord.driver === "compose") {
    if (appRecord.status !== "running") {
      updateAppStatus(db, appRecord.id, "stopped");
      writeLogHeader(appRecord.name, `compose service already stopped for ${reason}`);
      return { ok: true, app: getAppById(db, appRecord.id), stopped: [] };
    }

    try {
      writeLogHeader(appRecord.name, `stopping compose service for ${reason}`);
      const logPath = ensureLogPath(appRecord.name);
      const fd = openSync(logPath, "a");
      const child = stopComposeService(appRecord, workspaceRoot, { stdio: ["ignore", fd, fd] });
      await waitForChild(child);
      closeSync(fd);
      updateAppStatus(db, appRecord.id, "stopped");
      return { ok: true, app: getAppById(db, appRecord.id), stopped: [] };
    } catch (error) {
      writeLogHeader(appRecord.name, `failed to stop compose service: ${error instanceof Error ? error.message : String(error)}`);
      return { ok: false, status: 500, error: error instanceof Error ? error.message : "Failed to stop Compose service." };
    }
  }

  const instances = runningInstancesForApp(appRecord.id);

  if (instances.length === 0) {
    updateAppStatus(db, appRecord.id, "stopped");
    writeLogHeader(appRecord.name, `no running managed process found for ${reason}`);
    return { ok: true, app: getAppById(db, appRecord.id), stopped: [] };
  }

  const stopped = [];
  for (const instance of instances) {
    if (!instance.pid) {
      continue;
    }
    const result = await stopManagedPid(instance.pid);
    recordRuntimeStop(db, instance.app_id, instance.pid, null, "stopped");
    writeLogHeader(instance.app_name, `${result} pid ${instance.pid}${reason === "restart" ? " for restart" : ""}`);
    stopped.push({ pid: instance.pid, result });
  }

  return { ok: true, app: getAppById(db, appRecord.id), stopped };
}

function readRecentLogs(appRecord) {
  const logPath = logPathForApp(appRecord.name);

  if (!existsSync(logPath)) {
    return { path: logPath, content: "", bytes: 0, truncated: false };
  }

  const stats = statSync(logPath);
  const start = Math.max(0, stats.size - LOG_TAIL_BYTES);
  const content = redactForApp(appRecord, readFileSync(logPath).subarray(start).toString("utf8"));

  return { path: logPath, content, bytes: stats.size, truncated: start > 0 };
}

function readDeploymentLogsRedacted(appRecord, deploymentId, options = {}) {
  return listDeploymentLogs(db, deploymentId, options).map((log) =>
    deploymentLogToPublicDto({ ...log, message: redactForApp(appRecord, log.message) })
  );
}

async function captureChild(child) {
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });
  child.stderr?.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  await new Promise((resolveWait, rejectWait) => {
    child.on("error", rejectWait);
    child.on("exit", (code) => {
      if (code && code !== 0) {
        rejectWait(new Error(stderr.trim() || stdout.trim() || `command exited with code ${code}`));
      } else {
        resolveWait();
      }
    });
  });

  return { stdout, stderr };
}

async function inspectContainerRunning(containerName) {
  if (!containerName) return { running: false, message: "no deployment container" };
  try {
    const result = await captureChild(spawnDocker(dockerInspectRunningArgs(containerName), { cwd: workspaceRoot, stdio: ["ignore", "pipe", "pipe"] }));
    const running = result.stdout.trim() === "true";
    return { running, message: running ? `${containerName} is running` : `${containerName} is not running` };
  } catch (error) {
    return { running: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function evaluateAppHealth(appRecord) {
  reconcileRuntimeState();
  const latestDeployment = getLatestSuccessfulDeploymentForApp(db, appRecord.id);
  const healthPath = appRecord.healthcheck?.path || null;
  const expectedStatus = Number(appRecord.healthcheck?.expected_status || 200);
  const target = latestDeployment?.container_name ? "container" : "runtime";
  let result;

  if (healthPath && (latestDeployment?.host_port || appRecord.port)) {
    const base = latestDeployment?.host_port ? deploymentUrl(latestDeployment) : `http://127.0.0.1:${appRecord.port}`;
    const url = `${base}${healthPath.startsWith("/") ? healthPath : `/${healthPath}`}`;
    const started = Date.now();
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
      result = evaluateHttpHealthcheck({ expectedStatus, httpStatus: response.status, responseTimeMs: Date.now() - started });
    } catch (error) {
      result = evaluateHttpHealthcheck({ expectedStatus, responseTimeMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) });
    }
    return upsertHealthcheckResult(db, {
      appId: appRecord.id,
      deploymentId: latestDeployment?.id || null,
      target,
      path: healthPath,
      expectedStatus,
      status: result.status,
      httpStatus: result.httpStatus,
      responseTimeMs: result.responseTimeMs,
      message: result.message
    });
  }

  if (latestDeployment?.container_name) {
    const inspected = await inspectContainerRunning(latestDeployment.container_name);
    result = evaluateRuntimeHealth(inspected);
    return upsertHealthcheckResult(db, {
      appId: appRecord.id,
      deploymentId: latestDeployment.id,
      target,
      expectedStatus,
      status: result.status,
      message: result.message
    });
  }

  const running = appRecord.driver === "compose" ? appRecord.status === "running" : runningInstancesForApp(appRecord.id).length > 0;
  result = evaluateRuntimeHealth({ running, message: running ? `${appRecord.name} is running` : `${appRecord.name} has no active runtime` });
  return upsertHealthcheckResult(db, {
    appId: appRecord.id,
    target,
    path: healthPath,
    expectedStatus,
    status: result.status,
    message: result.message
  });
}

function hostMetrics() {
  const memoryLimitBytes = os.totalmem();
  const memoryBytes = memoryLimitBytes - os.freemem();
  let disk = { used: null, total: null };
  try {
    const stats = statfsSync(workspaceRoot);
    const total = Number(stats.blocks) * Number(stats.bsize);
    const free = Number(stats.bavail) * Number(stats.bsize);
    disk = { used: total - free, total };
  } catch {
    disk = { used: null, total: null };
  }
  const interfaces = os.networkInterfaces();
  const networkCount = Object.values(interfaces).flat().filter(Boolean).length;
  return {
    scope: "host",
    cpuPercent: Math.round(os.loadavg()[0] * 100) / Math.max(1, os.cpus().length),
    memoryBytes,
    memoryLimitBytes,
    diskUsedBytes: disk.used,
    diskTotalBytes: disk.total,
    networkRxBytes: null,
    networkTxBytes: null,
    message: `host sample from ${os.hostname()} with ${networkCount} network address(es)`
  };
}

function parseDockerSize(value) {
  const match = String(value || "").trim().match(/^([0-9.]+)\s*([KMGT]?i?B)?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = (match[2] || "B").toLowerCase();
  const multipliers = { b: 1, kb: 1000, kib: 1024, mb: 1000 ** 2, mib: 1024 ** 2, gb: 1000 ** 3, gib: 1024 ** 3, tb: 1000 ** 4, tib: 1024 ** 4 };
  return Math.round(amount * (multipliers[unit] || 1));
}

async function dockerContainerMetric(appRecord, deployment) {
  if (!deployment?.container_name) return null;
  try {
    const result = await captureChild(spawnDocker(["stats", "--no-stream", "--format", "{{json .}}", deployment.container_name], { cwd: workspaceRoot, stdio: ["ignore", "pipe", "pipe"] }));
    const stats = JSON.parse(result.stdout.trim().split("\n").filter(Boolean).at(-1) || "{}");
    const [memUsage, memLimit] = String(stats.MemUsage || "").split("/").map((item) => parseDockerSize(item));
    const [netRx, netTx] = String(stats.NetIO || "").split("/").map((item) => parseDockerSize(item));
    return {
      appId: appRecord.id,
      deploymentId: deployment.id,
      scope: "container",
      cpuPercent: Number(String(stats.CPUPerc || "").replace("%", "")) || null,
      memoryBytes: memUsage,
      memoryLimitBytes: memLimit,
      networkRxBytes: netRx,
      networkTxBytes: netTx,
      message: `docker stats for ${deployment.container_name}`
    };
  } catch (error) {
    return {
      appId: appRecord.id,
      deploymentId: deployment.id,
      scope: "container",
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

async function collectMetricsForApp(appRecord) {
  const host = recordMetricSample(db, hostMetrics());
  const latestDeployment = getLatestSuccessfulDeploymentForApp(db, appRecord.id);
  const container = await dockerContainerMetric(appRecord, latestDeployment);
  const rows = [host];
  if (container) rows.push(recordMetricSample(db, container));
  return rows;
}

function backupRootDir(job = null) {
  return job?.local_dir || resolve(serverFoundationState().dataDir || resolve(workspaceRoot, ".routely"), "backups");
}

function backupFileName(databaseRecord, suffix) {
  return `${safeLogName(databaseRecord.name)}-${new Date().toISOString().replace(/[:.]/g, "-")}.${suffix}`;
}

function databaseRecordToApp(databaseRecord) {
  if (databaseRecord.app_id) {
    return getAppById(db, databaseRecord.app_id);
  }
  return getAppByName(db, databaseRecord.name);
}

function publicBackupPayload() {
  return {
    jobs: listBackupJobs(db).map(backupJobToPublicDto),
    runs: listBackupRuns(db).map(backupRunToPublicDto)
  };
}

function publicNotificationsPayload() {
  return {
    channels: listNotificationChannels(db).map(notificationChannelToPublicDto),
    attempts: listNotificationAttempts(db).map(notificationAttemptToPublicDto)
  };
}

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const parts = address.split(".").map(Number);
    return parts[0] === 10
      || parts[0] === 127
      || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
      || (parts[0] === 192 && parts[1] === 168)
      || (parts[0] === 169 && parts[1] === 254)
      || parts[0] === 0;
  }
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
  }
  return true;
}

async function safeOutboundUrl(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl || ""));
  } catch {
    throw new Error("Notification URL must be a valid http or https URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Notification URL must use http or https.");
  }
  if (url.username || url.password) {
    throw new Error("Notification URL credentials are not allowed.");
  }
  const records = await dns.lookup(url.hostname, { all: true, verbatim: false });
  if (records.length === 0 || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error("Notification URL must not resolve to a private, loopback, or link-local address.");
  }
  return url.toString();
}

async function validateNotificationChannelTarget(input = {}) {
  const type = String(input.type || input.channelType || "webhook").trim().toLowerCase();
  const config = input.config && typeof input.config === "object" && !Array.isArray(input.config) ? input.config : {};
  const url = input.url ?? input.webhookUrl ?? config.url;

  if (type === "webhook" || type === "discord") {
    await safeOutboundUrl(url);
  }
}

function notificationTarget(channel) {
  if (channel.type === "telegram") {
    return `https://api.telegram.org/bot[redacted]/sendMessage`;
  }
  return notificationChannelToPublicDto(channel).target;
}

async function deliverNotification(channel, event, context = {}) {
  const target = notificationTarget(channel);
  const attempt = createNotificationAttempt(db, {
    channelId: channel.id,
    event,
    target,
    resourceType: context.resourceType || null,
    resourceId: context.resourceId || null,
    message: `queued ${event}`
  });

  try {
    const url = channel.type === "telegram"
      ? await safeOutboundUrl(`https://api.telegram.org/bot${channel.config.botToken}/sendMessage`)
      : await safeOutboundUrl(channel.config.url);
    const payload = buildNotificationPayload(channel, event, context);
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "routely-notifications/0.1" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    });
    const text = await response.text().catch(() => "");
    return updateNotificationAttempt(db, attempt.id, {
      status: response.ok ? "succeeded" : "failed",
      httpStatus: response.status,
      message: response.ok ? "notification delivered" : (text.slice(0, 240) || `HTTP ${response.status}`),
      finishedAt: new Date().toISOString()
    });
  } catch (error) {
    return updateNotificationAttempt(db, attempt.id, {
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
      finishedAt: new Date().toISOString()
    });
  }
}

async function notifyEvent(event, context = {}) {
  const channels = listEnabledNotificationChannelsForEvent(db, event);
  const attempts = [];
  for (const channel of channels) {
    attempts.push(await deliverNotification(channel, event, context));
  }
  return attempts.filter(Boolean);
}

function buildProductionDatabaseService(input) {
  const type = normalizeDatabaseType(input.type || input.preset);
  const name = String(input.name || type).trim();
  const service = createDatabaseService(type, { name });
  service.internal = true;
  service.enabled = input.enabled == null ? true : Boolean(input.enabled);
  service.status = "stopped";

  if (input.env && typeof input.env === "object" && !Array.isArray(input.env)) {
    service.env = { ...(service.env || {}), ...input.env };
  }
  if (input.image) service.image = String(input.image);
  if (input.port != null && input.port !== "") service.port = Number(input.port);

  return service;
}

async function startDatabaseRecord(databaseRecord) {
  const appRecord = databaseRecordToApp(databaseRecord);
  if (!appRecord) {
    throw new Error(`Database ${databaseRecord.name} has no backing Compose app.`);
  }
  if (appRecord.driver !== "compose") {
    throw new Error(`Database ${databaseRecord.name} is not backed by the Compose driver.`);
  }
  const logPath = ensureLogPath(appRecord.name);
  const fd = openSync(logPath, "a");
  try {
    writeLogHeader(appRecord.name, "starting production database service");
    await waitForChild(startComposeService(appRecord, workspaceRoot, { stdio: ["ignore", fd, fd] }));
    updateAppStatus(db, appRecord.id, "running");
    return updateDatabaseStatus(db, databaseRecord.id, "running");
  } finally {
    closeSync(fd);
  }
}

async function stopDatabaseRecord(databaseRecord) {
  const appRecord = databaseRecordToApp(databaseRecord);
  if (!appRecord) {
    throw new Error(`Database ${databaseRecord.name} has no backing Compose app.`);
  }
  const logPath = ensureLogPath(appRecord.name);
  const fd = openSync(logPath, "a");
  try {
    writeLogHeader(appRecord.name, "stopping production database service");
    await waitForChild(stopComposeService(appRecord, workspaceRoot, { stdio: ["ignore", fd, fd] }));
    updateAppStatus(db, appRecord.id, "stopped");
    return updateDatabaseStatus(db, databaseRecord.id, "stopped");
  } finally {
    closeSync(fd);
  }
}

function backupCommandForDatabase(databaseRecord) {
  if (databaseRecord.type === "postgres") return { args: ["exec", "-T", databaseRecord.compose_service, "pg_dumpall", "-U", "postgres"], suffix: "sql" };
  if (databaseRecord.type === "mysql") return { args: ["exec", "-T", databaseRecord.compose_service, "mysqldump", "--all-databases", "-uroot"], suffix: "sql" };
  if (databaseRecord.type === "mariadb") return { args: ["exec", "-T", databaseRecord.compose_service, "mariadb-dump", "--all-databases", "-uroot"], suffix: "sql" };
  if (databaseRecord.type === "mongodb") return { args: ["exec", "-T", databaseRecord.compose_service, "mongodump", "--archive"], suffix: "archive" };
  if (databaseRecord.type === "redis") return { args: ["exec", "-T", databaseRecord.compose_service, "redis-cli", "BGSAVE"], suffix: "txt" };
  throw new Error(`Backup is not implemented for ${databaseRecord.type}.`);
}

async function runBackupJob(job, trigger = "manual") {
  const databaseRecord = getDatabaseById(db, job.database_id);
  if (!databaseRecord) throw new Error(`Database ${job.database_id} not found.`);
  const appRecord = databaseRecordToApp(databaseRecord);
  if (!appRecord) throw new Error(`Database ${databaseRecord.name} has no backing Compose app.`);
  const command = backupCommandForDatabase(databaseRecord);
  const run = createBackupRun(db, { backupJobId: job.id, trigger, message: `queued ${trigger} backup` });
  const directory = backupRootDir(job);
  mkdirSync(directory, { recursive: true });
  const filePath = resolve(directory, backupFileName(databaseRecord, command.suffix));

  try {
    updateBackupRun(db, run.id, { status: "running", message: `running ${databaseRecord.type} backup` });
    const composeFile = writeComposeConfig(appRecord, workspaceRoot);
    const args = ["compose", "-p", composeProjectName(workspaceRoot), "-f", composeFile, ...command.args];
    const result = await captureChild(spawnDocker(args, { cwd: workspaceRoot, stdio: ["ignore", "pipe", "pipe"] }));
    writeFileSync(filePath, result.stdout || result.stderr || `Backup command completed for ${databaseRecord.name}.\n`, "utf8");
    const size = statSync(filePath).size;
    const completed = updateBackupRun(db, run.id, {
      status: "succeeded",
      filePath,
      sizeBytes: size,
      message: `${databaseRecord.type} backup completed (${size} bytes)` ,
      finishedAt: new Date().toISOString()
    });
    pruneBackupRuns(job);
    return completed;
  } catch (error) {
    try {
      if (existsSync(filePath)) unlinkSync(filePath);
    } catch {}
    const failed = updateBackupRun(db, run.id, {
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
      finishedAt: new Date().toISOString()
    });
    void notifyEvent("backup_failed", {
      databaseName: databaseRecord.name,
      backupRunId: failed.id,
      errorMessage: failed.message,
      resourceType: "backup_run",
      resourceId: failed.id
    });
    return failed;
  }
}

function pruneBackupRuns(job) {
  const stale = selectBackupRunsForRetention(listBackupRunsForJob(db, job.id, { limit: 500 }), job.retention_days);
  for (const run of stale) {
    try {
      if (run.file_path && existsSync(run.file_path)) unlinkSync(run.file_path);
    } catch {}
  }
  markBackupRunsPruned(db, stale.map((run) => run.id));
  return stale;
}

app.get("/health", async (request) => {
  const server = publicServerStatus();
  return {
    ok: true,
    service: "routely-daemon",
    version: "0.1.0",
    workspace: workspaceRoot,
    database: databasePath,
    startedAt,
    server,
    apps: server.production && !isAuthorized(request) ? [] : listApps(db).map(appToPublicDto)
  };
});

app.get("/server/status", async () => {
  return { server: publicServerStatus() };
});

app.get("/auth/status", async () => {
  const server = publicServerStatus();
  return { auth: server.auth, mode: server.mode };
});

app.get("/server/doctor", async () => {
  const state = serverFoundationState();
  const doctor = await runServerDoctorChecks({
    workspaceRoot,
    dataDir: state.dataDir,
    ports: [80, 443, Number(process.env.ROUTELY_DASHBOARD_PORT || 3030)],
    createDataDir: false
  });

  saveServerFoundationState(db, { lastDoctor: doctor });
  return { doctor, server: publicServerStatus() };
});

app.get("/domains", async () => {
  return {
    rootDomain: getSetting(db, "domain.root"),
    serverPublicIp: serverPublicIp(),
    domains: listDomains(db).map(publicDomainDto)
  };
});

app.post("/domains/root", async (request, reply) => {
  try {
    const domain = validateHostname(request.body?.domain, { allowWildcard: false });
    setSetting(db, "domain.root", domain);
    return reply.code(200).send({ rootDomain: domain, instructions: wildcardInstructions(domain, serverPublicIp()) });
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid root domain." });
  }
});

app.post("/domains", async (request, reply) => {
  try {
    const result = createDomainForPayload(request.body || {});
    if (!result.ok) {
      return reply.code(result.status).send({ error: result.error });
    }
    return reply.code(201).send({ domain: result.domain });
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid domain payload." });
  }
});

app.get("/apps/:id/domains", async (request, reply) => {
  const record = findAppOrReply(request, reply);
  if (!record) return;
  return { app: appToPublicDto(record), domains: listDomainsForApp(db, record.id).map(publicDomainDto) };
});

app.post("/apps/:id/domains", async (request, reply) => {
  const record = findAppOrReply(request, reply);
  if (!record) return;
  try {
    const result = createDomainForPayload({ ...(request.body || {}), appId: record.id });
    if (!result.ok) {
      return reply.code(result.status).send({ error: result.error });
    }
    return reply.code(201).send({ domain: result.domain });
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid domain payload." });
  }
});

app.post("/domains/:hostname/verify", async (request, reply) => {
  const hostname = normalizeHostname(request.params.hostname);
  const domain = getDomainByHostname(db, hostname);
  if (!domain) {
    return reply.code(404).send({ error: `Domain ${hostname} not found.` });
  }

  const result = await verifyDnsARecord(domain.hostname, serverPublicIp());
  const latest = getLatestSuccessfulDeploymentForApp(db, domain.app_id);
  const status = result.status === "not-configured"
    ? "not-configured"
    : result.ok && latest?.host_port
      ? "generated"
      : result.ok
        ? "verified"
        : "failed";
  const tlsStatus = result.status === "not-configured" ? "not-configured" : result.ok && latest?.host_port ? "issuing" : result.ok ? "pending" : "failed";
  const verificationMessage = result.status === "not-configured"
    ? result.message
    : latest?.host_port
      ? `${result.message} Proxy route config targets the latest successful deployment on port ${latest.host_port}; TLS remains ${tlsStatus}.`
      : `${result.message} Waiting for a successful deployment before generating the route.`;
  const updated = updateDomainVerification(db, domain.hostname, {
    status,
    dnsStatus: result.status,
    tlsStatus,
    targetPort: latest?.host_port || null,
    verificationMessage
  });
  materializeProxyRouteForDomain(updated);

  return { domain: publicDomainDto(getDomainByHostname(db, domain.hostname)), verification: result };
});

app.delete("/domains/:hostname", async (request, reply) => {
  const hostname = normalizeHostname(request.params.hostname);
  if (!getDomainByHostname(db, hostname)) {
    return reply.code(404).send({ error: `Domain ${hostname} not found.` });
  }
  deleteProxyRouteForDomain(db, hostname);
  deleteDomain(db, hostname);
  return { ok: true, hostname };
});

app.get("/proxy/routes", async () => {
  return { routes: listProxyRoutes(db).map(publicProxyRouteDto), config: currentTraefikConfig() };
});

app.get("/proxy/config", async () => {
  return currentTraefikConfig();
});

app.get("/apps", async () => {
  return { apps: listApps(db).map(appToPublicDto) };
});

app.get("/apps/:id", async (request, reply) => {
  const record = findAppOrReply(request, reply);
  if (!record) return;

  return { app: appToPublicDto(record) };
});

app.post("/apps/:id/start", async (request, reply) => {
  const id = Number(request.params.id);

  const result = await withAppLifecycleQueue(id, async () => {
    const record = findAppOrReply(request, reply);
    if (!record) return null;
    return startLocalApp(reconcileAppRuntimeState(record.id) || record);
  });
  if (!result) return;
  if (!result.ok) {
    return reply.code(result.status).send({ error: result.error });
  }

  const reconciled = reconcileAppRuntimeState(result.app.id) || result.app;
  return reply.code(200).send({ app: appToPublicDto(reconciled), pid: result.pid });
});

app.post("/apps/:id/stop", async (request, reply) => {
  const id = Number(request.params.id);

  const result = await withAppLifecycleQueue(id, async () => {
    const record = findAppOrReply(request, reply);
    if (!record) return null;
    return stopLocalApp(reconcileAppRuntimeState(record.id) || record);
  });
  if (!result) return;
  if (!result.ok) {
    return reply.code(result.status).send({ error: result.error });
  }
  const reconciled = reconcileAppRuntimeState(result.app.id) || result.app;
  return reply.code(200).send({ app: appToPublicDto(reconciled), stopped: result.stopped });
});

app.post("/apps/:id/restart", async (request, reply) => {
  const id = Number(request.params.id);

  const result = await withAppLifecycleQueue(id, async () => {
    const record = findAppOrReply(request, reply);
    if (!record) return null;
    const current = reconcileAppRuntimeState(record.id) || record;
    const validationError = validateStartableApp(current);
    if (validationError) {
      return { ok: false, status: 400, error: validationError };
    }

    const stopResult = await stopLocalApp(current, "restart");
    if (!stopResult.ok) {
      return stopResult;
    }
    return startLocalApp(getAppById(db, current.id));
  });

  if (!result) return;
  if (!result.ok) {
    return reply.code(result.status).send({ error: result.error });
  }

  const reconciled = reconcileAppRuntimeState(result.app.id) || result.app;
  return reply.code(200).send({ app: appToPublicDto(reconciled), pid: result.pid });
});

app.get("/apps/:id/env", async (request, reply) => {
  const record = findAppOrReply(request, reply);
  if (!record) return;

  return { app: appToPublicDto(record), env: appEnvSummary(record.id) };
});

app.post("/apps/:id/env", async (request, reply) => {
  const record = findAppOrReply(request, reply);
  if (!record) return;

  try {
    const saved = upsertAppEnvVar(db, record.id, request.body || {});
    return reply.code(201).send({ app: appToPublicDto(record), envVar: appEnvVarToPublicDto(saved), env: appEnvSummary(record.id) });
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid environment variable payload." });
  }
});

app.patch("/apps/:id/env/:key", async (request, reply) => {
  const record = findAppOrReply(request, reply);
  if (!record) return;

  try {
    const saved = upsertAppEnvVar(db, record.id, { ...(request.body || {}), key: request.params.key });
    return reply.code(200).send({ app: appToPublicDto(record), envVar: appEnvVarToPublicDto(saved), env: appEnvSummary(record.id) });
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid environment variable payload." });
  }
});

app.delete("/apps/:id/env/:key", async (request, reply) => {
  const record = findAppOrReply(request, reply);
  if (!record) return;

  const deleted = deleteAppEnvVar(db, record.id, request.params.key);
  if (!deleted) {
    return reply.code(404).send({ error: `Environment variable ${request.params.key} was not found for ${record.name}.` });
  }
  return reply.code(200).send({ ok: true, app: appToPublicDto(record), env: appEnvSummary(record.id) });
});

app.get("/apps/:id/logs", async (request, reply) => {
  const record = findAppOrReply(request, reply);
  if (!record) return;

  const logs = readRecentLogs(record);
  return {
    app: appToPublicDto(record),
    logs: logs.content,
    path: logs.path,
    bytes: logs.bytes,
    truncated: logs.truncated
  };
});

app.get("/apps/:id/health", async (request, reply) => {
  const record = findAppOrReply(request, reply);
  if (!record) return;

  const shouldRefresh = request.query?.refresh !== "false";
  const latestDeployment = getLatestSuccessfulDeploymentForApp(db, record.id);
  if (shouldRefresh) {
    await evaluateAppHealth(record);
  }
  const checks = listHealthchecksForApp(db, record.id).map(healthcheckToPublicDto);
  const latest = checks[0] || null;
  return {
    app: appToPublicDto(getAppById(db, record.id) || record),
    latestDeployment: latestDeployment ? deploymentToPublicDto(latestDeployment) : null,
    health: {
      status: latest?.status || "unknown",
      checks
    }
  };
});

app.post("/apps/:id/health", async (request, reply) => {
  const record = findAppOrReply(request, reply);
  if (!record) return;

  const check = await evaluateAppHealth(record);
  return reply.code(200).send({ app: appToPublicDto(getAppById(db, record.id) || record), healthcheck: healthcheckToPublicDto(check), health: { status: check.last_status || "unknown", checks: listHealthchecksForApp(db, record.id).map(healthcheckToPublicDto) } });
});

app.get("/apps/:id/metrics", async (request, reply) => {
  const record = findAppOrReply(request, reply);
  if (!record) return;

  if (request.query?.refresh !== "false") {
    await collectMetricsForApp(record);
  }
  return {
    app: appToPublicDto(record),
    metrics: listMetricSamplesForApp(db, record.id).map(metricSampleToPublicDto)
  };
});

app.get("/metrics", async (request) => {
  if (request.query?.refresh !== "false") {
    recordMetricSample(db, hostMetrics());
  }
  return { metrics: listHostMetricSamples(db).map(metricSampleToPublicDto) };
});

app.get("/databases", async () => {
  return { databases: listDatabases(db).map(databaseToPublicDto) };
});

app.post("/databases", async (request, reply) => {
  try {
    const service = buildProductionDatabaseService(request.body || {});
    const savedApp = upsertApp(db, service);
    upsertWorkspaceConfigEntry(workspaceRoot, savedApp, "services");
    const databaseRecord = upsertDatabase(db, {
      appId: savedApp.id,
      name: savedApp.name,
      type: savedApp.preset,
      status: savedApp.status,
      internal: true,
      image: savedApp.image,
      port: savedApp.port,
      composeService: savedApp.compose_service || savedApp.name,
      composeFile: savedApp.compose_file,
      volumeName: savedApp.volumes?.[0]?.split(":")?.[0] || `${savedApp.name}_data`,
      env: savedApp.env || {}
    });
    return reply.code(201).send({ app: appToPublicDtoWithoutEnv(savedApp), database: databaseToPublicDto(databaseRecord) });
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid database payload." });
  }
});

app.post("/databases/:id/start", async (request, reply) => {
  const databaseRecord = getDatabaseById(db, Number(request.params.id));
  if (!databaseRecord) return reply.code(404).send({ error: `Database ${request.params.id} not found.` });
  try {
    const started = await startDatabaseRecord(databaseRecord);
    return reply.code(200).send({ database: databaseToPublicDto(started) });
  } catch (error) {
    return reply.code(500).send({ error: error instanceof Error ? error.message : "Could not start database." });
  }
});

app.post("/databases/:id/stop", async (request, reply) => {
  const databaseRecord = getDatabaseById(db, Number(request.params.id));
  if (!databaseRecord) return reply.code(404).send({ error: `Database ${request.params.id} not found.` });
  try {
    const stopped = await stopDatabaseRecord(databaseRecord);
    return reply.code(200).send({ database: databaseToPublicDto(stopped) });
  } catch (error) {
    return reply.code(500).send({ error: error instanceof Error ? error.message : "Could not stop database." });
  }
});

app.get("/backups", async () => {
  return publicBackupPayload();
});

app.get("/notifications", async () => {
  return publicNotificationsPayload();
});

app.post("/notifications", async (request, reply) => {
  try {
    await validateNotificationChannelTarget(request.body || {});
    const channel = upsertNotificationChannel(db, request.body || {});
    return reply.code(201).send({ channel: notificationChannelToPublicDto(channel), ...publicNotificationsPayload() });
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid notification channel payload." });
  }
});

app.patch("/notifications/:id", async (request, reply) => {
  const existing = listNotificationChannels(db).find((channel) => channel.id === Number(request.params.id));
  if (!existing) return reply.code(404).send({ error: `Notification channel ${request.params.id} not found.` });
  try {
    const payload = { ...existing, ...(request.body || {}), id: existing.id };
    await validateNotificationChannelTarget(payload);
    const channel = upsertNotificationChannel(db, payload);
    return reply.code(200).send({ channel: notificationChannelToPublicDto(channel), ...publicNotificationsPayload() });
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid notification channel update." });
  }
});

app.delete("/notifications/:id", async (request, reply) => {
  const deleted = deleteNotificationChannel(db, Number(request.params.id));
  if (!deleted) return reply.code(404).send({ error: `Notification channel ${request.params.id} not found.` });
  return reply.code(200).send({ ok: true, ...publicNotificationsPayload() });
});

app.post("/notifications/:id/test", async (request, reply) => {
  const channel = listNotificationChannels(db).find((item) => item.id === Number(request.params.id));
  if (!channel) return reply.code(404).send({ error: `Notification channel ${request.params.id} not found.` });
  const event = request.body?.event || "deploy_succeeded";
  const attempt = await deliverNotification(channel, event, {
    appName: request.body?.appName || "test-app",
    databaseName: request.body?.databaseName || "test-db",
    errorMessage: "test delivery",
    resourceType: "notification_test",
    resourceId: channel.id
  });
  return reply.code(attempt.status === "succeeded" ? 200 : 502).send({ attempt: notificationAttemptToPublicDto(attempt), ...publicNotificationsPayload() });
});

app.post("/backups", async (request, reply) => {
  try {
    const databaseId = Number(request.body?.databaseId || request.body?.database_id);
    const databaseName = request.body?.databaseName || request.body?.database;
    const databaseRecord = Number.isInteger(databaseId) ? getDatabaseById(db, databaseId) : databaseName ? getDatabaseByName(db, databaseName) : null;
    if (!databaseRecord) return reply.code(404).send({ error: "Database not found for backup job." });
    const job = upsertBackupJob(db, {
      databaseId: databaseRecord.id,
      enabled: request.body?.enabled,
      schedule: request.body?.schedule ?? null,
      retentionDays: request.body?.retentionDays || request.body?.retention_days || 7,
      localDir: request.body?.localDir || request.body?.local_dir || null
    });
    return reply.code(201).send({ job: backupJobToPublicDto(job), ...publicBackupPayload() });
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid backup job payload." });
  }
});

app.patch("/backups/:id", async (request, reply) => {
  const existing = getBackupJobById(db, Number(request.params.id));
  if (!existing) return reply.code(404).send({ error: `Backup job ${request.params.id} not found.` });
  try {
    const job = upsertBackupJob(db, {
      databaseId: existing.database_id,
      enabled: request.body?.enabled ?? existing.enabled,
      schedule: request.body?.schedule === undefined ? existing.schedule : request.body.schedule,
      retentionDays: request.body?.retentionDays || request.body?.retention_days || existing.retention_days,
      localDir: request.body?.localDir === undefined && request.body?.local_dir === undefined ? existing.local_dir : request.body?.localDir ?? request.body?.local_dir
    });
    return reply.code(200).send({ job: backupJobToPublicDto(job), ...publicBackupPayload() });
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid backup job update." });
  }
});

app.post("/backups/:id/run", async (request, reply) => {
  const job = getBackupJobById(db, Number(request.params.id));
  if (!job) return reply.code(404).send({ error: `Backup job ${request.params.id} not found.` });
  const run = await runBackupJob(job, request.body?.trigger || "manual");
  const status = run?.status === "succeeded" ? 201 : 500;
  return reply.code(status).send({ run: backupRunToPublicDto(getBackupRunById(db, run.id)), ...publicBackupPayload() });
});

app.get("/deployments", async (request) => {
  const appId = Number(request.query?.appId);
  const deployments = Number.isInteger(appId)
    ? listDeploymentsForApp(db, appId).map(deploymentToPublicDto)
    : listDeployments(db).map(deploymentToPublicDto);
  return { deployments };
});

app.get("/apps/:id/deployments", async (request, reply) => {
  const record = findAppOrReply(request, reply);
  if (!record) return;
  return { app: appToPublicDto(record), deployments: listDeploymentsForApp(db, record.id).map(deploymentToPublicDto) };
});

app.post("/apps/:id/deployments", async (request, reply) => {
  const record = findAppOrReply(request, reply);
  if (!record) return;

  if (!record.enabled) {
    return reply.code(400).send({ error: `${record.name} is disabled.` });
  }

  const queued = queueDeploymentForApp(record);
  const deployment = getDeploymentById(db, queued.deployment.id);
  if (!queued.created) {
    return reply.code(409).send({
      error: `Deployment ${deployment.id} is already ${deployment.status} for ${record.name}.`,
      app: appToPublicDto(record),
      deployment: deploymentToPublicDto(deployment)
    });
  }
  return reply.code(202).send({ app: appToPublicDto(record), deployment: deploymentToPublicDto(deployment) });
});

app.get("/github/status", async () => {
  return { github: publicGithubStatus() };
});

app.get("/github/installations", async () => {
  return { installations: listGithubInstallations(db).map(publicGithubInstallationDto) };
});

app.post("/github/installations", async (request, reply) => {
  try {
    const installation = upsertGithubInstallation(db, request.body || {});
    return reply.code(201).send({ installation: publicGithubInstallationDto(installation) });
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid GitHub installation payload." });
  }
});

app.get("/github/repos", async () => {
  return { repositories: listGithubRepositories(db).map(publicGithubRepositoryDto) };
});

app.post("/github/repos", async (request, reply) => {
  try {
    const repository = upsertGithubRepository(db, request.body || {});
    return reply.code(201).send({ repository: publicGithubRepositoryDto(repository) });
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid GitHub repository payload." });
  }
});

app.get("/apps/:id/github", async (request, reply) => {
  const record = findAppOrReply(request, reply);
  if (!record) return;
  const source = getGithubSourceForApp(db, record.id);
  return {
    app: appToPublicDto(source.app || record),
    source: source.source || null,
    repository: source.repository ? publicGithubRepositoryDto(source.repository) : null,
    github: publicGithubStatus()
  };
});

app.post("/apps/:id/github", async (request, reply) => {
  const record = findAppOrReply(request, reply);
  if (!record) return;

  try {
    const connected = connectAppToGithubRepository(db, record.id, request.body || {});
    if (!connected) {
      return reply.code(404).send({ error: `App ${record.id} not found.` });
    }
    upsertWorkspaceConfigEntry(workspaceRoot, connected.app, connected.app.type === "app" || connected.app.type === "worker" || connected.app.type === "static" ? "apps" : "services");
    return reply.code(200).send({ app: appToPublicDto(connected.app), repository: publicGithubRepositoryDto(connected.repository) });
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid GitHub app connection payload." });
  }
});

app.get("/github/deliveries", async () => {
  return { deliveries: listGithubWebhookDeliveries(db).map(publicGithubDeliveryDto) };
});

app.post("/github/webhook", async (request, reply) => {
  const deliveryId = request.headers["x-github-delivery"];
  const eventName = request.headers["x-github-event"];
  const signature = request.headers["x-hub-signature-256"];
  const delivery = Array.isArray(deliveryId) ? deliveryId[0] : deliveryId;
  const event = Array.isArray(eventName) ? eventName[0] : eventName;
  const signatureHeader = Array.isArray(signature) ? signature[0] : signature;
  const rawBody = request.rawBody || Buffer.from(JSON.stringify(request.body || {}), "utf8");

  if (!delivery) {
    return reply.code(400).send({ error: "Missing X-GitHub-Delivery header." });
  }

  const signatureResult = validateGithubWebhookSignature({
    payload: rawBody,
    signature: signatureHeader,
    secret: githubWebhookSecret()
  });

  if (!signatureResult.ok) {
    recordGithubWebhookDelivery(db, {
      deliveryId: delivery,
      event: event || "unknown",
      status: "rejected",
      signatureValid: false,
      message: signatureResult.reason
    });
    return reply.code(401).send({ error: signatureResult.reason || "Invalid GitHub webhook signature." });
  }

  const filtered = filterGithubWebhookEvent(event, request.body || {});
  const push = filtered.push;
  const recorded = recordGithubWebhookDelivery(db, {
    deliveryId: delivery,
    event: event || "unknown",
    action: filtered.action,
    status: filtered.supported ? "received" : "ignored",
    signatureValid: true,
    repo: push?.repo || null,
    branch: push?.branch || null,
    commitSha: push?.commitSha || null,
    message: filtered.reason || push?.message || null
  });

  if (!recorded.inserted) {
    return reply.code(200).send({
      ok: true,
      duplicate: true,
      alreadyProcessed: true,
      status: "duplicate",
      message: `GitHub delivery ${delivery} was already processed.`,
      delivery: publicGithubDeliveryDto(recorded.delivery)
    });
  }

  if (!filtered.supported || !push) {
    const updated = updateGithubWebhookDelivery(db, delivery, {
      status: "ignored",
      action: filtered.action,
      message: filtered.reason,
      processedAt: new Date().toISOString()
    });
    return reply.code(202).send({ ok: true, ignored: true, reason: filtered.reason, delivery: publicGithubDeliveryDto(updated) });
  }

  const matches = listGithubConnectedAppsForPush(db, push);
  if (matches.length === 0) {
    const updated = updateGithubWebhookDelivery(db, delivery, {
      status: "ignored",
      action: "push",
      repo: push.repo,
      branch: push.branch,
      commitSha: push.commitSha,
      message: `No Routely app is connected to ${push.repo}:${push.branch}.`,
      processedAt: new Date().toISOString()
    });
    return reply.code(202).send({ ok: true, ignored: true, reason: updated.message, delivery: publicGithubDeliveryDto(updated) });
  }

  const target = matches[0];
  const queued = queueDeploymentForApp(target, { type: "github", repo: push.repo, branch: push.branch, commitSha: push.commitSha });
  const deployment = getDeploymentById(db, queued.deployment.id);
  const updated = updateGithubWebhookDelivery(db, delivery, {
    status: queued.created ? "deployment_queued" : "deployment_active",
    action: "push",
    appId: target.id,
    deploymentId: deployment.id,
    repo: push.repo,
    branch: push.branch,
    commitSha: push.commitSha,
    message: queued.created
      ? `Queued deployment ${deployment.id} for ${target.name}.`
      : `Deployment ${deployment.id} is already ${deployment.status} for ${target.name}.`,
    processedAt: new Date().toISOString()
  });

  return reply.code(202).send({
    ok: true,
    queued: queued.created,
    deployment: deploymentToPublicDto(getDeploymentById(db, deployment.id)),
    app: appToPublicDto(target),
    delivery: publicGithubDeliveryDto(updated)
  });
});

app.get("/deployments/:id", async (request, reply) => {
  const id = Number(request.params.id);
  const deployment = Number.isInteger(id) ? getDeploymentById(db, id) : null;
  if (!deployment) {
    return reply.code(404).send({ error: `Deployment ${request.params.id} not found.` });
  }
  return { deployment: deploymentToPublicDto(deployment) };
});

app.get("/deployments/:id/logs", async (request, reply) => {
  const id = Number(request.params.id);
  const deployment = Number.isInteger(id) ? getDeploymentById(db, id) : null;
  if (!deployment) {
    return reply.code(404).send({ error: `Deployment ${request.params.id} not found.` });
  }
  const appRecord = getAppById(db, deployment.app_id);
  const afterSequence = Number(request.query?.after || request.query?.afterSequence || 0);
  return {
    deployment: deploymentToPublicDto(deployment),
    logs: appRecord
      ? readDeploymentLogsRedacted(appRecord, deployment.id, { afterSequence })
      : listDeploymentLogs(db, deployment.id, { afterSequence }).map(deploymentLogToPublicDto)
  };
});

app.get("/deployments/:id/logs/stream", async (request, reply) => {
  const id = Number(request.params.id);
  const deployment = Number.isInteger(id) ? getDeploymentById(db, id) : null;
  if (!deployment) {
    return reply.code(404).send({ error: `Deployment ${request.params.id} not found.` });
  }
  const appRecord = getAppById(db, deployment.app_id);
  const afterSequence = Number(request.query?.after || request.query?.afterSequence || 0);
  const logs = appRecord
    ? readDeploymentLogsRedacted(appRecord, deployment.id, { afterSequence })
    : listDeploymentLogs(db, deployment.id, { afterSequence }).map(deploymentLogToPublicDto);
  const body = logs.map((log) => formatSseEvent("deployment-log", log, { id: log.sequence })).join("") + formatSseEvent("deployment", deploymentToPublicDto(deployment), { id: `deployment-${deployment.id}` });
  reply.header("content-type", "text/event-stream; charset=utf-8");
  reply.header("cache-control", "no-cache, no-transform");
  reply.header("connection", "keep-alive");
  return reply.send(body);
});

app.post("/apps", async (request, reply) => {
  try {
    const saved = upsertApp(db, request.body || {});
    upsertWorkspaceConfigEntry(workspaceRoot, saved, saved.type === "app" || saved.type === "worker" || saved.type === "static" ? "apps" : "services");
    return reply.code(201).send({ app: appToPublicDto(saved) });
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid app payload." });
  }
});

app.patch("/apps/:id", async (request, reply) => {
  const existing = findAppOrReply(request, reply);
  if (!existing) return;

  try {
    const saved = updateApp(db, existing.id, request.body || {});
    upsertWorkspaceConfigEntry(workspaceRoot, saved, saved.type === "app" || saved.type === "worker" || saved.type === "static" ? "apps" : "services");
    return reply.code(200).send({ app: appToPublicDto(saved) });
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid app payload." });
  }
});

app.delete("/apps/:id", async (request, reply) => {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || !getAppById(db, id)) {
    return reply.code(404).send({ error: `App ${request.params.id} not found.` });
  }

  deleteApp(db, id);
  return reply.code(200).send({ ok: true, id });
});

let backupSchedulerRunning = false;
async function runDueBackupJobs() {
  if (backupSchedulerRunning) return;
  backupSchedulerRunning = true;
  try {
    const due = listDueBackupJobs(db, (schedule, lastRunAt) => backupScheduleDue(schedule, new Date(), lastRunAt));
    for (const job of due) {
      void runBackupJob(job, "scheduled");
    }
  } finally {
    backupSchedulerRunning = false;
  }
}

const backupScheduler = setInterval(() => {
  void runDueBackupJobs();
}, 60_000);

function shutdown() {
  clearInterval(backupScheduler);
  db.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

try {
  await app.listen({ port, host });
  console.log(`Routely daemon running at http://${host}:${port}`);
  console.log(`Routely database: ${databasePath}`);
} catch (error) {
  app.log.error(error);
  db.close();
  process.exit(1);
}
