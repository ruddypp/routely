import { randomInt, randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createServer, type Server } from "node:http";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { hashAdminToken, runServerDoctorChecks } from "@routely/core";
import { signGithubWebhookPayload } from "@routely/github";
import { createDeployment, getAppByName, initializeRoutely, listProxyRoutes, saveServerFoundationState, updateDeployment } from "@routely/db";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const daemonPath = resolve(repoRoot, "apps/daemon/src/server.js");
const children: ChildProcessWithoutNullStreams[] = [];
const servers: Server[] = [];

afterEach(async () => {
  for (const child of children.splice(0)) {
    child.kill("SIGTERM");
    await new Promise((resolveKill) => child.once("exit", resolveKill));
  }
  await Promise.all(servers.splice(0).map((server) => new Promise((resolveClose) => server.close(resolveClose))));
});

function randomPort() {
  return randomInt(21000, 30000);
}

async function createWorkspace(config = "version: 1\nname: qa\napps: []\nservices: []\n") {
  const root = await mkdtemp(join(tmpdir(), "routely-qa-fix-"));
  await writeFile(join(root, "routely.yml"), config, "utf8");
  return root;
}

async function waitForDaemon(baseUrl: string) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // Wait for the daemon process to bind.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error("Daemon did not become ready in time.");
}

