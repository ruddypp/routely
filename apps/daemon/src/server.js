import Fastify from "fastify";
import "dotenv/config";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync } from "node:fs";
import net from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_DAEMON_PORT, appToPublicDto, loadWorkspaceConfig } from "@routely/core";
import {
  deleteApp,
  getAppById,
  initializeRoutely,
  listRunningRuntimeInstances,
  listApps,
  recordRuntimeStart,
  recordRuntimeStop,
  reconcileStaleRuntimeInstances,
  syncWorkspaceConfig,
  updateAppStatus,
  upsertApp
} from "@routely/db";
import { startCommandApp } from "@routely/drivers";

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

  if (appRecord.driver !== "command") {
    return `Start currently supports command apps only. ${appRecord.name} uses ${appRecord.driver}.`;
  }

  if (!appRecord.command) {
    return `${appRecord.name} does not have a command configured.`;
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

  if (runningInstancesForApp(appRecord.id).length > 0) {
    return { ok: false, status: 409, error: `${appRecord.name} is already running.` };
  }

  if (appRecord.port && !(await isPortAvailable(appRecord.port))) {
    return { ok: false, status: 409, error: `Port ${appRecord.port} is already in use.` };
  }

  updateAppStatus(db, appRecord.id, "starting");
  writeLogHeader(appRecord.name, `starting ${appRecord.command}`);

  try {
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

async function stopLocalApp(appRecord, reason = "stop") {
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

app.get("/health", async () => {
  return {
    ok: true,
    service: "routely-daemon",
    version: "0.1.0",
    workspace: workspaceRoot,
    database: databasePath,
    startedAt,
    apps: listApps(db).map(appToPublicDto)
  };
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
  return reply.code(200).send({ app: appToPublicDto(result.app), stopped: result.stopped });
});

app.post("/apps/:id/restart", async (request, reply) => {
  const record = findAppOrReply(request, reply);
  if (!record) return;

  const validationError = validateStartableApp(record);
  if (validationError) {
    return reply.code(400).send({ error: validationError });
  }

  await stopLocalApp(record, "restart");
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

app.post("/apps", async (request, reply) => {
  try {
    const saved = upsertApp(db, request.body || {});
    return reply.code(201).send({ app: appToPublicDto(saved) });
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
