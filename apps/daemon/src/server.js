import Fastify from "fastify";
import "dotenv/config";
import { config as loadDotenv } from "dotenv";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync, statfsSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_DAEMON_PORT,
  appToPublicDto,
  appEnvVarToPublicDto,
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
  redactSecrets,
  runServerDoctorChecks,
  upsertWorkspaceConfigEntry,
  verifyAdminToken
} from "@routely/core";
import {
  appendDeploymentLog,
  appEnvPendingState,
  clearAppEnvPendingFlags,
  connectAppToGithubRepository,
  createDeployment,
  createDomain,
  deleteApp,
  deleteDomain,
  deleteAppEnvVar,
  deleteProxyRouteForDomain,
  getDeploymentById,
  getDomainByHostname,
  getAppById,
  getGithubSourceForApp,
  getLatestSuccessfulDeploymentForApp,
  getServerFoundationState,
  getSetting,
  listHealthchecksForApp,
  listHostMetricSamples,
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
  listRunningRuntimeInstances,
  listSecretValuesForApp,
  listApps,
  recordMetricSample,
  recordRuntimeStart,
  recordRuntimeStop,
  reconcileStaleRuntimeInstances,
  saveServerFoundationState,
  setSetting,
  syncWorkspaceConfig,
  recordGithubWebhookDelivery,
  updateApp,
  updateDeployment,
  updateAppStatus,
  updateDomainVerification,
  updateGithubWebhookDelivery,
  upsertHealthcheckResult,
  upsertAppEnvVar,
  upsertGithubInstallation,
  upsertGithubRepository,
  upsertProxyRoute,
  upsertApp
} from "@routely/db";
import {
  buildDockerfileContainerName,
  buildDockerfileImageTag,
  dockerBuildArgs,
  dockerInspectRunningArgs,
  dockerRemoveContainerArgs,
  dockerRunArgs,
  spawnDocker,
  startCommandApp,
  startComposeService,
  stopComposeService
} from "@routely/drivers";
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
  const envProduction = process.env.ROUTELY_SERVER_MODE === "production";
  const envTokenConfigured = Boolean(process.env.ROUTELY_ADMIN_TOKEN);

  return {
    ...state,
    mode: envProduction ? "production" : state.mode,
    production: envProduction || state.production,
    dataDir: state.dataDir || defaultProductionDataDir(workspaceRoot),
    auth: {
      ...state.auth,
      required: envProduction || state.auth.required,
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
    disabledProductionActions: ["backups", "metrics", "rollback"]
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

  if (appRecord.port && !(await isPortAvailable(appRecord.port))) {
    return { ok: false, status: 409, error: `Port ${appRecord.port} is already in use.` };
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
  return {
    id: domain.id,
    appId: domain.app_id,
    appName: domain.app_name || null,
    hostname: domain.hostname,
    status: domain.status,
    dnsStatus: domain.dns_status,
    tlsStatus: domain.tls_status,
    targetPort: domain.target_port == null ? null : Number(domain.target_port),
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

function appendDeploymentLogForApp(appRecord, deploymentId, input) {
  return appendDeploymentLog(db, deploymentId, {
    ...input,
    message: redactForApp(appRecord, input.message)
  });
}

function queueDeploymentForApp(appRecord, source = {}) {
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
  return deployment;
}

function serverPublicIp() {
  return process.env.ROUTELY_SERVER_PUBLIC_IP || getSetting(db, "server.public_ip") || null;
}

function materializeProxyRouteForDomain(domain) {
  const appRecord = getAppById(db, domain.app_id);
  const deployment = getLatestSuccessfulDeploymentForApp(db, domain.app_id);
  const route = buildTraefikRoute({ domain, deployment, app: appRecord });

  if (!route) {
    deleteProxyRouteForDomain(db, domain.hostname);
    return null;
  }

  return upsertProxyRoute(db, {
    domainId: domain.id,
    appId: domain.app_id,
    deploymentId: deployment.id,
    routerName: route.routerName,
    serviceName: route.serviceName,
    targetUrl: route.service.loadBalancer.servers[0].url,
    config: route,
    enabled: domain.status === "ready"
  });
}

function materializeProxyRoutesForApp(appId) {
  return listDomainsForApp(db, appId).map(materializeProxyRouteForDomain).filter(Boolean);
}

function currentTraefikConfig() {
  const routes = listDomains(db).map((domain) => {
    const appRecord = getAppById(db, domain.app_id);
    const deployment = getLatestSuccessfulDeploymentForApp(db, domain.app_id);
    return buildTraefikRoute({ domain, deployment, app: appRecord });
  }).filter(Boolean);
  return buildTraefikDynamicConfig(routes);
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
        appendDeploymentLogForApp(appRecord, deployment.id, { phase: "healthchecking", stream: "stderr", message: error instanceof Error ? error.message : String(error) });
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
    const appId = Number(request.body?.appId);
    const appName = request.body?.appName ? String(request.body.appName) : null;
    const appRecord = Number.isInteger(appId) ? getAppById(db, appId) : appName ? listApps(db).find((item) => item.name === appName) : null;
    const hostname = validateHostname(request.body?.hostname);

    if (!appRecord) {
      return reply.code(404).send({ error: "Target app was not found." });
    }
    if (appRecord.internal || appRecord.type === "database") {
      return reply.code(400).send({ error: `${appRecord.name} is internal and cannot be exposed through the public proxy.` });
    }
    if (getDomainByHostname(db, hostname)) {
      return reply.code(409).send({ error: `${hostname} is already registered.` });
    }

    const latest = getLatestSuccessfulDeploymentForApp(db, appRecord.id);
    const domain = createDomain(db, {
      appId: appRecord.id,
      hostname,
      targetPort: latest?.host_port || null,
      verificationMessage: `Create an A record for ${hostname} pointing to ${serverPublicIp() || "this server's public IP"}.`
    });
    materializeProxyRouteForDomain(domain);
    return reply.code(201).send({ domain: publicDomainDto(getDomainByHostname(db, hostname)) });
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
  request.body = { ...(request.body || {}), appId: record.id };
  return app.inject({ method: "POST", url: "/domains", payload: request.body, headers: request.headers }).then((response) => {
    reply.code(response.statusCode);
    return JSON.parse(response.body || "{}");
  });
});

app.post("/domains/:hostname/verify", async (request, reply) => {
  const hostname = normalizeHostname(request.params.hostname);
  const domain = getDomainByHostname(db, hostname);
  if (!domain) {
    return reply.code(404).send({ error: `Domain ${hostname} not found.` });
  }

  const result = await verifyDnsARecord(domain.hostname, serverPublicIp());
  const latest = getLatestSuccessfulDeploymentForApp(db, domain.app_id);
  const status = result.ok && latest?.host_port ? "ready" : result.ok ? "verified" : "pending";
  const tlsStatus = status === "ready" ? "issuing" : "pending";
  const updated = updateDomainVerification(db, domain.hostname, {
    status,
    dnsStatus: result.status,
    tlsStatus,
    targetPort: latest?.host_port || null,
    verificationMessage: latest?.host_port ? result.message : `${result.message} Waiting for a successful deployment before enabling the route.`
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
  const record = findAppOrReply(request, reply);
  if (!record) return;

  const result = await startLocalApp(record);
  if (!result.ok) {
    return reply.code(result.status).send({ error: result.error });
  }

  return reply.code(200).send({ app: appToPublicDto(result.app), pid: result.pid });
});

app.post("/apps/:id/stop", async (request, reply) => {
  const record = findAppOrReply(request, reply);
  if (!record) return;

  const result = await stopLocalApp(record);
  if (!result.ok) {
    return reply.code(result.status).send({ error: result.error });
  }
  return reply.code(200).send({ app: appToPublicDto(result.app), stopped: result.stopped });
});

app.post("/apps/:id/restart", async (request, reply) => {
  const record = findAppOrReply(request, reply);
  if (!record) return;

  const validationError = validateStartableApp(record);
  if (validationError) {
    return reply.code(400).send({ error: validationError });
  }

  const stopResult = await stopLocalApp(record, "restart");
  if (!stopResult.ok) {
    return reply.code(stopResult.status).send({ error: stopResult.error });
  }
  const refreshed = getAppById(db, record.id);
  const result = await startLocalApp(refreshed);

  if (!result.ok) {
    return reply.code(result.status).send({ error: result.error });
  }

  return reply.code(200).send({ app: appToPublicDto(result.app), pid: result.pid });
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

  const deployment = queueDeploymentForApp(record);
  return reply.code(202).send({ app: appToPublicDto(record), deployment: deploymentToPublicDto(getDeploymentById(db, deployment.id)) });
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
    return reply.code(200).send({ ok: true, duplicate: true, delivery: publicGithubDeliveryDto(recorded.delivery) });
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
  const deployment = queueDeploymentForApp(target, { type: "github", repo: push.repo, branch: push.branch, commitSha: push.commitSha });
  const updated = updateGithubWebhookDelivery(db, delivery, {
    status: "deployment_queued",
    action: "push",
    appId: target.id,
    deploymentId: deployment.id,
    repo: push.repo,
    branch: push.branch,
    commitSha: push.commitSha,
    message: `Queued deployment ${deployment.id} for ${target.name}.`,
    processedAt: new Date().toISOString()
  });

  return reply.code(202).send({
    ok: true,
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

function shutdown() {
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
