import Fastify from "fastify";
import "dotenv/config";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync } from "node:fs";
import net from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_DAEMON_PORT,
  appToPublicDto,
  defaultProductionDataDir,
  deploymentLogToPublicDto,
  deploymentToPublicDto,
  loadWorkspaceConfig,
  runServerDoctorChecks,
  upsertWorkspaceConfigEntry,
  verifyAdminToken
} from "@routely/core";
import {
  appendDeploymentLog,
  createDeployment,
  deleteApp,
  getDeploymentById,
  getAppById,
  getLatestSuccessfulDeploymentForApp,
  getServerFoundationState,
  initializeRoutely,
  listDeploymentLogs,
  listDeployments,
  listDeploymentsForApp,
  listRunningRuntimeInstances,
  listApps,
  recordRuntimeStart,
  recordRuntimeStop,
  reconcileStaleRuntimeInstances,
  saveServerFoundationState,
  syncWorkspaceConfig,
  updateApp,
  updateDeployment,
  updateAppStatus,
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

const port = Number(process.env.ROUTELY_DAEMON_PORT || DEFAULT_DAEMON_PORT);
const host = process.env.ROUTELY_DAEMON_HOST || "127.0.0.1";
const serverFile = fileURLToPath(import.meta.url);
const workspaceRoot = process.env.ROUTELY_WORKSPACE_ROOT || process.env.ROUTELY_REPO_ROOT || resolve(dirname(serverFile), "../../..");
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

const app = Fastify({ logger: true });

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
    disabledProductionActions: ["domains", "https", "github", "backups"]
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
  const publicPaths = new Set(["/health", "/server/status", "/auth/status"]);

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
    const child = startCommandApp(appRecord, { stdio: ["ignore", fd, fd] });
    child.unref();
    closeSync(fd);

    if (child.pid) {
      recordRuntimeStart(db, appRecord.id, child.pid);
    }

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
        appendDeploymentLog(db, deployment.id, { phase: "healthchecking", message: `healthcheck ${url} -> ${response.status}` });
        if (response.status === expected) {
          return;
        }
        lastError = new Error(`healthcheck returned ${response.status}, expected ${expected}`);
      } catch (error) {
        lastError = error;
        appendDeploymentLog(db, deployment.id, { phase: "healthchecking", stream: "stderr", message: error instanceof Error ? error.message : String(error) });
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

async function markDeploymentFailed(deploymentId, phase, error, containerName) {
  const message = error instanceof Error ? error.message : String(error);
  appendDeploymentLog(db, deploymentId, { phase, stream: "stderr", message });
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
    appendDeploymentLog(db, deploymentId, { phase: "preparing", message: `preparing Dockerfile deployment for ${appRecord.name}` });

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
    appendDeploymentLog(db, deploymentId, { phase: "building", message: `docker ${dockerBuildArgs({ context, dockerfile, imageTag }).join(" ")}` });
    await waitForLoggedChild(spawnDocker(dockerBuildArgs({ context, dockerfile, imageTag }), { cwd: context }), deploymentId, "building");

    updateDeployment(db, deploymentId, { status: "starting", phase: "starting" });
    await removeContainerIfPresent(containerName, deploymentId, "starting");
    appendDeploymentLog(db, deploymentId, { phase: "starting", message: `starting ${containerName} on temporary port ${hostPort}` });
    await waitForLoggedChild(
      spawnDocker(dockerRunArgs({ containerName, imageTag, hostPort, containerPort, env: appRecord.env || {} }), { cwd: context }),
      deploymentId,
      "starting"
    );

    deployment = getDeploymentById(db, deploymentId);
    updateDeployment(db, deploymentId, { status: "healthchecking", phase: "healthchecking" });
    appendDeploymentLog(db, deploymentId, { phase: "healthchecking", message: appRecord.healthcheck?.path ? "running HTTP healthcheck" : "checking container state" });
    await runHealthcheck(appRecord, deployment);

    updateDeployment(db, deploymentId, {
      status: "succeeded",
      phase: "succeeded",
      errorMessage: null,
      finishedAt: new Date().toISOString()
    });
    updateAppStatus(db, appRecord.id, "running");
    appendDeploymentLog(db, deploymentId, { phase: "succeeded", message: `deployment succeeded at ${deploymentUrl(getDeploymentById(db, deploymentId))}` });
  } catch (error) {
    await markDeploymentFailed(deploymentId, getDeploymentById(db, deploymentId)?.phase || "failed", error, containerName);
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
  const content = readFileSync(logPath).subarray(start).toString("utf8");

  return { path: logPath, content, bytes: stats.size, truncated: start > 0 };
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

  const latest = getLatestSuccessfulDeploymentForApp(db, record.id);
  const deployment = createDeployment(db, {
    appId: record.id,
    source: {
      type: record.source?.type || "local",
      repo: record.source?.repo || null,
      branch: record.source?.branch || null
    },
    previous: latest
      ? { imageTag: latest.image_tag, containerName: latest.container_name }
      : {},
    containerPort: record.port || 3000
  });
  appendDeploymentLog(db, deployment.id, { phase: "queued", message: `queued deployment for ${record.name}` });

  void runDockerfileDeployment(record, deployment.id);
  return reply.code(202).send({ app: appToPublicDto(record), deployment: deploymentToPublicDto(getDeploymentById(db, deployment.id)) });
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
  const afterSequence = Number(request.query?.after || request.query?.afterSequence || 0);
  return {
    deployment: deploymentToPublicDto(deployment),
    logs: listDeploymentLogs(db, deployment.id, { afterSequence }).map(deploymentLogToPublicDto)
  };
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
