import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../app/api/apps/[id]/deployments/route";
import { GET as GET_LOGS } from "../../app/api/deployments/[id]/logs/route";

const app = {
  id: 7,
  serverId: 1,
  name: "web",
  type: "app",
  preset: "custom",
  driver: "dockerfile",
  path: "/srv/web",
  command: null,
  install: null,
  dev: null,
  build: null,
  start: null,
  env: {},
  port: 3000,
  enabled: true,
  status: "stopped",
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z"
};

const deployment = {
  id: 11,
  appId: 7,
  appName: "web",
  status: "queued",
  phase: "queued",
  sourceType: "local",
  repo: null,
  branch: null,
  commitSha: null,
  imageTag: null,
  containerName: null,
  previousImageTag: null,
  previousContainerName: null,
  hostPort: null,
  containerPort: 3000,
  errorMessage: null,
  startedAt: "2026-06-18T00:00:00.000Z",
  finishedAt: null,
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z"
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("deployment route handlers", () => {
  it("proxies app deployment creation", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ app, deployment }), {
        status: 202,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await POST(new Request("http://localhost/api/apps/7/deployments", { method: "POST" }), { params: Promise.resolve({ id: "7" }) });
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body.deployment.id).toBe(11);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:9977/apps/7/deployments",
      expect.objectContaining({ method: "POST", cache: "no-store" })
    );
  });

  it("proxies incremental deployment logs", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ deployment, logs: [{ id: 1, deploymentId: 11, sequence: 2, phase: "building", stream: "stdout", message: "ok", createdAt: "2026-06-18T00:00:00.000Z" }] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await GET_LOGS(new Request("http://localhost/api/deployments/11/logs?after=1"), { params: Promise.resolve({ id: "11" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.logs[0].sequence).toBe(2);
  });
});
