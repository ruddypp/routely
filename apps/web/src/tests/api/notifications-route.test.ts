import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../../app/api/notifications/route";
import { PATCH } from "../../app/api/notifications/[id]/route";
import { POST as TEST } from "../../app/api/notifications/[id]/test/route";

const channel = {
  id: 1,
  name: "deploys",
  type: "discord",
  enabled: true,
  events: ["deploy_succeeded", "deploy_failed"],
  target: "https://discord.com/api/webhooks/[redacted]",
  createdAt: "2026-06-19T00:00:00.000Z",
  updatedAt: "2026-06-19T00:00:00.000Z"
};

const attempt = {
  id: 2,
  channelId: 1,
  channelName: "deploys",
  channelType: "discord",
  event: "deploy_failed",
  status: "succeeded",
  httpStatus: 204,
  message: "notification delivered",
  target: channel.target,
  resourceType: "deployment",
  resourceId: 7,
  createdAt: "2026-06-19T00:00:00.000Z",
  finishedAt: "2026-06-19T00:00:01.000Z"
};

describe("notification route handlers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("proxies notification list and create requests", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ channels: [channel], attempts: [attempt], channel }), { status: 200, headers: { "content-type": "application/json" } })));
    vi.stubGlobal("fetch", fetchMock);

    expect((await GET()).status).toBe(200);
    const create = await POST(new Request("http://localhost/api/notifications", { method: "POST", body: JSON.stringify({ type: "discord", name: "deploys", url: "https://discord.example" }) }));
    expect(create.status).toBe(200);
    expect(fetchMock).toHaveBeenLastCalledWith("http://127.0.0.1:9977/notifications", expect.objectContaining({ method: "POST" }));
  });

  it("proxies update and test requests with production admin token", async () => {
    vi.stubEnv("ROUTELY_ADMIN_TOKEN", "test-token");
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ channels: [channel], attempts: [attempt], attempt }), { status: 200, headers: { "content-type": "application/json" } })));
    vi.stubGlobal("fetch", fetchMock);

    await PATCH(new Request("http://localhost/api/notifications/1", { method: "PATCH", body: JSON.stringify({ enabled: false }) }), { params: Promise.resolve({ id: "1" }) });
    await TEST(new Request("http://localhost/api/notifications/1/test", { method: "POST", body: JSON.stringify({}) }), { params: Promise.resolve({ id: "1" }) });

    expect(fetchMock).toHaveBeenLastCalledWith("http://127.0.0.1:9977/notifications/1/test", expect.objectContaining({ headers: expect.objectContaining({ authorization: "Bearer test-token" }) }));
  });
});
