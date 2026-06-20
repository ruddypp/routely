#!/usr/bin/env node

import {
  appendFileSync,
  closeSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  unwatchFile,
  watchFile,
  writeFileSync
} from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import {
  DEFAULT_DAEMON_PORT,
  DEFAULT_DASHBOARD_PORT,
  appToPublicDto,
  mergeAppEnv,
  defaultProductionDataDir,
  generateAdminToken,
  hashAdminToken,
  loadWorkspaceConfig,
  runServerDoctorChecks,
  upsertWorkspaceConfigEntry,
  type RoutelyAppInput,
  type RoutelyAppRecord,
  type RoutelyDeploymentDto,
  type RoutelyDeploymentLogDto
} from "@routely/core";
import {
  getAppByName,
  initializeRoutely,
  listAppEnvVars,
  listRunningRuntimeInstances,
  listApps,
  getServerFoundationState,
  reconcileStaleRuntimeInstances,
  recordRuntimeStart,
  recordRuntimeStop,
  saveServerFoundationState,
  syncWorkspaceConfig,
  clearAppEnvPendingFlags,
  updateAppStatus,
  upsertApp
} from "@routely/db";
import { startCommandApp, startComposeService, stopComposeService } from "@routely/drivers";
import { createDatabaseService, detectPreset, getAppPreset } from "@routely/presets";
import { validateHostname } from "@routely/proxy";
import { DependencyCycleError, sortByDependencies } from "./dependencies.js";
import { resolveInstallRoot, resolveWorkspaceRoot } from "./paths.js";
import { findExistingRoutelyDashboard, findUnavailablePorts, isPortAvailable, probeRoutelyDaemon, probeRoutelyDashboard } from "./ports.js";

type ChildProcess = ReturnType<typeof spawn>;
type RunningApp = { app: RoutelyAppRecord; child: ChildProcess };
type RoutelyDb = ReturnType<typeof initializeRoutely>["db"];

const cliFile = fileURLToPath(import.meta.url);
const cliDir = dirname(cliFile);
const argv = process.argv.slice(2);
const command = argv[0] || "up";
const invocationCwd = process.cwd();
const installRoot = resolveInstallRoot(cliDir);
const workspaceRoot = resolveWorkspaceRoot(invocationCwd);

function parseFlags(args: string[]): { positionals: string[]; flags: Record<string, string | boolean> } {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (!value.startsWith("--")) {
      positionals.push(value);
      continue;
    }

    const key = value.slice(2);
    const next = args[index + 1];

    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return { positionals, flags };
}

