import { randomInt, randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createServer, type Server } from "node:http";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { runServerDoctorChecks } from "@routely/core";

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

async function createApp(baseUrl: string, input: Record<string, unknown>) {
  const { response, body } = await jsonRequest(baseUrl, "/apps", {
    method: "POST",
    body: JSON.stringify(input)
  });
  expect(response.status).toBe(201);
  return body.app as { id: number; status: string };
}

describe("QA regression fixes", () => {
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
    expect(valid.body.domain.status).toBe("pending");

    const invalid = await jsonRequest(baseUrl, `/apps/${app.id}/domains`, {
      method: "POST",
      body: JSON.stringify({ hostname: "not a host" })
    });
    expect(invalid.response.status).toBe(400);
    expect(invalid.body.error).toMatch(/hostname|domain/i);
    expect(invalid.body.error).not.toContain("FST_ERR_CTP_INVALID_CONTENT_LENGTH");
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
      expect(startAgain.body.error).toContain("already running");
    }

    await jsonRequest(baseUrl, `/apps/${app.id}/stop`, { method: "POST" });
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
});
