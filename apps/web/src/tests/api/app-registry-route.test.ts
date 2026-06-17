import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../app/api/apps/route";
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
