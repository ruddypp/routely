import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as GET_STATUS } from "../../app/api/github/status/route";
import { POST as CONNECT_APP } from "../../app/api/apps/[id]/github/route";
import { POST as WEBHOOK } from "../../app/api/github/webhook/route";

const github = {
  configured: true,
  appId: "12345",
  clientId: "Iv1.client",
  webhookSecretConfigured: true,
  privateKeyConfigured: true,
  installations: [],
  repositories: [],
  deliveries: []
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GitHub route handlers", () => {
  it("proxies GitHub status through same-origin API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ github }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await GET_STATUS(new Request("http://localhost/api/github/status"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.github.configured).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:9977/github/status", expect.objectContaining({ cache: "no-store" }));
  });

  it("returns daemon-unreachable failures for GitHub status", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("connect ECONNREFUSED"));

    const response = await GET_STATUS(new Request("http://localhost/api/github/status"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("Could not reach");
  });

  it("connects an app to a GitHub repository through the daemon proxy", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ app: { id: 7, name: "web" }, repository: { fullName: "acme/web", selectedBranch: "main" } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await CONNECT_APP(new Request("http://localhost/api/apps/7/github", {
      method: "POST",
      body: JSON.stringify({ fullName: "acme/web", branch: "main", autoDeployEnabled: true })
    }), { params: Promise.resolve({ id: "7" }) });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:9977/apps/7/github", expect.objectContaining({ method: "POST" }));
  });

  it("forwards raw GitHub webhook deliveries with signature headers", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 202,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await WEBHOOK(new Request("http://localhost/api/github/webhook", {
      method: "POST",
      body: JSON.stringify({ ref: "refs/heads/main" }),
      headers: {
        "content-type": "application/json",
        "x-github-delivery": "delivery-1",
        "x-github-event": "push",
        "x-hub-signature-256": "sha256=abc"
      }
    }));

    expect(response.status).toBe(202);
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:9977/github/webhook", expect.objectContaining({ method: "POST" }));
    const forwardedHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(forwardedHeaders.get("x-github-delivery")).toBe("delivery-1");
    expect(forwardedHeaders.get("x-hub-signature-256")).toBe("sha256=abc");
  });
});
