import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as GET_HEALTH, POST as POST_HEALTH } from "../../app/api/apps/[id]/health/route";
import { GET as GET_METRICS } from "../../app/api/apps/[id]/metrics/route";
import { GET as GET_STREAM } from "../../app/api/deployments/[id]/logs/stream/route";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("health and metrics route handlers", () => {
  it("proxies app health refresh reads", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ health: { status: "healthy", checks: [] } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await GET_HEALTH(new Request("http://localhost/api/apps/7/health?refresh=false"), { params: Promise.resolve({ id: "7" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.health.status).toBe("healthy");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:9977/apps/7/health?refresh=false",
      expect.objectContaining({ cache: "no-store" })
    );
  });

  it("proxies app health refresh mutations", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ healthcheck: { status: "healthy" } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await POST_HEALTH(new Request("http://localhost/api/apps/7/health", { method: "POST" }), { params: Promise.resolve({ id: "7" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.healthcheck.status).toBe("healthy");
  });

  it("proxies app metrics", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ metrics: [{ id: 1, scope: "host", cpuPercent: 4.2 }] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await GET_METRICS(new Request("http://localhost/api/apps/7/metrics"), { params: Promise.resolve({ id: "7" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.metrics[0].cpuPercent).toBe(4.2);
  });

  it("returns a clean 503 when log stream daemon fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await GET_STREAM(new Request("http://localhost/api/deployments/11/logs/stream"), { params: Promise.resolve({ id: "11" }) });
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("Could not reach the Routely daemon. Is it running?");
  });
});
