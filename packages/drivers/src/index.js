import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const routelyDriversVersion = "0.1.0";

export function startCommandApp(app, options = {}) {
  if (app.driver !== "command") {
    throw new Error(`Unsupported driver for local command runner: ${app.driver}`);
  }

  if (!app.command) {
    throw new Error(`App ${app.name} does not have a command configured.`);
  }

  const child = spawn(app.command, {
    cwd: app.path || process.cwd(),
    env: { ...process.env, ...(options.env || {}) },
    detached: process.platform !== "win32",
    shell: true,
    stdio: options.stdio || "inherit"
  });

  return child;
}

export function buildComposeConfig(app) {
  if (app.driver !== "compose") {
    throw new Error(`Unsupported driver for Compose config: ${app.driver}`);
  }

  const serviceName = app.compose_service || app.name;
  const service = {};

  if (app.image) service.image = app.image;
  if (app.command) service.command = app.command;
  if (app.env && Object.keys(app.env).length > 0) service.environment = app.env;
  if (app.port && !app.internal) service.ports = [`${app.port}:${app.port}`];
  if (Array.isArray(app.volumes) && app.volumes.length > 0) service.volumes = app.volumes;
  if (Array.isArray(app.depends_on) && app.depends_on.length > 0) service.depends_on = app.depends_on;

  return {
    services: { [serviceName]: service },
    volumes: collectNamedVolumes(app.volumes)
  };
}

export function composeConfigToYaml(config) {
  const lines = ["services:"];

  for (const [name, service] of Object.entries(config.services || {})) {
    lines.push(`  ${name}:`);
    for (const [key, value] of Object.entries(service)) {
      appendYamlValue(lines, key, value, 4);
    }
  }

  if (config.volumes && Object.keys(config.volumes).length > 0) {
    lines.push("volumes:");
    for (const name of Object.keys(config.volumes)) {
      lines.push(`  ${name}: {}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function writeComposeConfig(app, workspaceRoot) {
  const composeDir = resolve(workspaceRoot, ".routely", "compose");
  mkdirSync(composeDir, { recursive: true });
  const composePath = app.compose_file || resolve(composeDir, `${safeName(app.name)}.compose.yml`);
  writeFileSync(composePath, composeConfigToYaml(buildComposeConfig(app)), "utf8");
  return composePath;
}

export function startComposeService(app, workspaceRoot, options = {}) {
  const composeFile = writeComposeConfig(app, workspaceRoot);
  const project = options.project || composeProjectName(workspaceRoot);
  const serviceName = app.compose_service || app.name;
  return spawn("docker", ["compose", "-p", project, "-f", composeFile, "up", "-d", serviceName], {
    cwd: workspaceRoot,
    shell: false,
    stdio: options.stdio || "inherit"
  });
}

export function stopComposeService(app, workspaceRoot, options = {}) {
  const composeFile = writeComposeConfig(app, workspaceRoot);
  const project = options.project || composeProjectName(workspaceRoot);
  const serviceName = app.compose_service || app.name;
  return spawn("docker", ["compose", "-p", project, "-f", composeFile, "stop", serviceName], {
    cwd: workspaceRoot,
    shell: false,
    stdio: options.stdio || "inherit"
  });
}

function appendYamlValue(lines, key, value, indent) {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    lines.push(`${pad}${key}:`);
    for (const item of value) {
      lines.push(`${pad}  - ${quoteYamlScalar(item)}`);
    }
    return;
  }

  if (value && typeof value === "object") {
    lines.push(`${pad}${key}:`);
    for (const [childKey, childValue] of Object.entries(value)) {
      lines.push(`${pad}  ${childKey}: ${quoteYamlScalar(childValue)}`);
    }
    return;
  }

  lines.push(`${pad}${key}: ${quoteYamlScalar(value)}`);
}

function quoteYamlScalar(value) {
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(String(value));
}

function collectNamedVolumes(volumes = []) {
  const named = {};
  for (const volume of volumes || []) {
    const [name] = String(volume).split(":");
    if (name && !name.startsWith(".") && !name.startsWith("/") && !name.includes("\\")) {
      named[name] = {};
    }
  }
  return named;
}

function composeProjectName(workspaceRoot) {
  return `routely_${safeName(workspaceRoot).slice(-40)}`;
}

function safeName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "local";
}
