import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../../app/api/server/status/route";

const server = {
  mode: "production",
  production: true,
  dataDir: "/var/lib/routely",
  initializedAt: "2026-06-18T00:00:00.000Z",
  auth: {
    required: true,
    configured: true,
    tokenCreatedAt: "2026-06-18T00:00:00.000Z",
    tokenSource: "settings"
  },
  readiness: {
    ok: true,
    checkedAt: "2026-06-18T00:00:00.000Z",
    checks: [{ id: "docker", label: "docker", status: "ok", message: "Docker available", detail: null }]
  },
  disabledProductionActions: ["deployments", "domains", "https", "github", "backups"]
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/server/status", () => {
  it("proxies production server foundation status", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ server }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.server.mode).toBe("production");
    expect(body.server.auth.configured).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:9977/server/status",
      expect.objectContaining({ cache: "no-store" })
    );
  });
});