function validateHostnameForCli(value: string, options?: { allowWildcard?: boolean }): string {
  try {
    return validateHostname(value, options);
  } catch (error) {
    console.error(`Invalid hostname: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function run(name: string, commandName: string, args: string[], env: Record<string, string> = {}): ChildProcess {
  const child = spawn(commandName, args, {
    cwd: installRoot,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      ROUTELY_REPO_ROOT: installRoot,
      ROUTELY_WORKSPACE_ROOT: workspaceRoot,
      ...env
    }
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
    }
  });

  return child;
}

function printHelp(): void {
  console.log(`Routely

Usage:
  routely                  Sync routely.yml, then start daemon, dashboard, and command apps
  routely init             Create .routely/routely.db and a starter routely.yml
  routely sync             Load routely.yml into the app registry
  routely down             Stop running managed app processes
  routely ps               List registered apps
  routely logs [app]       Print app logs, optionally with --follow
  routely restart [app]    Restart one command app
  routely health <app>     Show app health and latest metric samples
  routely deploy <app>     Trigger a Dockerfile production deployment, optionally with --watch
  routely env <app> list
  routely env <app> set KEY=value [--secret] [--scope all|local|production]
  routely env <app> unset KEY
  routely github status     Show GitHub App, repositories, and recent webhook deliveries
  routely github repo add <owner/repo> [--branch <branch>] [--installation-id <id>]
  routely github connect <app> <owner/repo> [--branch <branch>] [--auto-deploy false]
  routely domain root <domain>
  routely domain add <app> <hostname>
  routely domain verify <hostname>
  routely domain ls
  routely db ls            List production database records from the daemon
  routely backup enable <database> [--schedule "0 2 * * *"] [--retention-days 7]
  routely backup disable <database>
  routely backup run <database>
  routely backup ls
  routely notify ls
  routely notify add <webhook|discord|telegram> --name <name> [--url <url>] [--bot-token <token>] [--chat-id <id>]
  routely notify test <channel-id>
  routely notify disable <channel-id>
  routely doctor           Check local Routely prerequisites and port availability
  routely server init      Prepare production server foundation state and admin token
  routely server doctor    Check production server readiness
  routely add [path] --name <name> [--command <command>] [--driver <command|dockerfile>] [--port <port>] [--health-path <path>] [--preset <preset>]
  routely db add <type>    Register a local Compose database service

Defaults:
  Dashboard: http://localhost:3030
  Daemon:    http://127.0.0.1:9977`);
}

type DaemonResult<T> = { ok: true; data: T; status: number } | { ok: false; error: string; status: number };

type RoutelyDomainDto = {
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
};

type RoutelyDomainListResponse = {
  rootDomain: string | null;
  serverPublicIp: string | null;
  domains: RoutelyDomainDto[];
};

type RoutelyGithubRepositoryDto = {
  id: number;
  installationId: number | null;
  fullName: string;
  private: boolean;
  defaultBranch: string | null;
  connectedAppId: number | null;
  connectedAppName: string | null;
  selectedBranch: string | null;
  autoDeployEnabled: boolean;
};

type RoutelyGithubInstallationDto = {
  installationId: number;
  accountLogin: string;
  accountType: string | null;
  status: string;
};

type RoutelyGithubDeliveryDto = {
  deliveryId: string;
  event: string;
  status: string;
  appName: string | null;
  deploymentId: number | null;
  repo: string | null;
  branch: string | null;
  commitSha: string | null;
  message: string | null;
  receivedAt: string;
};

type RoutelyGithubStatusResponse = {
  github: {
    configured: boolean;
    appId: string | null;
    clientId: string | null;
    webhookSecretConfigured: boolean;
    privateKeyConfigured: boolean;
    installations: RoutelyGithubInstallationDto[];
    repositories: RoutelyGithubRepositoryDto[];
    deliveries: RoutelyGithubDeliveryDto[];
  };
};

type RoutelyAppEnvVarDto = {
  id: number;
  appId: number;
  key: string;
  value: string | null;
  displayValue: string;
  isSecret: boolean;
  scope: string;
  needsRestart: boolean;
  needsRedeploy: boolean;
};

type RoutelyAppEnvResponse = {
  app: RoutelyAppDtoLike;
  env: {
    vars: RoutelyAppEnvVarDto[];
    pending: { count: number; needsRestart: boolean; needsRedeploy: boolean };
  };
  envVar?: RoutelyAppEnvVarDto;
};

type RoutelyHealthcheckDto = {
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
};

type RoutelyMetricSampleDto = {
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

type RoutelyAppHealthResponse = {
  app: RoutelyAppDtoLike;
  latestDeployment: RoutelyDeploymentDto | null;
  health: { status: string; checks: RoutelyHealthcheckDto[] };
};

type RoutelyAppMetricsResponse = {
  app: RoutelyAppDtoLike;
  metrics: RoutelyMetricSampleDto[];
};

type RoutelyDatabaseDto = {
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
  volumeName: string | null;
  envKeys: string[];
};

type RoutelyBackupJobDto = {
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
};

type RoutelyBackupRunDto = {
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
  finishedAt: string | null;
  createdAt: string;
};

type RoutelyBackupsResponse = {
  jobs: RoutelyBackupJobDto[];
  runs: RoutelyBackupRunDto[];
  job?: RoutelyBackupJobDto;
  run?: RoutelyBackupRunDto;
};

type RoutelyNotificationChannelDto = {
  id: number;
  name: string;
  type: string;
  enabled: boolean;
  events: string[];
  target: string | null;
};

type RoutelyNotificationAttemptDto = {
  id: number;
  channelId: number | null;
  channelName: string | null;
  channelType: string | null;
  event: string;
  status: string;
  httpStatus: number | null;
  message: string | null;
  target: string | null;
  createdAt: string;
};

type RoutelyNotificationsResponse = {
  channels: RoutelyNotificationChannelDto[];
  attempts: RoutelyNotificationAttemptDto[];
  channel?: RoutelyNotificationChannelDto;
  attempt?: RoutelyNotificationAttemptDto;
};

async function daemonRequest<T>(path: string, init: RequestInit = {}): Promise<DaemonResult<T>> {
  const daemonUrl = process.env.ROUTELY_DAEMON_URL || `http://127.0.0.1:${process.env.ROUTELY_DAEMON_PORT || DEFAULT_DAEMON_PORT}`;
  const adminToken = process.env.ROUTELY_ADMIN_TOKEN;

  try {
    const headers = {
      ...(init.body == null ? {} : { "content-type": "application/json" }),
      ...(adminToken ? { authorization: `Bearer ${adminToken}` } : {}),
      ...(init.headers || {})
    };
    const response = await fetch(`${daemonUrl}${path}`, {
      ...init,
      headers
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) as T & { error?: string } : {} as T & { error?: string };

    if (!response.ok) {
      return { ok: false, status: response.status, error: data.error || `Daemon responded with HTTP ${response.status}` };
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 503, error: error instanceof Error ? error.message : "Could not reach the Routely daemon." };
  }
}

function logDir(): string {
  return resolve(workspaceRoot, ".routely", "logs");
}

function safeLogName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function logPathForApp(name: string): string {
  return resolve(logDir(), `${safeLogName(name)}.log`);
}

function ensureLogPath(appName: string): string {
  mkdirSync(logDir(), { recursive: true });
  return logPathForApp(appName);
}

function writeLogHeader(appName: string, event: string): void {
  const logPath = ensureLogPath(appName);
  appendFileSync(logPath, `\n[${new Date().toISOString()}] ${event}\n`, "utf8");
}

function attachForegroundLogs(child: ChildProcess, appName: string): void {
  const logPath = ensureLogPath(appName);
  const logStream = createWriteStream(logPath, { flags: "a" });

  child.stdout?.on("data", (chunk: Buffer) => {
    process.stdout.write(chunk);
    logStream.write(chunk);
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(chunk);
    logStream.write(chunk);
  });

  child.on("close", () => logStream.end());
}

function startLoggedCommandApp(app: RoutelyAppRecord, mode: "foreground" | "detached" = "foreground"): ChildProcess {
  writeLogHeader(app.name, `starting ${app.command || "command"}`);
  const env = runtimeEnvForApp(app, "local");

  if (mode === "foreground") {
    const child = startCommandApp(app, { stdio: ["ignore", "pipe", "pipe"], env });
    attachForegroundLogs(child, app.name);
    return child;
  }

  const logPath = ensureLogPath(app.name);
  const fd = openSync(logPath, "a");
  const child = startCommandApp(app, { stdio: ["ignore", fd, fd], env });
  child.unref();
  closeSync(fd);
  return child;
}

function runtimeEnvForApp(app: RoutelyAppRecord, scope: "local" | "production" | "all"): Record<string, string> {
  const { db } = initializeRoutely(workspaceRoot);
  const env = mergeAppEnv(app.env || {}, listAppEnvVars(db, app.id), { scope });
  db.close();
  return env;
}

function stopPid(pid: number): void {
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
      // Treat missing processes as already stopped; DB reconciliation will follow.
    }
  }
}

function killPid(pid: number): void {
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

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function stopManagedPid(pid: number, timeoutMs = 1500): Promise<"stopped" | "missing" | "killed"> {
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

function reconcileRuntimeState(db: RoutelyDb): void {
  const stale = reconcileStaleRuntimeInstances(db, isPidAlive);
  for (const instance of stale) {
    if (instance.pid) {
      writeLogHeader(instance.app_name, `reconciled stale pid ${instance.pid}`);
    }
  }
}

/**
 * Load routely.yml (if present) and sync its apps/services into the registry.
 * Returns the number of synced entries, or null when no config file exists.
 * Parse/validation errors are reported but never abort the caller.
 */
function syncConfig(db: RoutelyDb): number | null {
  try {
    const loaded = loadWorkspaceConfig(workspaceRoot);

    if (!loaded) {
      return null;
    }

    const synced = syncWorkspaceConfig(db, loaded);
    return synced.length;
  } catch (error) {
    console.error(`Could not load routely.yml: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function ensureStarterConfig(): string {
  const configPath = resolve(workspaceRoot, "routely.yml");

  if (!existsSync(configPath)) {
    writeFileSync(
      configPath,
      `version: 1\nname: routely-local\n\ndashboard:\n  port: 3030\n\napps: []\nservices: []\n`,
      "utf8"
    );
  }

  return configPath;
}

function initCommand(): void {
  const { db, databasePath } = initializeRoutely(workspaceRoot);
  const configPath = ensureStarterConfig();
  const synced = syncConfig(db);

  console.log("Routely initialized.");
  console.log(`Workspace: ${workspaceRoot}`);
  console.log(`Database:  ${databasePath}`);
  console.log(`Config:    ${configPath}`);
  if (synced !== null) {
    console.log(`Synced:    ${synced} app(s) from routely.yml`);
  }
  db.close();
}

function syncCommand(): void {
  const { db } = initializeRoutely(workspaceRoot);
  const synced = syncConfig(db);
  reconcileRuntimeState(db);

  if (synced === null) {
    console.log("No routely.yml found. Run `routely init` to create one.");
  } else {
    console.log(`Synced ${synced} app(s) from routely.yml.`);
    for (const app of listApps(db).map(appToPublicDto)) {
      const port = app.port ? `:${app.port}` : "-";
      console.log(`  ${app.name}\t${app.driver}\t${port}\t${app.path || "-"}`);
    }
  }

  db.close();
}

function psCommand(): void {
  const { db, databasePath } = initializeRoutely(workspaceRoot);
  reconcileRuntimeState(db);
  const apps = listApps(db).map(appToPublicDto);

  console.log(`Database: ${databasePath}`);

  if (apps.length === 0) {
    console.log("No apps registered yet.");
    db.close();
    return;
  }

  for (const app of apps) {
    const port = app.port ? `:${app.port}` : "-";
    const enabled = app.enabled ? "enabled" : "disabled";
    console.log(`${app.name}\t${app.status}\t${app.driver}\t${port}\t${enabled}\t${app.path || "-"}`);
  }

  db.close();
}

function addCommand(args: string[]): void {
  const { positionals, flags } = parseFlags(args);
  const appPath = String(flags.path || positionals[0] || invocationCwd);
  const resolvedPath = resolve(invocationCwd, appPath);
  const detected = detectPreset(resolvedPath);
  const explicitPreset = (typeof flags.preset === "string" ? getAppPreset(flags.preset) || { preset: flags.preset } : detected) as Record<string, unknown>;
  const inferredName = resolvedPath.split(/[\\/]/).filter(Boolean).at(-1) || "app";
  const name = String(flags.name || positionals[1] || inferredName).trim();
  const appCommand = String(flags.command || flags.dev || explicitPreset.dev || "").trim();
  const requestedDriver = typeof flags.driver === "string" ? String(flags.driver).trim().toLowerCase() : null;
  const hasDockerfile = existsSync(resolve(resolvedPath, "Dockerfile"));
  const driver = requestedDriver || (!appCommand && hasDockerfile ? "dockerfile" : "command");

  if (driver !== "command" && driver !== "dockerfile") {
    console.error(`Unsupported add driver: ${driver}. Use command or dockerfile.`);
    process.exit(1);
  }

  if (!name || (driver === "command" && !appCommand)) {
    console.error("Usage: routely add [path] --name <name> [--command <command>] [--driver <command|dockerfile>] [--port <port>] [--health-path <path>] [--preset <preset>]");
    if (!appCommand && hasDockerfile) {
      console.error("This path contains a Dockerfile. Use --driver dockerfile to register it for production deploys.");
    }
    process.exit(1);
  }

  const { db } = initializeRoutely(workspaceRoot);
  const payload: RoutelyAppInput = {
    name,
    type: "app",
    preset: stringPresetValue(explicitPreset.preset, "custom") || "custom",
    driver: driver as RoutelyAppInput["driver"],
    path: resolvedPath,
    command: driver === "command" ? appCommand : null,
    install: stringPresetValue(explicitPreset.install),
    dev: driver === "command" ? appCommand : null,
    build: stringPresetValue(explicitPreset.build),
    start: stringPresetValue(explicitPreset.start),
    port: typeof flags.port === "string" ? flags.port : numberPresetValue(explicitPreset.port),
    healthcheck: typeof flags["health-path"] === "string"
      ? { path: flags["health-path"], expected_status: typeof flags["health-status"] === "string" ? flags["health-status"] : 200 }
      : objectPresetValue(explicitPreset.healthcheck),
    enabled: true,
    status: "stopped"
  };
  const saved = upsertApp(db, payload);
  const configWrite = upsertWorkspaceConfigEntry(workspaceRoot, payload, "apps");

  console.log(`Registered ${saved.name}.`);
  console.log(`Preset:  ${saved.preset}`);
  console.log(`Driver:  ${saved.driver}`);
  console.log(`Path:    ${saved.path}`);
  if (saved.command) {
    console.log(`Command: ${saved.command}`);
  }
  if (saved.port) {
    console.log(`Port:    ${saved.port}`);
  }
  if (saved.healthcheck?.path) {
    console.log(`Health:  ${saved.healthcheck.path}`);
  }
  console.log(`Config:  ${configWrite.configPath}`);
  db.close();
}

function stringPresetValue(value: unknown, fallback: string | null = null): string | null {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberPresetValue(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function objectPresetValue(value: unknown): RoutelyAppInput["healthcheck"] {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RoutelyAppInput["healthcheck"] : null;
}

async function dbCommand(args: string[]): Promise<void> {
  const subcommand = args[0];
  if (subcommand === "ls" || subcommand === "list") {
    const result = await daemonRequest<{ databases: RoutelyDatabaseDto[] }>("/databases");
    if (!result.ok) {
      console.error(`Could not list databases: ${result.error}`);
      process.exit(1);
    }
    if (result.data.databases.length === 0) {
      console.log("No production databases registered yet.");
      return;
    }
    for (const database of result.data.databases) {
      console.log(`${database.name}\t${database.type}\t${database.status}\t${database.internal ? "internal" : "public"}\t${database.image || "-"}\t${database.port ? `:${database.port}` : "-"}`);
    }
    return;
  }

  if (subcommand !== "add") {
    console.error("Usage: routely db <add|ls> ...");
    process.exit(1);
  }

  const { positionals, flags } = parseFlags(args.slice(1));
  const type = String(positionals[0] || "").trim();
  if (!type) {
    console.error("Usage: routely db add <postgres|mysql|mariadb|redis|mongodb> [--name <name>] [--port <port>]");
    process.exit(1);
  }

  const payload = createDatabaseService(type, {
    name: typeof flags.name === "string" ? flags.name : undefined,
    port: typeof flags.port === "string" ? flags.port : undefined
  }) as unknown as RoutelyAppInput;
  const { db } = initializeRoutely(workspaceRoot);
  const saved = upsertApp(db, payload);
  const configWrite = upsertWorkspaceConfigEntry(workspaceRoot, payload, "services");

  console.log(`Registered ${saved.name}.`);
  console.log(`Type:    ${saved.preset}`);
  console.log(`Driver:  ${saved.driver}`);
  console.log(`Image:   ${saved.image}`);
  console.log(`Port:    ${saved.port}`);
  console.log(`Config:  ${configWrite.configPath}`);
  db.close();
}

async function backupCommand(args: string[]): Promise<void> {
  const subcommand = String(args[0] || "ls").trim();

  if (subcommand === "ls" || subcommand === "list") {
    const result = await daemonRequest<RoutelyBackupsResponse>("/backups");
    if (!result.ok) {
      console.error(`Could not list backups: ${result.error}`);
      process.exit(1);
    }
    if (result.data.jobs.length === 0) console.log("No backup jobs configured yet.");
    for (const job of result.data.jobs) {
      console.log(`job:${job.id}\t${job.databaseName || job.databaseId}\t${job.enabled ? "enabled" : "disabled"}\t${job.schedule || "manual"}\tretention:${job.retentionDays}d\tlast:${job.lastRunStatus || "never"}`);
    }
    for (const run of result.data.runs.slice(0, 10)) {
      console.log(`run:${run.id}\t${run.databaseName || run.databaseId}\t${run.status}\t${run.trigger}\t${run.filePath || run.message || "-"}`);
    }
    return;
  }

  if (!["enable", "disable", "run"].includes(subcommand)) {
    console.error("Usage: routely backup <enable|disable|run|ls> <database> [--schedule <cron>] [--retention-days <days>]");
    process.exit(1);
  }

  const { positionals, flags } = parseFlags(args.slice(1));
  const database = String(positionals[0] || "").trim();
  if (!database) {
    console.error(`Usage: routely backup ${subcommand} <database>`);
    process.exit(1);
  }

  if (subcommand === "enable") {
    const result = await daemonRequest<RoutelyBackupsResponse>("/backups", {
      method: "POST",
      body: JSON.stringify({
        database,
        enabled: true,
        schedule: typeof flags.schedule === "string" ? flags.schedule : "0 2 * * *",
        retentionDays: typeof flags["retention-days"] === "string" ? Number(flags["retention-days"]) : 7
      })
    });
    if (!result.ok) {
      console.error(`Could not enable backup: ${result.error}`);
      process.exit(1);
    }
    console.log(`Enabled backups for ${result.data.job?.databaseName || database}.`);
    console.log(`Schedule: ${result.data.job?.schedule || "manual"}`);
    return;
  }

  const jobsResult = await daemonRequest<RoutelyBackupsResponse>("/backups");
  if (!jobsResult.ok) {
    console.error(`Could not read backup jobs: ${jobsResult.error}`);
    process.exit(1);
  }
  const job = jobsResult.data.jobs.find((item) => item.databaseName === database || String(item.databaseId) === database || String(item.id) === database);
  if (!job) {
    console.error(`Backup job not found for ${database}. Run routely backup enable ${database} first.`);
    process.exit(1);
  }

  if (subcommand === "disable") {
    const result = await daemonRequest<RoutelyBackupsResponse>(`/backups/${job.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: false })
    });
    if (!result.ok) {
      console.error(`Could not disable backup: ${result.error}`);
      process.exit(1);
    }
    console.log(`Disabled backups for ${job.databaseName || database}.`);
    return;
  }

  const result = await daemonRequest<RoutelyBackupsResponse>(`/backups/${job.id}/run`, {
    method: "POST",
    body: JSON.stringify({ trigger: "manual" })
  });
  if (!result.ok) {
    console.error(`Backup failed: ${result.error}`);
    process.exit(1);
  }
  console.log(`Backup ${result.data.run?.status}: ${result.data.run?.filePath || result.data.run?.message || "no file"}`);
}

async function notifyCommand(args: string[]): Promise<void> {
  const subcommand = String(args[0] || "ls").trim();

  if (subcommand === "ls" || subcommand === "list") {
    const result = await daemonRequest<RoutelyNotificationsResponse>("/notifications");
    if (!result.ok) {
      console.error(`Could not list notifications: ${result.error}`);
      process.exit(1);
    }
    if (result.data.channels.length === 0) console.log("No notification channels configured yet.");
    for (const channel of result.data.channels) {
      console.log(`channel:${channel.id}\t${channel.name}\t${channel.type}\t${channel.enabled ? "enabled" : "disabled"}\t${channel.events.join(",")}\t${channel.target || "-"}`);
    }
    for (const attempt of result.data.attempts.slice(0, 10)) {
      console.log(`attempt:${attempt.id}\t${attempt.channelName || attempt.channelId || "deleted"}\t${attempt.event}\t${attempt.status}\t${attempt.httpStatus || "-"}\t${attempt.message || "-"}`);
    }
    return;
  }

  if (subcommand === "add") {
    const { positionals, flags } = parseFlags(args.slice(1));
    const type = String(positionals[0] || "").trim();
    const name = String(flags.name || type).trim();
    const events = typeof flags.events === "string" ? flags.events.split(",").map((item) => item.trim()).filter(Boolean) : undefined;
    if (!type || !name) {
      console.error("Usage: routely notify add <webhook|discord|telegram> --name <name> [--url <url>] [--bot-token <token>] [--chat-id <id>]");
      process.exit(1);
    }
    const result = await daemonRequest<RoutelyNotificationsResponse>("/notifications", {
      method: "POST",
      body: JSON.stringify({
        type,
        name,
        events,
        url: typeof flags.url === "string" ? flags.url : undefined,
        botToken: typeof flags["bot-token"] === "string" ? flags["bot-token"] : undefined,
        chatId: typeof flags["chat-id"] === "string" ? flags["chat-id"] : undefined
      })
    });
    if (!result.ok) {
      console.error(`Could not add notification channel: ${result.error}`);
      process.exit(1);
    }
    console.log(`Added notification channel ${result.data.channel?.name || name}.`);
    console.log(`Target: ${result.data.channel?.target || "[redacted]"}`);
    return;
  }

  const id = Number(args[1]);
  if (!Number.isInteger(id)) {
    console.error("Usage: routely notify <test|disable> <channel-id>");
    process.exit(1);
  }

  if (subcommand === "test") {
    const result = await daemonRequest<RoutelyNotificationsResponse>(`/notifications/${id}/test`, { method: "POST", body: JSON.stringify({}) });
    if (!result.ok) {
      console.error(`Notification test failed: ${result.error}`);
      process.exit(1);
    }
    console.log(`Notification test ${result.data.attempt?.status}: ${result.data.attempt?.message || "sent"}`);
    return;
  }

  if (subcommand === "disable") {
    const result = await daemonRequest<RoutelyNotificationsResponse>(`/notifications/${id}`, { method: "PATCH", body: JSON.stringify({ enabled: false }) });
    if (!result.ok) {
      console.error(`Could not disable notification channel: ${result.error}`);
      process.exit(1);
    }
    console.log(`Disabled notification channel ${result.data.channel?.name || id}.`);
    return;
  }

  console.error("Usage: routely notify <ls|add|test|disable> ...");
  process.exit(1);
}

function stopProcess(child: ChildProcess): void {
  if (!child.pid) {
    return;
  }

  stopPid(child.pid);
}

async function preflightPorts(apps: RoutelyAppRecord[], includeSystemPorts = true, options: { skipDashboard?: boolean } = {}): Promise<boolean> {
  const dashboardPort = Number(process.env.ROUTELY_DASHBOARD_PORT || DEFAULT_DASHBOARD_PORT);
  const daemonPort = Number(process.env.ROUTELY_DAEMON_PORT || DEFAULT_DAEMON_PORT);
  const systemPorts = includeSystemPorts
    ? [
        ...(options.skipDashboard ? [] : [{ name: "dashboard", port: dashboardPort }]),
        { name: "daemon", port: daemonPort }
      ]
    : [];
  const unavailable = await findUnavailablePorts([...systemPorts, ...apps.map((app) => ({ name: app.name, port: app.port }))]);

  if (unavailable.length === 0) {
    return true;
  }

  console.error("Port conflict detected. Stop the existing process or change the configured port:");
  for (const item of unavailable) {
    console.error(`  ${item.name}: ${item.port}`);
  }
  return false;
}

async function upCommand(): Promise<void> {
  const { db } = initializeRoutely(workspaceRoot);
  syncConfig(db);
  reconcileRuntimeState(db);
  const dashboardPort = process.env.ROUTELY_DASHBOARD_PORT || String(DEFAULT_DASHBOARD_PORT);
  const daemonPort = process.env.ROUTELY_DAEMON_PORT || String(DEFAULT_DAEMON_PORT);
  const existingDashboardUrl = await findExistingRoutelyDashboard([Number(dashboardPort), DEFAULT_DASHBOARD_PORT]);
  let apps: RoutelyAppRecord[];
  const runningApps: RunningApp[] = [];
  let shuttingDown = false;

  try {
    apps = sortByDependencies(listApps(db).filter((app) => app.enabled && ["command", "compose"].includes(app.driver)));
  } catch (error) {
    if (error instanceof DependencyCycleError) {
      console.error(error.message);
    } else {
      console.error(`Could not resolve app dependencies: ${error instanceof Error ? error.message : String(error)}`);
    }
    db.close();
    process.exit(1);
  }

  if (!(await preflightPorts(apps, true, { skipDashboard: Boolean(existingDashboardUrl) }))) {
    db.close();
    process.exit(1);
  }

  console.log("Routely starting...");
  console.log(`Workspace: ${workspaceRoot}`);
  console.log(`Dashboard: ${existingDashboardUrl || `http://localhost:${dashboardPort}`}`);
  console.log(`Daemon:    http://127.0.0.1:${daemonPort}`);
  console.log(`Apps:      ${apps.length === 0 ? "none registered yet" : `${apps.length} local resource(s)`}`);
  console.log("");

  const daemon = run("daemon", "npm", ["run", "dev", "--workspace", "apps/daemon"], {
    ROUTELY_DAEMON_PORT: daemonPort
  });
  const web = existingDashboardUrl
    ? null
    : run("dashboard", "npm", ["run", "dev", "--workspace", "apps/web"], {
        PORT: dashboardPort,
        ROUTELY_DAEMON_URL: process.env.ROUTELY_DAEMON_URL || `http://127.0.0.1:${daemonPort}`
      });
  if (existingDashboardUrl) {
    console.log(`Dashboard already running at ${existingDashboardUrl}; reusing it for this workspace.`);
  }

  for (const app of apps) {
    try {
      updateAppStatus(db, app.id, "starting");
      if (app.driver === "compose") {
        writeLogHeader(app.name, `starting compose service ${app.image || app.name}`);
        const child = startComposeService(app, workspaceRoot, { stdio: ["ignore", "pipe", "pipe"] });
        attachForegroundLogs(child, app.name);
        await waitForChild(child);
        updateAppStatus(db, app.id, "running");
        continue;
      }
      const child = startLoggedCommandApp(app);
      runningApps.push({ app, child });

      if (child.pid) {
        recordRuntimeStart(db, app.id, child.pid);
      }
      clearAppEnvPendingFlags(db, app.id, { restart: true });

      child.on("exit", (code) => {
        const status = shuttingDown || code === 0 ? "stopped" : "crashed";
        recordRuntimeStop(db, app.id, child.pid || 0, code, status);
        if (!shuttingDown && code && code !== 0) {
          console.error(`${app.name} exited with code ${code}`);
        }
      });
    } catch (error) {
      updateAppStatus(db, app.id, "crashed");
      console.error(`Failed to start ${app.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function shutdown(): void {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.log("\nRoutely stopping...");

    for (const { app, child } of runningApps) {
      stopProcess(child);
      if (child.pid) {
        recordRuntimeStop(db, app.id, child.pid, null, "stopped");
      }
    }

    daemon.kill("SIGTERM");
    web?.kill("SIGTERM");

    setTimeout(() => {
      db.close();
      process.exit(0);
    }, 500);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function waitForChild(child: ChildProcess): Promise<void> {
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

async function downCommand(): Promise<void> {
  const { db } = initializeRoutely(workspaceRoot);
  reconcileRuntimeState(db);
  const composeApps = listApps(db).filter((app) => app.driver === "compose" && app.status === "running");
  for (const app of composeApps) {
    writeLogHeader(app.name, "stopping compose service");
    await waitForChild(stopComposeService(app, workspaceRoot, { stdio: ["ignore", "pipe", "pipe"] }));
    updateAppStatus(db, app.id, "stopped");
    console.log(`Stopped ${app.name}.`);
  }

  const instances = listRunningRuntimeInstances(db);

  if (instances.length === 0 && composeApps.length === 0) {
    console.log("No running managed app processes found.");
    db.close();
    return;
  }

  for (const instance of instances) {
    if (instance.pid) {
      const result = await stopManagedPid(instance.pid);
      recordRuntimeStop(db, instance.app_id, instance.pid, null, "stopped");
      writeLogHeader(instance.app_name, `${result} pid ${instance.pid}`);
      console.log(`${result === "killed" ? "Killed" : "Stopped"} ${instance.app_name} (${instance.pid}).`);
    }
  }

  db.close();
}

function logsCommand(args: string[]): void {
  const { positionals, flags } = parseFlags(args);
  const appName = String(positionals[0] || "").trim();

  if (!appName) {
    console.error("Usage: routely logs [app] [--follow]");
    process.exit(1);
  }

  const logPath = ensureLogPath(appName);

  if (existsSync(logPath)) {
    process.stdout.write(readFileSync(logPath));
  }

  if (!flags.follow && !flags.f) {
    return;
  }

  let offset = existsSync(logPath) ? statSync(logPath).size : 0;
  console.log(`\nFollowing ${logPath}. Press Ctrl+C to stop.`);

  watchFile(logPath, { interval: 500 }, () => {
    const data = readFileSync(logPath);
    if (data.length > offset) {
      process.stdout.write(data.subarray(offset));
      offset = data.length;
    }
  });

  process.on("SIGINT", () => {
    unwatchFile(logPath);
    process.exit(0);
  });
}

async function restartCommand(args: string[]): Promise<void> {
  const appName = String(args[0] || "").trim();

  if (!appName) {
    console.error("Usage: routely restart [app]");
    process.exit(1);
  }

  const { db } = initializeRoutely(workspaceRoot);
  reconcileRuntimeState(db);
  const app = getAppByName(db, appName);

  if (!app) {
    console.error(`App not found: ${appName}`);
    db.close();
    process.exit(1);
  }

  if (app.driver !== "command") {
    console.error(`Restart currently supports command apps only. ${app.name} uses ${app.driver}.`);
    db.close();
    process.exit(1);
  }

  const instances = listRunningRuntimeInstances(db).filter((instance) => instance.app_id === app.id);
  for (const instance of instances) {
    if (instance.pid) {
      const result = await stopManagedPid(instance.pid);
      recordRuntimeStop(db, instance.app_id, instance.pid, null, "stopped");
      writeLogHeader(instance.app_name, `${result} pid ${instance.pid} for restart`);
    }
  }

  if (!(await preflightPorts([app], false))) {
    db.close();
    process.exit(1);
  }

  updateAppStatus(db, app.id, "starting");
  const child = startLoggedCommandApp(app, "detached");
  if (child.pid) {
    recordRuntimeStart(db, app.id, child.pid);
  }
  clearAppEnvPendingFlags(db, app.id, { restart: true });

  console.log(`Restarted ${app.name}${child.pid ? ` (${child.pid})` : ""}.`);
  db.close();
}

async function envCommand(args: string[]): Promise<void> {
  const appName = String(args[0] || "").trim();
  const subcommand = String(args[1] || "list").trim();

  if (!appName || !["list", "ls", "set", "unset", "rm"].includes(subcommand)) {
    console.error("Usage: routely env <app> <list|set|unset> [KEY=value|KEY] [--secret] [--scope all|local|production]");
    process.exit(1);
  }

  const { db } = initializeRoutely(workspaceRoot);
  syncConfig(db);
  const app = getAppByName(db, appName);
  db.close();
  if (!app) {
    console.error(`App not found: ${appName}`);
    process.exit(1);
  }

  if (subcommand === "list" || subcommand === "ls") {
    const result = await daemonRequest<RoutelyAppEnvResponse>(`/apps/${app.id}/env`);
    if (!result.ok) {
      console.error(`Could not list env vars: ${result.error}`);
      process.exit(1);
    }
    const rows = result.data.env.vars;
    if (rows.length === 0) {
      console.log(`No stored env vars for ${app.name}.`);
      return;
    }
    for (const row of rows) {
      const flags = [row.isSecret ? "secret" : "plain", `scope:${row.scope}`];
      if (row.needsRestart) flags.push("restart-needed");
      if (row.needsRedeploy) flags.push("redeploy-needed");
      console.log(`${row.key}=${row.displayValue}\t${flags.join("\t")}`);
    }
    return;
  }

  if (subcommand === "set") {
    const { positionals, flags } = parseFlags(args.slice(2));
    const assignment = String(positionals[0] || "");
    const separator = assignment.indexOf("=");
    if (separator <= 0) {
      console.error("Usage: routely env <app> set KEY=value [--secret] [--scope all|local|production]");
      process.exit(1);
    }
    const result = await daemonRequest<RoutelyAppEnvResponse>(`/apps/${app.id}/env`, {
      method: "POST",
      body: JSON.stringify({
        key: assignment.slice(0, separator),
        value: assignment.slice(separator + 1),
        isSecret: Boolean(flags.secret),
        scope: typeof flags.scope === "string" ? flags.scope : "all"
      })
    });
    if (!result.ok) {
      console.error(`Could not set env var: ${result.error}`);
      process.exit(1);
    }
    const saved = result.data.envVar;
    console.log(`Set ${saved?.key || assignment.slice(0, separator)} for ${app.name}.`);
    console.log(`Visibility: ${saved?.isSecret ? "secret" : "plain"}`);
    console.log("State: restart-needed, redeploy-needed");
    return;
  }

  const key = String(args[2] || "").trim();
  if (!key) {
    console.error("Usage: routely env <app> unset KEY");
    process.exit(1);
  }
  const result = await daemonRequest<RoutelyAppEnvResponse>(`/apps/${app.id}/env/${encodeURIComponent(key)}`, {
    method: "DELETE"
  });
  if (!result.ok) {
    console.error(`Could not unset env var: ${result.error}`);
    process.exit(1);
  }
  console.log(`Unset ${key} for ${app.name}.`);
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

async function healthCommand(args: string[]): Promise<void> {
  const appName = String(args[0] || "").trim();

  if (!appName) {
    console.error("Usage: routely health <app>");
    process.exit(1);
  }

  const { db } = initializeRoutely(workspaceRoot);
  syncConfig(db);
  const app = getAppByName(db, appName);
  db.close();
  if (!app) {
    console.error(`App not found: ${appName}`);
    process.exit(1);
  }

  const [healthResult, metricsResult] = await Promise.all([
    daemonRequest<RoutelyAppHealthResponse>(`/apps/${app.id}/health`),
    daemonRequest<RoutelyAppMetricsResponse>(`/apps/${app.id}/metrics`)
  ]);

  if (!healthResult.ok) {
    console.error(`Could not read health: ${healthResult.error}`);
    process.exit(1);
  }

  console.log(`${healthResult.data.app.name}\t${healthResult.data.health.status}`);
  if (healthResult.data.latestDeployment) {
    const deployment = healthResult.data.latestDeployment;
    console.log(`Latest deploy: #${deployment.id}\t${deployment.status}\t${deployment.phase}`);
  }
  for (const check of healthResult.data.health.checks) {
    const timing = check.responseTimeMs == null ? "" : `\t${check.responseTimeMs}ms`;
    const http = check.httpStatus == null ? "" : `\tHTTP ${check.httpStatus}`;
    console.log(`Health ${check.target}: ${check.status}${http}${timing}\t${check.message || "-"}`);
  }

  if (!metricsResult.ok) {
    console.error(`Could not read metrics: ${metricsResult.error}`);
    return;
  }

  for (const sample of metricsResult.data.metrics.slice(0, 3)) {
    const cpu = sample.cpuPercent == null ? "-" : `${sample.cpuPercent.toFixed(1)}%`;
    const mem = `${formatBytes(sample.memoryBytes)}/${formatBytes(sample.memoryLimitBytes)}`;
    const disk = sample.diskTotalBytes == null ? "-" : `${formatBytes(sample.diskUsedBytes)}/${formatBytes(sample.diskTotalBytes)}`;
    console.log(`Metric ${sample.scope}: cpu ${cpu}\tmem ${mem}\tdisk ${disk}\t${sample.message || sample.sampledAt}`);
  }
}

async function deployCommand(args: string[]): Promise<void> {
  const { positionals, flags } = parseFlags(args);
  const appName = String(positionals[0] || "").trim();

  if (!appName) {
    console.error("Usage: routely deploy <app> [--watch]");
    process.exit(1);
  }

  const { db } = initializeRoutely(workspaceRoot);
  syncConfig(db);
  const app = getAppByName(db, appName);
  db.close();

  if (!app) {
    console.error(`App not found: ${appName}`);
    process.exit(1);
  }

  const result = await daemonRequest<{ deployment: RoutelyDeploymentDto }>(`/apps/${app.id}/deployments`, {
    method: "POST"
  });

  if (!result.ok) {
    console.error(`Deploy failed to start: ${result.error}`);
    process.exit(1);
  }

  const deployment = result.data.deployment;
  console.log(`Queued deployment ${deployment.id} for ${app.name}.`);
  console.log(`Status: ${deployment.status}`);

  if (flags.watch || flags.w) {
    await watchDeployment(deployment.id);
  }
}

async function watchDeployment(deploymentId: number): Promise<void> {
  let afterSequence = 0;
  let lastStatus = "queued";

  console.log(`Watching deployment ${deploymentId}. Press Ctrl+C to stop.`);
  while (true) {
    const result = await daemonRequest<{ deployment: RoutelyDeploymentDto; logs: RoutelyDeploymentLogDto[] }>(`/deployments/${deploymentId}/logs?after=${afterSequence}`);

    if (!result.ok) {
      console.error(result.error);
      process.exit(1);
    }

    for (const log of result.data.logs || []) {
      process.stdout.write(log.message.endsWith("\n") ? log.message : `${log.message}\n`);
      afterSequence = Math.max(afterSequence, log.sequence);
    }

    const status = result.data.deployment.status;
    if (status !== lastStatus) {
      console.log(`Deployment status: ${status}`);
      lastStatus = status;
    }

    if (status === "succeeded") {
      const url = result.data.deployment.hostPort ? `http://127.0.0.1:${result.data.deployment.hostPort}` : "temporary port unavailable";
      console.log(`Deployment succeeded: ${url}`);
      return;
    }

    if (status === "failed") {
      console.error(`Deployment failed: ${result.data.deployment.errorMessage || "unknown error"}`);
      process.exit(1);
    }

    await sleep(1000);
  }
}

async function domainCommand(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (subcommand === "root") {
    const domain = String(args[1] || "").trim();
    if (!domain) {
      console.error("Usage: routely domain root <domain>");
      process.exit(1);
    }
    const result = await daemonRequest<{ rootDomain: string; instructions: { records: Array<{ type: string; name: string; value: string }>; examples: string[] } }>("/domains/root", {
      method: "POST",
      body: JSON.stringify({ domain: validateHostnameForCli(domain, { allowWildcard: false }) })
    });
    if (!result.ok) {
      console.error(`Could not set root domain: ${result.error}`);
      process.exit(1);
    }
    console.log(`Root domain: ${result.data.rootDomain}`);
    console.log("DNS records:");
    for (const record of result.data.instructions.records) {
      console.log(`  ${record.type}\t${record.name}\t${record.value}`);
    }
    console.log(`Examples: ${result.data.instructions.examples.join(", ")}`);
    return;
  }

  if (subcommand === "add") {
    const appName = String(args[1] || "").trim();
    const hostname = String(args[2] || "").trim();
    if (!appName || !hostname) {
      console.error("Usage: routely domain add <app> <hostname>");
      process.exit(1);
    }
    const result = await daemonRequest<{ domain: RoutelyDomainDto }>("/domains", {
      method: "POST",
      body: JSON.stringify({ appName, hostname: validateHostnameForCli(hostname) })
    });
    if (!result.ok) {
      console.error(`Could not add domain: ${result.error}`);
      process.exit(1);
    }
    console.log(`Added ${result.data.domain.hostname} -> ${result.data.domain.appName || appName}`);
    console.log(`Status: ${result.data.domain.status} / DNS ${result.data.domain.dnsStatus} / TLS ${result.data.domain.tlsStatus}`);
    if (result.data.domain.verificationMessage) {
      console.log(result.data.domain.verificationMessage);
    }
    return;
  }

  if (subcommand === "verify") {
    const hostname = String(args[1] || "").trim();
    if (!hostname) {
      console.error("Usage: routely domain verify <hostname>");
      process.exit(1);
    }
    const encoded = encodeURIComponent(validateHostnameForCli(hostname));
    const result = await daemonRequest<{ domain: RoutelyDomainDto; verification: { ok: boolean; message: string; addresses: string[]; expected: string } }>(`/domains/${encoded}/verify`, {
      method: "POST"
    });
    if (!result.ok) {
      console.error(`Could not verify domain: ${result.error}`);
      process.exit(1);
    }
    console.log(`${result.data.verification.ok ? "OK" : "CHECK"} ${result.data.domain.hostname}`);
    console.log(result.data.verification.message);
    console.log(`Status: ${result.data.domain.status} / DNS ${result.data.domain.dnsStatus} / TLS ${result.data.domain.tlsStatus}`);
    return;
  }

  if (subcommand === "ls" || subcommand === "list") {
    const result = await daemonRequest<RoutelyDomainListResponse>("/domains");
    if (!result.ok) {
      console.error(`Could not list domains: ${result.error}`);
      process.exit(1);
    }
    console.log(`Root: ${result.data.rootDomain || "not set"}`);
    console.log(`Server IP: ${result.data.serverPublicIp || "not set"}`);
    if (result.data.domains.length === 0) {
      console.log("No domains registered yet.");
      return;
    }
    for (const domain of result.data.domains) {
      console.log(`${domain.hostname}\t${domain.appName || domain.appId}\t${domain.status}\tdns:${domain.dnsStatus}\ttls:${domain.tlsStatus}\t${domain.targetPort ? `:${domain.targetPort}` : "-"}`);
    }
    return;
  }

  console.error("Usage: routely domain <root|add|verify|ls> ...");
  process.exit(1);
}

async function githubCommand(args: string[]): Promise<void> {
  const subcommand = args[0] || "status";

  if (subcommand === "status") {
    const result = await daemonRequest<RoutelyGithubStatusResponse>("/github/status");
    if (!result.ok) {
      console.error(`Could not read GitHub status: ${result.error}`);
      process.exit(1);
    }
    const github = result.data.github;
    console.log(`GitHub App: ${github.configured ? "configured" : "not configured"}`);
    console.log(`App ID: ${github.appId || "-"}`);
    console.log(`Webhook secret: ${github.webhookSecretConfigured ? "configured" : "missing"}`);
    console.log(`Private key: ${github.privateKeyConfigured ? "configured" : "missing"}`);
    console.log(`Installations: ${github.installations.length}`);
    for (const installation of github.installations) {
      console.log(`  ${installation.installationId}\t${installation.accountLogin}\t${installation.status}`);
    }
    console.log(`Repositories: ${github.repositories.length}`);
    for (const repo of github.repositories) {
      const branch = repo.selectedBranch || repo.defaultBranch || "-";
      const app = repo.connectedAppName || repo.connectedAppId || "-";
      console.log(`  ${repo.fullName}\tbranch:${branch}\tapp:${app}\tauto:${repo.autoDeployEnabled ? "on" : "off"}`);
    }
    if (github.deliveries.length > 0) {
      console.log("Recent deliveries:");
      for (const delivery of github.deliveries.slice(0, 5)) {
        console.log(`  ${delivery.deliveryId}\t${delivery.event}\t${delivery.status}\t${delivery.repo || "-"}:${delivery.branch || "-"}\t${delivery.deploymentId ? `deploy:${delivery.deploymentId}` : delivery.message || "-"}`);
      }
    }
    return;
  }

  if (subcommand === "repo" && args[1] === "add") {
    const { positionals, flags } = parseFlags(args.slice(2));
    const fullName = String(positionals[0] || "").trim();
    if (!fullName || !fullName.includes("/")) {
      console.error("Usage: routely github repo add <owner/repo> [--branch <branch>] [--installation-id <id>]");
      process.exit(1);
    }
    const result = await daemonRequest<{ repository: RoutelyGithubRepositoryDto }>("/github/repos", {
      method: "POST",
      body: JSON.stringify({
        fullName,
        defaultBranch: typeof flags.branch === "string" ? flags.branch : undefined,
        installationId: typeof flags["installation-id"] === "string" ? Number(flags["installation-id"]) : undefined
      })
    });
    if (!result.ok) {
      console.error(`Could not add GitHub repository: ${result.error}`);
      process.exit(1);
    }
    console.log(`Registered ${result.data.repository.fullName}.`);
    console.log(`Default branch: ${result.data.repository.defaultBranch || "not set"}`);
    return;
  }

  if (subcommand === "installation" && args[1] === "add") {
    const { positionals, flags } = parseFlags(args.slice(2));
    const installationId = Number(positionals[0] || flags["installation-id"]);
    const accountLogin = String(flags.account || positionals[1] || "").trim();
    if (!Number.isInteger(installationId) || !accountLogin) {
      console.error("Usage: routely github installation add <installation-id> --account <login>");
      process.exit(1);
    }
    const result = await daemonRequest<{ installation: RoutelyGithubInstallationDto }>("/github/installations", {
      method: "POST",
      body: JSON.stringify({ installationId, accountLogin, accountType: typeof flags.type === "string" ? flags.type : undefined, events: ["push"] })
    });
    if (!result.ok) {
      console.error(`Could not add GitHub installation: ${result.error}`);
      process.exit(1);
    }
    console.log(`Registered installation ${result.data.installation.installationId} for ${result.data.installation.accountLogin}.`);
    return;
  }

  if (subcommand === "connect") {
    const { positionals, flags } = parseFlags(args.slice(1));
    const appName = String(positionals[0] || "").trim();
    const fullName = String(positionals[1] || "").trim();
    if (!appName || !fullName.includes("/")) {
      console.error("Usage: routely github connect <app> <owner/repo> [--branch <branch>] [--auto-deploy false]");
      process.exit(1);
    }
    const { db } = initializeRoutely(workspaceRoot);
    syncConfig(db);
    const app = getAppByName(db, appName);
    db.close();
    if (!app) {
      console.error(`App not found: ${appName}`);
      process.exit(1);
    }
    const result = await daemonRequest<{ app: RoutelyAppDtoLike; repository: RoutelyGithubRepositoryDto }>(`/apps/${app.id}/github`, {
      method: "POST",
      body: JSON.stringify({
        fullName,
        branch: typeof flags.branch === "string" ? flags.branch : "main",
        autoDeployEnabled: flags["auto-deploy"] === "false" ? false : true
      })
    });
    if (!result.ok) {
      console.error(`Could not connect GitHub repository: ${result.error}`);
      process.exit(1);
    }
    console.log(`Connected ${appName} to ${result.data.repository.fullName}.`);
    console.log(`Branch: ${result.data.repository.selectedBranch || result.data.repository.defaultBranch || "main"}`);
    console.log(`Auto deploy: ${result.data.repository.autoDeployEnabled ? "enabled" : "disabled"}`);
    return;
  }

  console.error("Usage: routely github <status|repo add|installation add|connect> ...");
  process.exit(1);
}

type RoutelyAppDtoLike = { id: number; name: string };

async function doctorCommand(): Promise<void> {
  const { db } = initializeRoutely(workspaceRoot);
  syncConfig(db);
  reconcileRuntimeState(db);
  const apps = listApps(db).filter((app) => app.enabled && ["command", "compose"].includes(app.driver));
  const dashboardPort = Number(process.env.ROUTELY_DASHBOARD_PORT || DEFAULT_DASHBOARD_PORT);
  const daemonPort = Number(process.env.ROUTELY_DAEMON_PORT || DEFAULT_DAEMON_PORT);
  const portNotes: string[] = [];
  const portConflicts: Array<{ name: string; port: number; detail?: string }> = [];
  const dashboardUrl = await probeRoutelyDashboard(dashboardPort);
  if (dashboardUrl) {
    portNotes.push(`dashboard: ${dashboardPort} (Routely dashboard already running)`);
  } else if (!(await isPortAvailable(dashboardPort))) {
    portConflicts.push({ name: "dashboard", port: dashboardPort });
  }

  const daemonUrl = await probeRoutelyDaemon(daemonPort);
  if (daemonUrl) {
    portNotes.push(`daemon: ${daemonPort} (Routely daemon already running)`);
  } else if (!(await isPortAvailable(daemonPort))) {
    portConflicts.push({ name: "daemon", port: daemonPort });
  }

  const appPorts = apps.filter((app): app is RoutelyAppRecord & { port: number } => Number.isInteger(app.port));
  const namesByPort = new Map<number, string[]>();
  for (const app of appPorts) {
    const names = namesByPort.get(app.port) || [];
    names.push(app.name);
    namesByPort.set(app.port, names);
  }
  for (const [port, names] of namesByPort) {
    if (names.length > 1) {
      portConflicts.push({ name: names.join(", "), port, detail: "duplicate Routely app port" });
    }
  }
  const unknownAppConflicts = await findUnavailablePorts(appPorts.filter((app) => app.status !== "running" && (namesByPort.get(app.port)?.length || 0) === 1));
  portConflicts.push(...unknownAppConflicts);
  for (const app of appPorts.filter((item) => item.status === "running")) {
    portNotes.push(`${app.name}: ${app.port} (managed app running)`);
  }

  const checks = [
    ["node", spawnSync("node", ["-v"], { encoding: "utf8" })],
    ["npm", spawnSync("npm", ["-v"], { encoding: "utf8" })],
    ["docker", spawnSync("docker", ["--version"], { encoding: "utf8" })]
  ] as const;

  console.log(`Workspace: ${workspaceRoot}`);
  for (const [name, result] of checks) {
    const ok = result.status === 0;
    const value = ok ? (result.stdout || result.stderr).trim() : "not available";
    console.log(`${ok ? "OK" : "WARN"} ${name}: ${value}`);
  }

  if (portConflicts.length === 0) {
    console.log("OK ports: no conflicts detected");
    for (const item of portNotes) {
      console.log(`  ${item}`);
    }
  } else {
    console.log("WARN ports: conflicts detected");
    for (const item of portConflicts) {
      console.log(`  ${item.name}: ${item.port}${item.detail ? ` (${item.detail})` : ""}`);
    }
    for (const item of portNotes) {
      console.log(`  OK ${item}`);
    }
  }

  db.close();
}

async function serverCommand(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (subcommand === "init") {
    await serverInitCommand(args.slice(1));
    return;
  }

  if (subcommand === "doctor") {
    await serverDoctorCommand(args.slice(1));
    return;
  }

  console.error("Usage: routely server <init|doctor> [--data-dir <path>] [--dashboard-port <port>]");
  process.exit(1);
}

function serverPortsFromFlags(flags: Record<string, string | boolean>): number[] {
  const dashboardPort = Number(flags["dashboard-port"] || process.env.ROUTELY_DASHBOARD_PORT || DEFAULT_DASHBOARD_PORT);
  return [80, 443, dashboardPort].filter((port) => Number.isInteger(port) && port > 0);
}

async function serverInitCommand(args: string[]): Promise<void> {
  const { flags } = parseFlags(args);
  const dataDir = resolve(invocationCwd, String(flags["data-dir"] || defaultProductionDataDir(workspaceRoot)));
  const ports = serverPortsFromFlags(flags);
  const token = generateAdminToken();
  const hashed = hashAdminToken(token);
  const dashboardPort = Number(flags["dashboard-port"] || process.env.ROUTELY_DASHBOARD_PORT || DEFAULT_DASHBOARD_PORT);
  const doctor = await runServerDoctorChecks({ workspaceRoot, dataDir, ports, dashboardPort, createDataDir: true });
  const { db, databasePath } = initializeRoutely(workspaceRoot);
  const initializedAt = new Date().toISOString();

  saveServerFoundationState(db, {
    mode: "production",
    dataDir,
    initializedAt,
    adminTokenHash: hashed.hash,
    adminTokenSalt: hashed.salt,
    adminTokenCreatedAt: initializedAt,
    lastDoctor: doctor as unknown as Record<string, unknown>
  });

  console.log("Routely production server foundation initialized.");
  console.log(`Workspace: ${workspaceRoot}`);
  console.log(`Database:  ${databasePath}`);
  console.log(`Data dir:  ${dataDir}`);
  console.log(`Mode:      production`);
  console.log(`Auth:      admin token created`);
  console.log("");
  console.log("Admin token:");
  console.log(token);
  console.log("");
  console.log("Keep this token secret. Set ROUTELY_ADMIN_TOKEN for the dashboard/API process until full login UI lands.");
  console.log("If a local Routely daemon is already running for this workspace, it remains in local mode until you restart it with ROUTELY_SERVER_MODE=production.");
  printDoctorSummary(doctor);
  db.close();
}

async function serverDoctorCommand(args: string[]): Promise<void> {
  const { flags } = parseFlags(args);
  const { db } = initializeRoutely(workspaceRoot);
  const foundation = getServerFoundationState(db);
  const configuredDataDir = typeof flags["data-dir"] === "string" ? flags["data-dir"] : foundation.dataDir || defaultProductionDataDir(workspaceRoot);
  const dataDir = resolve(invocationCwd, configuredDataDir);
  const ports = serverPortsFromFlags(flags);
  const dashboardPort = Number(flags["dashboard-port"] || process.env.ROUTELY_DASHBOARD_PORT || DEFAULT_DASHBOARD_PORT);
  const doctor = await runServerDoctorChecks({ workspaceRoot, dataDir, ports, dashboardPort, createDataDir: false });

  saveServerFoundationState(db, { lastDoctor: doctor as unknown as Record<string, unknown> });
  printDoctorSummary(doctor);
  db.close();

  if (!doctor.ok) {
    process.exitCode = 1;
  }
}

function printDoctorSummary(doctor: Awaited<ReturnType<typeof runServerDoctorChecks>>): void {
  console.log("");
  console.log(`Server doctor: ${doctor.ok ? "OK" : "CHECK"}`);
  console.log(`Data dir:      ${doctor.dataDir}`);
  for (const check of doctor.checks) {
    const label = check.status === "ok" ? "OK" : check.status === "warn" ? "WARN" : "ERROR";
    console.log(`${label} ${check.label}: ${check.message}`);
    if (check.detail) {
      console.log(`  ${check.detail}`);
    }
  }
}

switch (command) {
  case "init":
    initCommand();
    break;
  case "sync":
    syncCommand();
    break;
  case "down":
    await downCommand();
    break;
  case "ps":
    psCommand();
    break;
  case "logs":
    logsCommand(argv.slice(1));
    break;
  case "restart":
    await restartCommand(argv.slice(1));
    break;
  case "health":
    await healthCommand(argv.slice(1));
    break;
  case "deploy":
    await deployCommand(argv.slice(1));
    break;
  case "env":
    await envCommand(argv.slice(1));
    break;
  case "github":
    await githubCommand(argv.slice(1));
    break;
  case "domain":
    await domainCommand(argv.slice(1));
    break;
  case "doctor":
    await doctorCommand();
    break;
  case "server":
    await serverCommand(argv.slice(1));
    break;
  case "add":
    addCommand(argv.slice(1));
    break;
  case "db":
    await dbCommand(argv.slice(1));
    break;
  case "backup":
    await backupCommand(argv.slice(1));
    break;
  case "notify":
  case "notifications":
    await notifyCommand(argv.slice(1));
    break;
  case "up":
    await upCommand();
    break;
  case "help":
  case "--help":
  case "-h":
    printHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}
