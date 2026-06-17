import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../../app/api/apps/[id]/[action]/route";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/apps/:id/logs", () => {
  it("returns a clean 503 when the daemon is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await GET(new Request("http://localhost/api/apps/7/logs"), {
      params: Promise.resolve({ id: "7", action: "logs" })
    });
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("Could not reach the Routely daemon. Is it running?");
  });
});
