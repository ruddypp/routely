#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { DEFAULT_DAEMON_PORT, DEFAULT_DASHBOARD_PORT, appToPublicDto, type RoutelyAppRecord } from "@routely/core";
import {
  initializeRoutely,
  listApps,
  recordRuntimeStart,
  recordRuntimeStop,
  updateAppStatus,
  upsertApp
} from "@routely/db";
import { startCommandApp } from "@routely/drivers";

type ChildProcess = ReturnType<typeof spawn>;
type RunningApp = { app: RoutelyAppRecord; child: ChildProcess };

const cliFile = fileURLToPath(import.meta.url);
const cliDir = dirname(cliFile);
const argv = process.argv.slice(2);
const command = argv[0] || "up";
const invocationCwd = process.cwd();

function readDevRoot(): string | null {
  const rootFile = resolve(cliDir, "dev-root.json");

  if (!existsSync(rootFile)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(rootFile, "utf8")) as { root?: string };
    return parsed.root || null;
  } catch {
    return null;
  }
}

function resolveRoot(): string {
  if (process.env.ROUTELY_REPO_ROOT) {
    return process.env.ROUTELY_REPO_ROOT;
  }

  const devRoot = readDevRoot();
  if (devRoot) {
    return devRoot;
  }

  return resolve(cliDir, "../../..");
}

const root = resolveRoot();

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

function run(name: string, commandName: string, args: string[], env: Record<string, string> = {}): ChildProcess {
  const child = spawn(commandName, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: { ...process.env, ROUTELY_REPO_ROOT: root, ...env }
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
  routely                  Start daemon, dashboard, and registered command apps
  routely init             Create .routely/routely.db and a starter routely.yml
  routely ps               List registered apps
  routely add [path] --name <name> --command <command> [--port <port>] [--preset <preset>]

Defaults:
  Dashboard: http://localhost:3030
  Daemon:    http://127.0.0.1:9977`);
}

function ensureStarterConfig(): string {
  const configPath = resolve(root, "routely.yml");

  if (!existsSync(configPath)) {
    writeFileSync(
      configPath,
      `version: 1\nname: routely-local\n\ndashboard:\n  port: 3030\n\napps: []\n`,
      "utf8"
    );
  }

  return configPath;
}

function initCommand(): void {
  const { databasePath } = initializeRoutely(root);
  const configPath = ensureStarterConfig();

  console.log("Routely initialized.");
  console.log(`Root:      ${root}`);
  console.log(`Database:  ${databasePath}`);
  console.log(`Config:    ${configPath}`);
}

function psCommand(): void {
  const { db, databasePath } = initializeRoutely(root);
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
  const name = String(flags.name || positionals[1] || "").trim();
  const appCommand = String(flags.command || flags.dev || "").trim();

  if (!name || !appCommand) {
    console.error("Usage: routely add [path] --name <name> --command <command> [--port <port>] [--preset <preset>]");
    process.exit(1);
  }

  const { db } = initializeRoutely(root);
  const saved = upsertApp(db, {
    name,
    type: "app",
    preset: typeof flags.preset === "string" ? flags.preset : "custom",
    driver: "command",
    path: resolve(invocationCwd, appPath),
    command: appCommand,
    port: typeof flags.port === "string" ? flags.port : null,
    enabled: true,
    status: "stopped"
  });

  console.log(`Registered ${saved.name}.`);
  console.log(`Path:    ${saved.path}`);
  console.log(`Command: ${saved.command}`);
  if (saved.port) {
    console.log(`Port:    ${saved.port}`);
  }
  db.close();
}

function stopProcess(child: ChildProcess): void {
  if (!child.pid) {
    return;
  }

  try {
    if (process.platform !== "win32") {
      process.kill(-child.pid, "SIGTERM");
    } else {
      child.kill("SIGTERM");
    }
  } catch {
    child.kill("SIGTERM");
  }
}

function upCommand(): void {
  const { db } = initializeRoutely(root);
  const dashboardPort = process.env.ROUTELY_DASHBOARD_PORT || String(DEFAULT_DASHBOARD_PORT);
  const daemonPort = process.env.ROUTELY_DAEMON_PORT || String(DEFAULT_DAEMON_PORT);
  const apps = listApps(db).filter((app) => app.enabled && app.driver === "command");
  const runningApps: RunningApp[] = [];
  let shuttingDown = false;

  console.log("Routely starting...");
  console.log(`Root:      ${root}`);
  console.log(`Dashboard: http://localhost:${dashboardPort}`);
  console.log(`Daemon:    http://127.0.0.1:${daemonPort}`);
  console.log(`Apps:      ${apps.length === 0 ? "none registered yet" : `${apps.length} command app(s)`}`);
  console.log("");

  const daemon = run("daemon", "npm", ["run", "dev", "--workspace", "apps/daemon"], {
    ROUTELY_DAEMON_PORT: daemonPort
  });
  const web = run("dashboard", "npm", ["run", "dev", "--workspace", "apps/web"], {
    PORT: dashboardPort,
    NEXT_PUBLIC_ROUTELY_DAEMON_URL:
      process.env.NEXT_PUBLIC_ROUTELY_DAEMON_URL || `http://127.0.0.1:${daemonPort}`
  });

  for (const app of apps) {
    try {
      updateAppStatus(db, app.id, "starting");
      const child = startCommandApp(app);
      runningApps.push({ app, child });

      if (child.pid) {
        recordRuntimeStart(db, app.id, child.pid);
      }

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

    for (const { child } of runningApps) {
      stopProcess(child);
    }

    daemon.kill("SIGTERM");
    web.kill("SIGTERM");

    setTimeout(() => {
      db.close();
      process.exit(0);
    }, 500);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

switch (command) {
  case "init":
    initCommand();
    break;
  case "ps":
    psCommand();
    break;
  case "add":
    addCommand(argv.slice(1));
    break;
  case "up":
    upCommand();
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
