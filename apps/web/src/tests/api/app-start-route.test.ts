import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../app/api/apps/[id]/[action]/route";
import { POST as START_ALL } from "../../app/api/apps/start-all/route";

const app = {
  id: 7,
  serverId: 1,
  name: "web",
  type: "app",
  preset: "custom",
  driver: "command",
  path: "/tmp/web",
  command: "npm run dev",
  port: 3000,
  enabled: true,
  status: "running",
  createdAt: "2026-06-17T00:00:00.000Z",
  updatedAt: "2026-06-17T00:00:00.000Z"
};

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ROUTELY_ADMIN_TOKEN;
  delete process.env.ROUTELY_ENV;
});

describe("POST /api/apps/:id/start", () => {
  it("proxies a start request to the daemon", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ app, pid: 1234 }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await POST(new Request("http://localhost/api/apps/7/start", { method: "POST" }), {
      params: Promise.resolve({ id: "7", action: "start" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ app, pid: 1234 });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:9977/apps/7/start",
      expect.objectContaining({ method: "POST", cache: "no-store" })
    );
  });

  it("forwards the server-side admin token when configured", async () => {
    process.env.ROUTELY_ADMIN_TOKEN = "test-token";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ app, pid: 1234 }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await POST(new Request("http://localhost/api/apps/7/start", { method: "POST" }), {
      params: Promise.resolve({ id: "7", action: "start" })
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:9977/apps/7/start",
      expect.objectContaining({
        headers: expect.any(Headers)
      })
    );
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer test-token");
  });

  it("proxies a per-app stop without changing enablement", async () => {
    const stoppedApp = { ...app, enabled: false, status: "stopped" };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ app: stoppedApp, stopped: [{ pid: 1234, result: "stopped" }] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await POST(new Request("http://localhost/api/apps/7/stop", { method: "POST" }), {
      params: Promise.resolve({ id: "7", action: "stop" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.app).toMatchObject({ enabled: false, status: "stopped" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:9977/apps/7/stop",
      expect.objectContaining({ method: "POST", cache: "no-store" })
    );
  });
});

describe("POST /api/apps/start-all", () => {
  it("proxies Start All and preserves skipped resources", async () => {
    const disabledApp = { ...app, id: 8, name: "worker", enabled: false, status: "stopped" };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        started: [{ app, pid: 1234 }],
        skipped: [{ app: disabledApp, code: "disabled", reason: "worker is disabled and was skipped." }],
        failed: [],
        apps: [app, disabledApp]
      }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await START_ALL(new Request("http://localhost/api/apps/start-all", { method: "POST" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.skipped).toEqual([expect.objectContaining({ code: "disabled" })]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:9977/apps/start-all",
      expect.objectContaining({ method: "POST", cache: "no-store" })
    );
  });

  it("preserves daemon partial-success status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        started: [],
        skipped: [],
        failed: [{ app, code: "start-failed", error: "command exited" }],
        apps: [app]
      }), {
        status: 207,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await START_ALL(new Request("http://localhost/api/apps/start-all", { method: "POST" }));
    const body = await response.json();

    expect(response.status).toBe(207);
    expect(body.failed).toEqual([expect.objectContaining({ code: "start-failed" })]);
  });
});
