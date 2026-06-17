import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../app/api/apps/[id]/[action]/route";

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
});
