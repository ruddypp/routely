import { spawnSync } from "node:child_process";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, statSync, statfsSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import { resolve } from "node:path";

export const SERVER_MODE_LOCAL = "local";
export const SERVER_MODE_PRODUCTION = "production";
const SERVER_DEFAULT_DASHBOARD_PORT = 3030;
export const DEFAULT_PRODUCTION_PORTS = [80, 443, SERVER_DEFAULT_DASHBOARD_PORT];

export function defaultProductionDataDir(workspaceRoot = process.cwd()) {
  if (process.env.ROUTELY_SERVER_DATA_DIR) {
    return resolve(process.env.ROUTELY_SERVER_DATA_DIR);
  }

  if (process.env.ROUTELY_DATA_DIR) {
    return resolve(workspaceRoot, process.env.ROUTELY_DATA_DIR);
  }

  if (process.platform === "linux" && typeof process.getuid === "function" && process.getuid() === 0) {
    return "/var/lib/routely";
  }

  return resolve(workspaceRoot, ".routely", "server");
}

export function generateAdminToken() {
  return randomBytes(32).toString("base64url");
}

export function hashAdminToken(token, salt = randomBytes(16).toString("hex")) {
  const hash = createHash("sha256").update(`${salt}:${token}`).digest("hex");
  return { salt, hash };
}

export function verifyAdminToken(token, salt, expectedHash) {
  if (!token || !salt || !expectedHash) {
    return false;
  }

  const { hash } = hashAdminToken(token, salt);
  const actual = Buffer.from(hash, "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export async function runServerDoctorChecks(options = {}) {
  const dataDir = resolve(options.dataDir || defaultProductionDataDir(options.workspaceRoot));
  const dashboardPort = Number(options.dashboardPort || process.env.ROUTELY_DASHBOARD_PORT || SERVER_DEFAULT_DASHBOARD_PORT);
  const ports = Array.isArray(options.ports) && options.ports.length > 0
    ? options.ports.map(Number).filter((port) => Number.isInteger(port) && port > 0)
    : DEFAULT_PRODUCTION_PORTS;

  const [docker, compose, node, npm, dataDirectory, ...portChecks] = await Promise.all([
    commandCheck("docker", ["--version"], { required: true }),
    dockerComposeCheck(),
    commandCheck("node", ["-v"], { required: true }),
    commandCheck("npm", ["-v"], { required: true }),
    dataDirCheck(dataDir, options.createDataDir === true),
    ...ports.map((port) => portCheck(port, { dashboardPort }))
  ]);

  const disk = diskCheck(dataDir);
  const memory = memoryCheck();
  const checks = [docker, compose, node, npm, dataDirectory, disk, memory, ...portChecks];
  const ok = checks.every((check) => check.status === "ok");

  return {
    ok,
    dataDir,
    ports,
    checkedAt: new Date().toISOString(),
    checks
  };
}

function commandCheck(command, args, { required }) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  const output = (result.stdout || result.stderr || "").trim();

  return {
    id: command,
    label: command,
    status: result.status === 0 ? "ok" : required ? "error" : "warn",
    message: result.status === 0 ? output : `${command} is not available`,
    detail: result.error?.message || null
  };
}

function dockerComposeCheck() {
  const plugin = spawnSync("docker", ["compose", "version"], { encoding: "utf8" });
  if (plugin.status === 0) {
    return {
      id: "docker-compose",
      label: "Docker Compose",
      status: "ok",
      message: (plugin.stdout || plugin.stderr || "docker compose available").trim(),
      detail: "docker compose plugin"
    };
  }

  const legacy = spawnSync("docker-compose", ["--version"], { encoding: "utf8" });
  return {
    id: "docker-compose",
    label: "Docker Compose",
    status: legacy.status === 0 ? "ok" : "error",
    message: legacy.status === 0 ? (legacy.stdout || legacy.stderr).trim() : "Docker Compose is not available",
    detail: legacy.error?.message || plugin.error?.message || null
  };
}

function dataDirCheck(dataDir, create) {
  try {
    if (create) {
      mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    }

    if (!existsSync(dataDir)) {
      return {
        id: "data-dir",
        label: "Production data directory",
        status: "error",
        message: `${dataDir} does not exist`,
        detail: "Run routely server init or pass --data-dir."
      };
    }

    const stats = statSync(dataDir);
    return {
      id: "data-dir",
      label: "Production data directory",
      status: stats.isDirectory() ? "ok" : "error",
      message: stats.isDirectory() ? dataDir : `${dataDir} is not a directory`,
      detail: null
    };
  } catch (error) {
    return {
      id: "data-dir",
      label: "Production data directory",
      status: "error",
      message: `Cannot prepare ${dataDir}`,
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

function diskCheck(dataDir) {
  try {
    const target = existsSync(dataDir) ? dataDir : process.cwd();
    const stats = statfsSync(target);
    const freeBytes = stats.bavail * stats.bsize;
    const freeGb = freeBytes / 1024 / 1024 / 1024;

    return {
      id: "disk",
      label: "Disk space",
      status: freeGb >= 2 ? "ok" : "warn",
      message: `${freeGb.toFixed(1)} GB available`,
      detail: target
    };
  } catch (error) {
    return {
      id: "disk",
      label: "Disk space",
      status: "warn",
      message: "Could not read disk space",
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

function memoryCheck() {
  const totalGb = os.totalmem() / 1024 / 1024 / 1024;
  const freeGb = os.freemem() / 1024 / 1024 / 1024;

  return {
    id: "memory",
    label: "Memory",
    status: totalGb >= 1 ? "ok" : "warn",
    message: `${totalGb.toFixed(1)} GB total, ${freeGb.toFixed(1)} GB free`,
    detail: null
  };
}

async function expectedDashboardCheck(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1000) });
    const data = await response.json().catch(() => null);
    if (response.ok && data && typeof data === "object" && ("connected" in data || "daemonUrl" in data)) {
      return {
        id: `port-${port}`,
        label: `Port ${port}`,
        status: "ok",
        message: `Port ${port} is already serving the Routely dashboard`,
        detail: "expected dashboard process"
      };
    }
  } catch {
    // Fall through to the generic occupied-port error.
  }
  return null;
}

function portCheck(port, options = {}) {
  return new Promise((resolvePort) => {
    const probe = net.createServer();
    let settled = false;

    const finish = (status, message, detail = null) => {
      if (settled) return;
      settled = true;
      resolvePort({
        id: `port-${port}`,
        label: `Port ${port}`,
        status,
        message,
        detail
      });
    };

    probe.once("error", (error) => {
      if (port === options.dashboardPort) {
        expectedDashboardCheck(port).then((dashboard) => {
          if (dashboard) {
            finish(dashboard.status, dashboard.message, dashboard.detail);
          } else {
            finish(error.code === "EACCES" ? "warn" : "error", `Port ${port} is not available`, error.message);
          }
        });
        return;
      }
      finish(error.code === "EACCES" ? "warn" : "error", `Port ${port} is not available`, error.message);
    });
    probe.once("listening", () => {
      probe.close(() => finish("ok", `Port ${port} is available`));
    });
    probe.listen(port, "0.0.0.0");
  });
}
