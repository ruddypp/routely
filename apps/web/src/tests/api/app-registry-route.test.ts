import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../../app/api/apps/route";
import { PATCH } from "../../app/api/apps/[id]/route";

const app = {
  id: 12,
  serverId: 1,
  name: "api",
  type: "app",
  preset: "custom",
  driver: "command",
  path: "/tmp/api",
  command: "npm run dev",
  port: 4000,
  dependsOn: ["postgres"],
  enabled: true,
  status: "stopped",
  createdAt: "2026-06-17T00:00:00.000Z",
  updatedAt: "2026-06-17T00:00:00.000Z"
};

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ROUTELY_ADMIN_TOKEN;
  delete process.env.ROUTELY_ENV;
});

describe("GET /api/apps", () => {
  it("preserves upstream auth failures instead of returning empty success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Routely production API requires an admin token." }), {
        status: 401,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await GET(new Request("http://localhost/api/apps"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Routely production API requires an admin token.");
    expect(body.apps).toBeUndefined();
  });

  it("forwards the server-side admin token when configured", async () => {
    const token = randomUUID();
    process.env.ROUTELY_ADMIN_TOKEN = token;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ apps: [app] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await GET(new Request("http://localhost/api/apps"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.apps).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:9977/apps",
      expect.objectContaining({
        headers: expect.any(Headers)
      })
    );
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get("authorization")).toBe(`Bearer ${token}`);
  });

  it("requires a caller admin token in production", async () => {
    process.env.ROUTELY_ENV = "production";
    process.env.ROUTELY_ADMIN_TOKEN = "test-token";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ apps: [app] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const unauthorized = await GET(new Request("http://localhost/api/apps"));
    const unauthorizedBody = await unauthorized.json();
    const authorized = await GET(new Request("http://localhost/api/apps", {
      headers: { "x-routely-admin-token": "test-token" }
    }));

    expect(unauthorized.status).toBe(401);
    expect(unauthorizedBody.error).toContain("admin token");
    expect(authorized.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed admin token cookies without proxying", async () => {
    process.env.ROUTELY_ENV = "production";
    process.env.ROUTELY_ADMIN_TOKEN = "test-token";
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const response = await GET(new Request("http://localhost/api/apps", {
      headers: { cookie: "routely_admin_token=%E0%A4%A" }
    }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain("admin token");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/apps", () => {
  it("proxies app creation to the daemon", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ app }), {
        status: 201,
        headers: { "content-type": "application/json" }
      })
    );

    const request = new Request("http://localhost/api/apps", {
      method: "POST",
      body: JSON.stringify({ name: "api", command: "npm run dev", port: 4000 })
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ app });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:9977/apps",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "api", command: "npm run dev", port: 4000 })
      })
    );
  });
});

describe("PATCH /api/apps/:id", () => {
  it("proxies app edits to the daemon", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ app: { ...app, command: "npm run start" } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const request = new Request("http://localhost/api/apps/12", {
      method: "PATCH",
      body: JSON.stringify({ command: "npm run start" })
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: "12" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.app.command).toBe("npm run start");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:9977/apps/12",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ command: "npm run start" })
      })
    );
  });

  it("returns a clean 503 when the daemon is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

    const request = new Request("http://localhost/api/apps/12", {
      method: "PATCH",
      body: JSON.stringify({ command: "npm run start" })
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: "12" }) });
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("Could not reach the Routely daemon. Is it running?");
  });
});
