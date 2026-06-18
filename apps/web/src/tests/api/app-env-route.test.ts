import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../../app/api/apps/[id]/env/route";
import { DELETE } from "../../app/api/apps/[id]/env/[key]/route";

const app = {
  id: 5,
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
  status: "running",
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z"
};

const envResponse = {
  app,
  env: {
    vars: [
      {
        id: 2,
        appId: 5,
        key: "DATABASE_URL",
        value: null,
        displayValue: "[redacted]",
        isSecret: true,
        scope: "all",
        needsRestart: true,
        needsRedeploy: true,
        createdAt: "2026-06-18T00:00:00.000Z",
        updatedAt: "2026-06-18T00:00:00.000Z"
      }
    ],
    pending: { count: 1, needsRestart: true, needsRedeploy: true }
  }
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("app env route handlers", () => {
  it("proxies env listing to the daemon", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(envResponse), { status: 200, headers: { "content-type": "application/json" } })
    );

    const response = await GET(new Request("http://localhost/api/apps/5/env"), { params: Promise.resolve({ id: "5" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.env.vars[0].value).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:9977/apps/5/env", expect.objectContaining({ cache: "no-store" }));
  });

  it("proxies env creation to the daemon", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ...envResponse, envVar: envResponse.env.vars[0] }), { status: 201, headers: { "content-type": "application/json" } })
    );

    const request = new Request("http://localhost/api/apps/5/env", {
      method: "POST",
      body: JSON.stringify({ key: "DATABASE_URL", value: "postgres://secret", isSecret: true })
    });
    const response = await POST(request, { params: Promise.resolve({ id: "5" }) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.envVar.displayValue).toBe("[redacted]");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:9977/apps/5/env",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ key: "DATABASE_URL", value: "postgres://secret", isSecret: true }) })
    );
  });

  it("proxies env deletion to the daemon", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ...envResponse, env: { vars: [], pending: { count: 0, needsRestart: false, needsRedeploy: false } } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await DELETE(new Request("http://localhost/api/apps/5/env/DATABASE_URL", { method: "DELETE" }), {
      params: Promise.resolve({ id: "5", key: "DATABASE_URL" })
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:9977/apps/5/env/DATABASE_URL", expect.objectContaining({ method: "DELETE" }));
  });

  it("returns a clean 503 when the daemon is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await GET(new Request("http://localhost/api/apps/5/env"), { params: Promise.resolve({ id: "5" }) });
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("Could not reach the Routely daemon. Is it running?");
  });
});
