import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

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
  const ports = Array.isArray(app.ports) && app.ports.length > 0 ? app.ports : app.port ? [app.port] : [];
  if (ports.length > 0 && !app.internal) service.ports = ports.map((port) => `${port}:${port}`);
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
  const composePath = resolveComposeFile(app, workspaceRoot);
  if (app.compose_file && existsSync(composePath)) {
    return composePath;
  }

  mkdirSync(dirname(composePath), { recursive: true });
  writeFileSync(composePath, composeConfigToYaml(buildComposeConfig(app)), "utf8");
  return composePath;
}

export function startComposeService(app, workspaceRoot, options = {}) {
  const composeFile = writeComposeConfig(app, workspaceRoot);
  const project = options.project || composeProjectName(workspaceRoot);
  const serviceName = app.compose_service || app.name;
  return spawn("docker", composeUpArgs({ project, composeFile, serviceName }), {
    cwd: workspaceRoot,
    shell: false,
    stdio: options.stdio || "inherit",
    env: { ...process.env, ...(options.env || {}) }
  });
}

export function stopComposeService(app, workspaceRoot, options = {}) {
  const composeFile = writeComposeConfig(app, workspaceRoot);
  const project = options.project || composeProjectName(workspaceRoot);
  const serviceName = app.compose_service || app.name;
  return spawn("docker", composeStopArgs({ project, composeFile, serviceName }), {
    cwd: workspaceRoot,
    shell: false,
    stdio: options.stdio || "inherit",
    env: { ...process.env, ...(options.env || {}) }
  });
}

export function resolveComposeFile(app, workspaceRoot) {
  if (app.compose_file) {
    return isAbsolute(app.compose_file) ? app.compose_file : resolve(workspaceRoot, app.compose_file);
  }
  return resolve(workspaceRoot, ".routely", "compose", `${safeName(app.name)}.compose.yml`);
}

export function composeUpArgs({ project, composeFile, serviceName }) {
  if (!project) throw new Error("Compose project is required.");
  if (!composeFile) throw new Error("Compose file is required.");
  if (!serviceName) throw new Error("Compose service name is required.");
  return ["compose", "-p", project, "-f", composeFile, "up", "-d", serviceName];
}

export function composeStopArgs({ project, composeFile, serviceName }) {
  if (!project) throw new Error("Compose project is required.");
  if (!composeFile) throw new Error("Compose file is required.");
  if (!serviceName) throw new Error("Compose service name is required.");
  return ["compose", "-p", project, "-f", composeFile, "stop", serviceName];
}

export function composePsRunningArgs({ project, composeFile, serviceName }) {
  if (!project) throw new Error("Compose project is required.");
  if (!composeFile) throw new Error("Compose file is required.");
  if (!serviceName) throw new Error("Compose service name is required.");
  return ["compose", "-p", project, "-f", composeFile, "ps", "--status", "running", "-q", serviceName];
}

export function buildDockerfileImageTag(appName, deploymentId) {
  return `routely/${safeName(appName)}:${deploymentId}`;
}

export function buildDockerfileContainerName(appName, deploymentId) {
  return `routely_${safeName(appName)}_${deploymentId}`;
}

export function dockerBuildArgs({ context, dockerfile, imageTag }) {
  if (!context) throw new Error("Docker build context is required.");
  if (!dockerfile) throw new Error("Dockerfile path is required.");
  if (!imageTag) throw new Error("Docker image tag is required.");
  return ["build", "--pull", "-t", imageTag, "-f", dockerfile, context];
}

export function dockerRunArgs({ containerName, imageTag, hostPort, containerPort, env = {} }) {
  if (!containerName) throw new Error("Container name is required.");
  if (!imageTag) throw new Error("Docker image tag is required.");
  if (!Number.isInteger(hostPort) || hostPort <= 0) throw new Error("Host port is required.");
  if (!Number.isInteger(containerPort) || containerPort <= 0) throw new Error("Container port is required.");

  const args = [
    "run",
    "-d",
    "--restart",
    "unless-stopped",
    "--name",
    containerName,
    "-p",
    `${hostPort}:${containerPort}`
  ];

  for (const [key, value] of Object.entries(env || {})) {
    args.push("-e", `${key}=${value}`);
  }

  args.push(imageTag);
  return args;
}

export function dockerRemoveContainerArgs(containerName) {
  return ["rm", "-f", containerName];
}

export function dockerInspectRunningArgs(containerName) {
  return ["inspect", "-f", "{{.State.Running}}", containerName];
}

export function spawnDocker(args, options = {}) {
  return spawn("docker", args, {
    cwd: options.cwd || process.cwd(),
    shell: false,
    stdio: options.stdio || "pipe",
    env: { ...process.env, ...(options.env || {}) }
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

export function composeProjectName(workspaceRoot) {
  return `routely_${safeName(workspaceRoot).slice(-40)}`;
}

function safeName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "local";
}