async function startDaemon(workspaceRoot: string, env: Record<string, string> = {}) {
  const port = randomPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [daemonPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ROUTELY_SERVER_MODE: "local",
      ROUTELY_ADMIN_TOKEN: "",
      ...env,
      ROUTELY_WORKSPACE_ROOT: workspaceRoot,
      ROUTELY_DAEMON_HOST: "127.0.0.1",
      ROUTELY_DAEMON_PORT: String(port)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  children.push(child);
  await waitForDaemon(baseUrl);
  return { baseUrl, child };
}

async function jsonRequest(baseUrl: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function waitForDeploymentStatus(baseUrl: string, deploymentId: number, status: string) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const result = await jsonRequest(baseUrl, `/deployments/${deploymentId}/logs`);
    if (result.body.deployment?.status === status) return result;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Deployment ${deploymentId} did not reach ${status}.`);
}

async function createApp(baseUrl: string, input: Record<string, unknown>) {
  const { response, body } = await jsonRequest(baseUrl, "/apps", {
    method: "POST",
    body: JSON.stringify(input)
  });
  expect(response.status).toBe(201);
  return body.app as { id: number; status: string };
}

async function runCli(workspaceRoot: string, args: string[], env: Record<string, string> = {}) {
  const child = spawn(process.execPath, ["--import", "tsx", resolve(repoRoot, "apps/cli/src/index.ts"), ...args], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ROUTELY_REPO_ROOT: repoRoot,
      ROUTELY_WORKSPACE_ROOT: workspaceRoot,
      ...env
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
  const code = await new Promise<number | null>((resolveExit) => child.once("exit", resolveExit));
  return { code, stdout, stderr };
}

describe("QA regression fixes", () => {
  it("registers Dockerfile apps through the CLI with deploy metadata", async () => {
    const workspace = await createWorkspace();
    const appDir = await mkdtemp(join(tmpdir(), "routely-dockerfile-app-"));
    await writeFile(join(appDir, "Dockerfile"), "FROM node:24-alpine\nCMD [\"node\", \"server.js\"]\n", "utf8");

    const result = await runCli(workspace, ["add", appDir, "--name", "docker-web", "--driver", "dockerfile", "--port", "8080", "--health-path", "/health"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Driver:  dockerfile");
    expect(result.stdout).toContain("Health:  /health");
    const config = await readFile(join(workspace, "routely.yml"), "utf8");
    expect(config).toContain("driver: dockerfile");
    expect(config).toContain("path: " + appDir);
    expect(config).toContain("path: /health");
    const { db } = initializeRoutely(workspace);
    const app = getAppByName(db, "docker-web");
    expect(app?.driver).toBe("dockerfile");
    expect(app?.command).toBeNull();
    expect(app?.healthcheck?.path).toBe("/health");
    db.close();
  });

  it("requires and accepts production admin auth on private daemon endpoints", async () => {
    const workspace = await createWorkspace();
    const adminToken = randomUUID();
    const { baseUrl } = await startDaemon(workspace, {
      ROUTELY_SERVER_MODE: "production",
      ROUTELY_ADMIN_TOKEN: adminToken
    });

    const missing = await jsonRequest(baseUrl, "/apps");
    expect(missing.response.status).toBe(401);
    expect(missing.body.error).toContain("admin token");

    const authorized = await jsonRequest(baseUrl, "/apps", {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    expect(authorized.response.status).toBe(200);
    expect(authorized.body.apps).toEqual([]);

    const authStatus = await jsonRequest(baseUrl, "/auth/status");
    expect(authStatus.response.status).toBe(200);
    expect(authStatus.body).toMatchObject({
      mode: "production",
      production: true,
      requiresAuth: true,
      auth: {
        required: true,
        configured: true,
        tokenSource: "environment"
      }
    });
  });

  it("enforces persisted production mode as the canonical backend auth signal", async () => {
    const workspace = await createWorkspace();
    const adminToken = randomUUID();
    const { db } = initializeRoutely(workspace);
    saveServerFoundationState(db, {
      mode: "production",
      dataDir: join(workspace, "production-data"),
      initializedAt: new Date().toISOString(),
      adminTokenHash: "hash",
      adminTokenSalt: "salt",
      adminTokenCreatedAt: new Date().toISOString()
    });
    db.close();
    const { baseUrl } = await startDaemon(workspace, {
      ROUTELY_SERVER_MODE: "local",
      ROUTELY_ADMIN_TOKEN: adminToken
    });

    const authStatus = await jsonRequest(baseUrl, "/auth/status");
    expect(authStatus.body).toMatchObject({
      mode: "production",
      production: true,
      requiresAuth: true,
      auth: {
        required: true,
        configured: true,
        tokenSource: "environment"
      }
    });

    const missing = await jsonRequest(baseUrl, "/apps/start-all", { method: "POST" });
    expect(missing.response.status).toBe(401);

    const authorized = await jsonRequest(baseUrl, "/apps", {
      headers: { "x-routely-admin-token": adminToken }
    });
    expect(authorized.response.status).toBe(200);
  });

  it("rejects unauthenticated production mutation endpoints", async () => {
    const workspace = await createWorkspace();
    const adminToken = randomUUID();
    const { baseUrl } = await startDaemon(workspace, {
      ROUTELY_SERVER_MODE: "production",
      ROUTELY_ADMIN_TOKEN: adminToken
    });

    const missing = await jsonRequest(baseUrl, "/domains/root", {
      method: "POST",
      body: JSON.stringify({ domain: "example.com" })
    });
    expect(missing.response.status).toBe(401);

    const authorized = await jsonRequest(baseUrl, "/domains/root", {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ domain: "example.com" })
    });
    expect(authorized.response.status).toBe(200);
    expect(authorized.body.rootDomain).toBe("example.com");
  });

  it("exposes production auth state without leaking the admin token when dashboard env is unset", async () => {
    const workspace = await createWorkspace();
    const adminToken = randomUUID();
    const { baseUrl } = await startDaemon(workspace, {
      ROUTELY_ENV: "",
      ROUTELY_SERVER_MODE: "production",
      ROUTELY_ADMIN_TOKEN: adminToken
    });

    const status = await jsonRequest(baseUrl, "/server/status");
    const auth = await jsonRequest(baseUrl, "/auth/status");
    const missing = await jsonRequest(baseUrl, "/domains/root", {
      method: "POST",
      body: JSON.stringify({ domain: "example.com" })
    });

    expect(status.response.status).toBe(200);
    expect(status.body.server).toMatchObject({
      mode: "production",
      production: true,
      auth: {
        required: true,
        configured: true,
        tokenSource: "environment"
      }
    });
    expect(auth.response.status).toBe(200);
    expect(auth.body).toMatchObject({
      mode: "production",
      production: true,
      requiresAuth: true,
      auth: {
        required: true,
        configured: true,
        tokenSource: "environment"
      }
    });
    expect(JSON.stringify(status.body)).not.toContain(adminToken);
    expect(JSON.stringify(auth.body)).not.toContain(adminToken);
    expect(missing.response.status).toBe(401);
  });

  it("uses persisted production foundation state as the backend auth contract at daemon startup", async () => {
    const workspace = await createWorkspace();
    const adminToken = randomUUID();
    const hashed = hashAdminToken(adminToken);
    const { db } = initializeRoutely(workspace);
    saveServerFoundationState(db, {
      mode: "production",
      dataDir: join(workspace, ".routely", "server"),
      initializedAt: new Date().toISOString(),
      adminTokenHash: hashed.hash,
      adminTokenSalt: hashed.salt,
      adminTokenCreatedAt: new Date().toISOString()
    });
    db.close();
    const { baseUrl } = await startDaemon(workspace, {
      ROUTELY_ENV: "",
      ROUTELY_ADMIN_TOKEN: adminToken
    });

    const status = await jsonRequest(baseUrl, "/server/status");
    const missing = await jsonRequest(baseUrl, "/domains/root", {
      method: "POST",
      body: JSON.stringify({ domain: "example.com" })
    });
    const authorized = await jsonRequest(baseUrl, "/domains/root", {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ domain: "example.com" })
    });

    expect(status.response.status).toBe(200);
    expect(status.body.server).toMatchObject({
      mode: "production",
      production: true,
      auth: {
        required: true,
        configured: true,
        tokenSource: "environment"
      }
    });
    expect(JSON.stringify(status.body)).not.toContain(adminToken);
    expect(JSON.stringify(status.body)).not.toContain(hashed.hash);
    expect(JSON.stringify(status.body)).not.toContain(hashed.salt);
    expect(missing.response.status).toBe(401);
    expect(authorized.response.status).toBe(200);
  });

  it("round-trips disabled Compose app metadata through config, DB, daemon DTOs, and CLI output", async () => {
    const workspace = await createWorkspace();
    const { baseUrl } = await startDaemon(workspace);

    const payload = {
      name: "api",
      type: "app",
      preset: "custom",
      driver: "compose",
      compose_file: "./compose.yml",
      compose_service: "api",
      port: 8080,
      ports: [8080, 9090],
      depends_on: ["postgres"],
      healthcheck: { path: "/health", expected_status: 204 },
      domains: ["api.example.test"],
      source: { type: "github", repo: "acme/api", branch: "main", auto_deploy: { enabled: true, branches: ["main"] } },
      env: { NODE_ENV: "production", PUBLIC_URL: "https://api.example.test" },
      enabled: false
    };

    const created = await jsonRequest(baseUrl, "/apps", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    expect(created.response.status).toBe(201);
    expect(created.body.app).toMatchObject({
      name: "api",
      driver: "compose",
      composeFile: "./compose.yml",
      composeService: "api",
      port: 8080,
      ports: [8080, 9090],
      dependsOn: ["postgres"],
      healthcheck: { path: "/health", expected_status: 204 },
      domains: ["api.example.test"],
      source: { type: "github", repo: "acme/api", branch: "main", auto_deploy: { enabled: true, branches: ["main"] } },
      enabled: false
    });
    expect(created.body.app.envKeys).toEqual(["NODE_ENV", "PUBLIC_URL"]);

    const { db } = initializeRoutely(workspace);
    const stored = getAppByName(db, "api");
    expect(stored).toMatchObject({
      driver: "compose",
      compose_file: "./compose.yml",
      compose_service: "api",
      port: 8080,
      ports: [8080, 9090],
      depends_on: ["postgres"],
      domains: ["api.example.test"],
      enabled: false
    });
    expect(stored?.source?.repo).toBe("acme/api");
    db.close();

    const listed = await jsonRequest(baseUrl, "/apps");
    const listedApp = listed.body.apps.find((item: { name: string }) => item.name === "api");
    expect(listedApp).toMatchObject({ composeFile: "./compose.yml", composeService: "api", ports: [8080, 9090], enabled: false });

    const rejectedStart = await jsonRequest(baseUrl, `/apps/${created.body.app.id}/start`, { method: "POST" });
    expect(rejectedStart.response.status).toBe(400);
    expect(rejectedStart.body).toMatchObject({ code: "disabled" });
    expect(rejectedStart.body.error).toContain("disabled");

    const rejectedRestart = await jsonRequest(baseUrl, `/apps/${created.body.app.id}/restart`, { method: "POST" });
    expect(rejectedRestart.response.status).toBe(400);
    expect(rejectedRestart.body).toMatchObject({ code: "disabled" });
    expect(rejectedRestart.body.error).toContain("disabled");

    const ps = await runCli(workspace, ["ps", "--json"]);
    expect(ps.code).toBe(0);
    const cliApp = JSON.parse(ps.stdout).apps.find((item: { name: string }) => item.name === "api");
    expect(cliApp).toMatchObject({ composeFile: "./compose.yml", composeService: "api", ports: [8080, 9090], enabled: false });
    expect(cliApp.envKeys).toEqual(["NODE_ENV", "PUBLIC_URL"]);

    const humanPs = await runCli(workspace, ["ps"]);
    expect(humanPs.stdout).toContain("api\tstopped\tcompose\t:8080,:9090\tdisabled");
    expect(humanPs.stdout).toContain("compose=./compose.yml#api");
    expect(humanPs.stdout).toContain("env=NODE_ENV,PUBLIC_URL");

    const config = await readFile(join(workspace, "routely.yml"), "utf8");
    expect(config).toContain("enabled: false");
    expect(config).toContain("compose_file: ./compose.yml");
    expect(config).toContain("compose_service: api");
    expect(config).toContain("ports:");
    expect(config).toContain("- 9090");
  });

  it("keeps an already-running local daemon usable after server init mutates foundation state", async () => {
    const workspace = await createWorkspace();
    const { baseUrl } = await startDaemon(workspace);
    const { db } = initializeRoutely(workspace);
    saveServerFoundationState(db, {
      mode: "production",
      dataDir: join(workspace, ".routely", "server"),
      initializedAt: new Date().toISOString(),
      adminTokenHash: "hash",
      adminTokenSalt: "salt",
      adminTokenCreatedAt: new Date().toISOString()
    });
    db.close();

    const listed = await jsonRequest(baseUrl, "/apps");
    expect(listed.response.status).toBe(200);
    const status = await jsonRequest(baseUrl, "/server/status");
    expect(status.body.server.mode).toBe("local");
    expect(status.body.server.auth.required).toBe(false);
  });

  it("parses app domain JSON bodies and returns validation errors for invalid hostnames", async () => {
    const workspace = await createWorkspace();
    const { baseUrl } = await startDaemon(workspace);
    const app = await createApp(baseUrl, { name: "web", driver: "dockerfile", path: workspace, port: 3000 });

    const valid = await jsonRequest(baseUrl, `/apps/${app.id}/domains`, {
      method: "POST",
      body: JSON.stringify({ hostname: "web.example.com" })
    });
    expect(valid.response.status).toBe(201);
    expect(valid.body.domain.hostname).toBe("web.example.com");
    expect(valid.body.domain.status).toBe("not-configured");
    expect(valid.body.domain.dnsStatus).toBe("not-configured");
    expect(valid.body.domain.proxyStatus).toBe("pending");
    expect(valid.body.domain.tlsStatus).toBe("not-configured");

    const verify = await jsonRequest(baseUrl, "/domains/web.example.com/verify", { method: "POST" });
    expect(verify.response.status).toBe(200);
    expect(verify.body.domain.status).toBe("not-configured");
    expect(verify.body.domain.dnsStatus).toBe("not-configured");
    expect(verify.body.verification.status).toBe("not-configured");

    const invalid = await jsonRequest(baseUrl, `/apps/${app.id}/domains`, {
      method: "POST",
      body: JSON.stringify({ hostname: "not a host" })
    });
    expect(invalid.response.status).toBe(400);
    expect(invalid.body.error).toMatch(/hostname|domain/i);
    expect(invalid.body.error).not.toContain("FST_ERR_CTP_INVALID_CONTENT_LENGTH");
  });

  it("generates proxy routes against the latest successful deployment without claiming TLS success", async () => {
    const workspace = await createWorkspace();
    const { baseUrl } = await startDaemon(workspace, { ROUTELY_SERVER_PUBLIC_IP: "203.0.113.10" });
    const app = await createApp(baseUrl, { name: "web", driver: "dockerfile", path: workspace, port: 3000 });
    const { db } = initializeRoutely(workspace);
    const first = createDeployment(db, { appId: app.id, containerPort: 3000, hostPort: 32041 });
    updateDeployment(db, first.id, { status: "succeeded", phase: "succeeded", hostPort: 32041, finishedAt: "2026-06-22T00:00:00.000Z" });
    const latest = createDeployment(db, { appId: app.id, containerPort: 3000, hostPort: 32042 });
    updateDeployment(db, latest.id, { status: "succeeded", phase: "succeeded", hostPort: 32042, finishedAt: "2026-06-22T00:01:00.000Z" });
    db.close();

    const added = await jsonRequest(baseUrl, `/apps/${app.id}/domains`, {
      method: "POST",
      body: JSON.stringify({ hostname: "web.example.com" })
    });

    expect(added.response.status).toBe(201);
    expect(added.body.domain.status).toBe("generated");
    expect(added.body.domain.dnsStatus).toBe("pending");
    expect(added.body.domain.proxyStatus).toBe("generated");
    expect(added.body.domain.tlsStatus).toBe("pending");
    expect(added.body.domain.targetDeploymentId).toBe(latest.id);
    expect(added.body.domain.targetPort).toBe(32042);
    expect(added.body.domain.targetUrl).toBe("http://127.0.0.1:32042");

    const { db: verifyDb } = initializeRoutely(workspace);
    const [route] = listProxyRoutes(verifyDb);
    expect(route.deployment_id).toBe(latest.id);
    expect(route.target_url).toBe("http://127.0.0.1:32042");
    verifyDb.close();
  });

  it("redacts saved app secrets from daemon env responses", async () => {
    const workspace = await createWorkspace();
    const { baseUrl } = await startDaemon(workspace);
    const app = await createApp(baseUrl, { name: "web", driver: "dockerfile", path: workspace, port: 3000 });

    const saved = await jsonRequest(baseUrl, `/apps/${app.id}/env`, {
      method: "POST",
      body: JSON.stringify({ key: "DATABASE_URL", value: "postgres://raw-secret", isSecret: true, scope: "production" })
    });

    expect(saved.response.status).toBe(201);
    expect(saved.body.envVar.value).toBeNull();
    expect(saved.body.envVar.displayValue).toBe("[redacted]");
    expect(saved.body.env.pending).toEqual({ count: 1, needsRestart: true, needsRedeploy: true });
    expect(JSON.stringify(saved.body)).not.toContain("postgres://raw-secret");

    const listed = await jsonRequest(baseUrl, `/apps/${app.id}/env`);
    expect(JSON.stringify(listed.body)).not.toContain("postgres://raw-secret");
  });

  it("exposes daemon production auth state without leaking the admin token", async () => {
    const workspace = await createWorkspace();
    const adminToken = `admin-${randomUUID()}`;
    const { baseUrl } = await startDaemon(workspace, {
      ROUTELY_ENV: "",
      ROUTELY_SERVER_MODE: "production",
      ROUTELY_ADMIN_TOKEN: adminToken
    });

    const status = await jsonRequest(baseUrl, "/auth/status");
    expect(status.response.status).toBe(200);
    expect(status.body).toMatchObject({
      mode: "production",
      production: true,
      requiresAuth: true,
      auth: { required: true, configured: true, tokenSource: "environment" }
    });
    expect(JSON.stringify(status.body)).not.toContain(adminToken);

    const unauthenticatedMutation = await jsonRequest(baseUrl, "/apps/start-all", { method: "POST" });
    expect(unauthenticatedMutation.response.status).toBe(401);

    const authorizedCreate = await jsonRequest(baseUrl, "/apps", {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: "prod-web", driver: "command", command: "node -e \"setInterval(() => {}, 1000)\"" })
    });
    expect(authorizedCreate.response.status).toBe(201);
  });

  it("redacts database app env values from create responses", async () => {
    const workspace = await createWorkspace();
    const { baseUrl } = await startDaemon(workspace);

    const { response, body } = await jsonRequest(baseUrl, "/databases", {
      method: "POST",
      body: JSON.stringify({ type: "postgres", name: "qa-postgres" })
    });

    expect(response.status).toBe(201);
    expect(body.database.envKeys.length).toBeGreaterThan(0);
    expect(body.app.env).toEqual({});
    const listed = await jsonRequest(baseUrl, "/apps");
    const listedDbApp = listed.body.apps.find((item: { name: string }) => item.name === "qa-postgres");
    expect(listedDbApp.env).toEqual({});
    expect(listedDbApp.envKeys).toContain("POSTGRES_DB");
    const detail = await jsonRequest(baseUrl, `/apps/${body.app.id}`);
    expect(detail.body.app.env).toEqual({});
  });

  it("redacts app secrets from failed deployment metadata and logs", async () => {
    const workspace = await createWorkspace();
    const secretPath = join(workspace, "raw-secret-source");
    const { baseUrl } = await startDaemon(workspace);
    const app = await createApp(baseUrl, { name: "web", driver: "dockerfile", path: secretPath, port: 3000 });

    await jsonRequest(baseUrl, `/apps/${app.id}/env`, {
      method: "POST",
      body: JSON.stringify({ key: "SECRET_PATH", value: secretPath, isSecret: true, scope: "production" })
    });

    const queued = await jsonRequest(baseUrl, `/apps/${app.id}/deployments`, { method: "POST" });
    expect(queued.response.status).toBe(202);
    const failed = await waitForDeploymentStatus(baseUrl, queued.body.deployment.id, "failed");

    expect(failed.body.deployment.phase).toBe("preparing");
    expect(failed.body.deployment.logsUrl).toBe(`/deployments/${queued.body.deployment.id}/logs`);
    expect(failed.body.deployment.errorMessage).toContain("[redacted]");
    expect(JSON.stringify(failed.body)).not.toContain(secretPath);
  });

  it("reports internal Compose HTTP healthchecks as unavailable without probing unpublished ports", async () => {
    const workspace = await createWorkspace();
    const { baseUrl } = await startDaemon(workspace);
    const app = await createApp(baseUrl, {
      name: "postgres",
      type: "database",
      driver: "compose",
      image: "postgres:16",
      internal: true,
      port: 5432,
      healthcheck: { path: "/health", expected_status: 200 }
    });
    const { db } = initializeRoutely(workspace);
    const deployment = createDeployment(db, { appId: app.id, containerPort: 5432 });
    updateDeployment(db, deployment.id, {
      status: "succeeded",
      phase: "succeeded",
      containerName: "compose:routely_test/postgres",
      hostPort: null,
      finishedAt: "2026-06-22T00:00:00.000Z"
    });
    db.close();

    const health = await jsonRequest(baseUrl, `/apps/${app.id}/health`);

    expect(health.response.status).toBe(200);
    expect(health.body.health).toMatchObject({
      status: "unavailable",
      available: false,
      reason: "unavailable"
    });
    expect(health.body.health.message).toContain("no reachable host port");
    expect(health.body.health.checks[0]).toMatchObject({
      target: "compose",
      deploymentId: deployment.id,
      status: "unavailable"
    });
  });

  it("returns failed backup run metadata without serving sensitive backup files", async () => {
    const workspace = await createWorkspace();
    const { baseUrl } = await startDaemon(workspace);

    const created = await jsonRequest(baseUrl, "/databases", {
      method: "POST",
      body: JSON.stringify({ type: "postgres", name: "qa-postgres" })
    });
    expect(created.response.status).toBe(201);

    const enabled = await jsonRequest(baseUrl, "/backups", {
      method: "POST",
      body: JSON.stringify({ database: "qa-postgres", enabled: true, schedule: null, retentionDays: 7 })
    });
    expect(enabled.response.status).toBe(201);

    const run = await jsonRequest(baseUrl, `/backups/${enabled.body.job.id}/run`, {
      method: "POST",
      body: JSON.stringify({ trigger: "manual" })
    });

    expect(run.response.status).toBe(500);
    expect(run.body.error).toBeTruthy();
    expect(run.body.run).toMatchObject({
      status: "failed",
      trigger: "manual",
      storageType: "local",
      storageStatus: "metadata-only",
      restoreStatus: "deferred",
      downloadUrl: null,
      filePath: null
    });
    expect(run.body.run.file).toMatchObject({
      available: false,
      servesFile: false,
      downloadUrl: null
    });
  });

  it("rejects unsafe notification targets before saving channels", async () => {
    const workspace = await createWorkspace();
    const { baseUrl } = await startDaemon(workspace);

    const created = await jsonRequest(baseUrl, "/notifications", {
      method: "POST",
      body: JSON.stringify({ type: "webhook", name: "local", url: "http://127.0.0.1:9876/hook" })
    });

    expect(created.response.status).toBe(400);
    expect(created.body.error).toMatch(/private|loopback|link-local|Notification URL/i);
    const listed = await jsonRequest(baseUrl, "/notifications");
    expect(listed.body.channels).toEqual([]);
  });

  it("returns the active deployment instead of creating duplicate deploy jobs", async () => {
    const workspace = await createWorkspace();
    await writeFile(join(workspace, "Dockerfile"), "FROM alpine:3.20\nCMD [\"sh\", \"-c\", \"sleep 30\"]\n", "utf8");
    const { baseUrl } = await startDaemon(workspace);
    const app = await createApp(baseUrl, { name: "web", driver: "dockerfile", path: workspace, port: 3000 });

    const [first, second] = await Promise.all([
      jsonRequest(baseUrl, `/apps/${app.id}/deployments`, { method: "POST" }),
      jsonRequest(baseUrl, `/apps/${app.id}/deployments`, { method: "POST" })
    ]);
    const statuses = [first.response.status, second.response.status].sort();

    expect(statuses).toEqual([202, 409]);
    expect(first.body.deployment.id).toBe(second.body.deployment.id);
  });

  it("rejects production deploys that cannot honestly run", async () => {
    const workspace = await createWorkspace();
    const { baseUrl } = await startDaemon(workspace);
    const commandApp = await createApp(baseUrl, {
      name: "worker",
      driver: "command",
      command: `${process.execPath} -e "setInterval(() => {}, 1000)"`
    });
    const incompleteCompose = await createApp(baseUrl, { name: "api", driver: "compose" });
    const disabledCompose = await createApp(baseUrl, {
      name: "disabled-api",
      driver: "compose",
      compose_file: "compose.yml",
      compose_service: "api",
      enabled: false
    });

    const unsupported = await jsonRequest(baseUrl, `/apps/${commandApp.id}/deployments`, { method: "POST" });
    expect(unsupported.response.status).toBe(400);
    expect(unsupported.body).toMatchObject({ code: "unsupported-driver" });
    expect(unsupported.body.error).toContain("Dockerfile and Compose apps only");

    const missingComposeMetadata = await jsonRequest(baseUrl, `/apps/${incompleteCompose.id}/deployments`, { method: "POST" });
    expect(missingComposeMetadata.response.status).toBe(400);
    expect(missingComposeMetadata.body).toMatchObject({ code: "missing-compose-metadata" });
    expect(missingComposeMetadata.body.error).toContain("compose_file or image");

    const disabled = await jsonRequest(baseUrl, `/apps/${disabledCompose.id}/deployments`, { method: "POST" });
    expect(disabled.response.status).toBe(400);
    expect(disabled.body).toMatchObject({ code: "disabled" });
  });

  it("serializes overlapping lifecycle actions so reported status and start conflicts agree", async () => {
    const workspace = await createWorkspace();
    const { baseUrl } = await startDaemon(workspace);
    const app = await createApp(baseUrl, {
      name: "worker",
      driver: "command",
      command: `${process.execPath} -e "setInterval(() => {}, 1000)"`
    });

    await jsonRequest(baseUrl, `/apps/${app.id}/start`, { method: "POST" });
    await Promise.all([
      jsonRequest(baseUrl, `/apps/${app.id}/restart`, { method: "POST" }),
      jsonRequest(baseUrl, `/apps/${app.id}/stop`, { method: "POST" }),
      jsonRequest(baseUrl, `/apps/${app.id}/start`, { method: "POST" })
    ]);

    const listed = await jsonRequest(baseUrl, "/apps");
    const current = listed.body.apps.find((item: { id: number }) => item.id === app.id);
    const startAgain = await jsonRequest(baseUrl, `/apps/${app.id}/start`, { method: "POST" });

    if (current.status === "stopped") {
      expect(startAgain.response.status).not.toBe(409);
    } else {
      expect(current.status).toBe("running");
      expect(startAgain.response.status).toBe(409);
      expect(startAgain.body).toMatchObject({ code: "already-running" });
      expect(startAgain.body.error).toContain("already running");
    }

    await jsonRequest(baseUrl, `/apps/${app.id}/stop`, { method: "POST" });
  });

  it("starts all enabled local apps in dependency order and reports skipped resources", async () => {
    const workspace = await createWorkspace();
    const { baseUrl } = await startDaemon(workspace);
    const command = `${process.execPath} -e "setInterval(() => {}, 1000)"`;
    const api = await createApp(baseUrl, { name: "api", driver: "command", command, depends_on: ["worker"] });
    const worker = await createApp(baseUrl, { name: "worker", driver: "command", command });
    await createApp(baseUrl, { name: "disabled-compose", driver: "compose", compose_file: "compose.yml", compose_service: "disabled", enabled: false });
    await createApp(baseUrl, { name: "prod-web", driver: "dockerfile", path: workspace, port: 3000 });

    try {
      const started = await jsonRequest(baseUrl, "/apps/start-all", { method: "POST" });
      expect(started.response.status).toBe(200);
      expect(started.body.started.map((item: { app: { name: string } }) => item.app.name)).toEqual(["worker", "api"]);
      expect(started.body.skipped).toEqual(expect.arrayContaining([
        expect.objectContaining({ app: expect.objectContaining({ name: "disabled-compose" }), code: "disabled" }),
        expect.objectContaining({ app: expect.objectContaining({ name: "prod-web" }), code: "unsupported-driver" })
      ]));

      const repeated = await jsonRequest(baseUrl, "/apps/start-all", { method: "POST" });
      expect(repeated.response.status).toBe(200);
      expect(repeated.body.started).toEqual([]);
      expect(repeated.body.skipped).toEqual(expect.arrayContaining([
        expect.objectContaining({ app: expect.objectContaining({ name: "api" }), code: "already-running" }),
        expect.objectContaining({ app: expect.objectContaining({ name: "worker" }), code: "already-running" })
      ]));

      const stoppedApi = await jsonRequest(baseUrl, `/apps/${api.id}/stop`, { method: "POST" });
      expect(stoppedApi.response.status).toBe(200);
      expect(stoppedApi.body.app).toMatchObject({ name: "api", enabled: true, status: "stopped" });

      const notRunning = await jsonRequest(baseUrl, `/apps/${api.id}/stop`, { method: "POST" });
      expect(notRunning.response.status).toBe(409);
      expect(notRunning.body).toMatchObject({ code: "not-running" });

      const disabledWorker = await jsonRequest(baseUrl, `/apps/${worker.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: false })
      });
      expect(disabledWorker.response.status).toBe(200);
      expect(disabledWorker.body.app).toMatchObject({ name: "worker", enabled: false });

      const stoppedWorker = await jsonRequest(baseUrl, `/apps/${worker.id}/stop`, { method: "POST" });
      expect(stoppedWorker.response.status).toBe(200);
      expect(stoppedWorker.body.app).toMatchObject({ name: "worker", enabled: false, status: "stopped" });
    } finally {
      await jsonRequest(baseUrl, `/apps/${api.id}/stop`, { method: "POST" }).catch(() => null);
      await jsonRequest(baseUrl, `/apps/${worker.id}/stop`, { method: "POST" }).catch(() => null);
    }
  });

  it("rejects Start All when enabled apps have duplicate host ports", async () => {
    const workspace = await createWorkspace();
    const { baseUrl } = await startDaemon(workspace);
    const port = randomPort();
    const command = `${process.execPath} -e "setInterval(() => {}, 1000)"`;
    await createApp(baseUrl, { name: "api", driver: "command", command, port });
    await createApp(baseUrl, { name: "worker", driver: "command", command, port });

    const result = await jsonRequest(baseUrl, "/apps/start-all", { method: "POST" });

    expect(result.response.status).toBe(409);
    expect(result.body).toMatchObject({ code: "port-conflict" });
    expect(result.body.conflicts).toEqual(expect.arrayContaining([
      expect.objectContaining({ port, appNames: expect.arrayContaining(["api", "worker"]) })
    ]));
    expect(result.body.started).toEqual([]);
  });

  it("rejects Start All when enabled app dependencies contain a cycle", async () => {
    const workspace = await createWorkspace();
    const { baseUrl } = await startDaemon(workspace);
    const command = `${process.execPath} -e "setInterval(() => {}, 1000)"`;
    await createApp(baseUrl, { name: "api", driver: "command", command, depends_on: ["worker"] });
    await createApp(baseUrl, { name: "worker", driver: "command", command, depends_on: ["api"] });

    const result = await jsonRequest(baseUrl, "/apps/start-all", { method: "POST" });

    expect(result.response.status).toBe(409);
    expect(result.body).toMatchObject({ code: "dependency-cycle" });
    expect(result.body.error).toContain("Dependency cycle detected");
    expect(result.body.started).toEqual([]);
  });

  it("reports an occupied dashboard port as ok when it is the Routely dashboard", async () => {
    const port = randomPort();
    const workspace = await createWorkspace();
    const server = createServer((request, response) => {
      if (request.url === "/api/health") {
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ connected: true, daemonUrl: "http://127.0.0.1:9977" }));
        return;
      }
      response.statusCode = 404;
      response.end("not found");
    });
    servers.push(server);
    await new Promise<void>((resolveListen) => server.listen(port, "127.0.0.1", resolveListen));

    const doctor = await runServerDoctorChecks({ workspaceRoot: workspace, dataDir: join(workspace, "data"), ports: [port], dashboardPort: port, createDataDir: true });
    const check = doctor.checks.find((item) => item.id === `port-${port}`);

    expect(check?.status).toBe("ok");
    expect(check?.message).toContain("Routely dashboard");
  });

  it("prints concise CLI validation errors for invalid domain hostnames", async () => {
    const workspace = await createWorkspace();
    const result = await runCli(workspace, ["domain", "root", "not a host"]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Invalid hostname:");
    expect(result.stderr).not.toContain("at validateHostname");
    expect(result.stderr).not.toContain("packages/proxy");
  });

  it("treats Routely-owned local doctor ports as expected", async () => {
    const workspace = await createWorkspace();
    const dashboardPort = randomPort();
    const daemonPort = randomPort();
    const dashboard = createServer((request, response) => {
      if (request.url === "/api/health") {
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ connected: true, daemonUrl: `http://127.0.0.1:${daemonPort}` }));
        return;
      }
      response.statusCode = 404;
      response.end("not found");
    });
    const daemon = createServer((request, response) => {
      if (request.url === "/health") {
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ ok: true, service: "routely-daemon" }));
        return;
      }
      response.statusCode = 404;
      response.end("not found");
    });
    servers.push(dashboard, daemon);
    await Promise.all([
      new Promise<void>((resolveListen) => dashboard.listen(dashboardPort, "127.0.0.1", resolveListen)),
      new Promise<void>((resolveListen) => daemon.listen(daemonPort, "127.0.0.1", resolveListen))
    ]);

    const result = await runCli(workspace, ["doctor"], {
      ROUTELY_DASHBOARD_PORT: String(dashboardPort),
      ROUTELY_DAEMON_PORT: String(daemonPort)
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("OK ports: no conflicts detected");
    expect(result.stdout).toContain(`dashboard: ${dashboardPort} (Routely dashboard already running)`);
    expect(result.stdout).toContain(`daemon: ${daemonPort} (Routely daemon already running)`);
    expect(result.stdout).not.toContain("WARN ports: conflicts detected");
  });

  it("uses the persisted production data dir for server doctor by default", async () => {
    const workspace = await createWorkspace();
    const persistedDataDir = join(workspace, "persisted-server-data");
    await mkdir(persistedDataDir, { recursive: true });
    const { db } = initializeRoutely(workspace);
    saveServerFoundationState(db, {
      mode: "production",
      dataDir: persistedDataDir,
      initializedAt: new Date().toISOString(),
      adminTokenHash: "hash",
      adminTokenSalt: "salt",
      adminTokenCreatedAt: new Date().toISOString()
    });
    db.close();

    const result = await runCli(workspace, ["server", "doctor", "--dashboard-port", String(randomPort())]);

    expect(result.stdout).toContain(`Data dir:      ${persistedDataDir}`);
  });

  it("reports duplicate GitHub webhook deliveries as already processed", async () => {
    const workspace = await createWorkspace();
    const webhookSecret = randomUUID();
    const { baseUrl } = await startDaemon(workspace, { ROUTELY_GITHUB_WEBHOOK_SECRET: webhookSecret });
    const payload = JSON.stringify({
      ref: "refs/heads/main",
      after: "abc123",
      repository: { full_name: "acme/web" },
      head_commit: { message: "ship" }
    });
    const headers = {
      "content-type": "application/json",
      "x-github-delivery": randomUUID(),
      "x-github-event": "push",
      "x-hub-signature-256": signGithubWebhookPayload(payload, webhookSecret)
    };

    const first = await jsonRequest(baseUrl, "/github/webhook", { method: "POST", headers, body: payload });
    const second = await jsonRequest(baseUrl, "/github/webhook", { method: "POST", headers, body: payload });

    expect(first.response.status).toBe(202);
    expect(second.response.status).toBe(200);
    expect(second.body.duplicate).toBe(true);
    expect(second.body.alreadyProcessed).toBe(true);
    expect(second.body.status).toBe("duplicate");
  });
});
