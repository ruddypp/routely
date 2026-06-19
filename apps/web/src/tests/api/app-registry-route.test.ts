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
});

describe("GET /api/apps", () => {
  it("preserves upstream auth failures instead of returning empty success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Routely production API requires an admin token." }), {
        status: 401,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await GET();
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

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.apps).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:9977/apps",
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: `Bearer ${token}` })
      })
    );
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
