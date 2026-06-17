import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../../app/api/domains/route";
import { POST as VERIFY } from "../../app/api/domains/[hostname]/verify/route";
import { GET as GET_PROXY } from "../../app/api/proxy/routes/route";

const domain = {
  id: 1,
  appId: 7,
  appName: "web",
  hostname: "web.example.com",
  status: "pending",
  dnsStatus: "pending",
  tlsStatus: "pending",
  targetPort: null,
  verificationMessage: "Create an A record.",
  lastVerifiedAt: null,
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z"
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("domain route handlers", () => {
  it("lists domains through the daemon proxy", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ rootDomain: "example.com", serverPublicIp: "203.0.113.10", domains: [domain] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.domains[0].hostname).toBe("web.example.com");
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:9977/domains", expect.objectContaining({ cache: "no-store" }));
  });

  it("adds a domain through the daemon proxy", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ domain }), {
        status: 201,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await POST(new Request("http://localhost/api/domains", {
      method: "POST",
      body: JSON.stringify({ appId: 7, hostname: "web.example.com" })
    }));

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:9977/domains", expect.objectContaining({ method: "POST" }));
  });

  it("verifies DNS through the daemon proxy", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ domain: { ...domain, status: "ready", dnsStatus: "verified" }, verification: { ok: true } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await VERIFY(new Request("http://localhost/api/domains/web.example.com/verify", { method: "POST" }), { params: Promise.resolve({ hostname: "web.example.com" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.domain.dnsStatus).toBe("verified");
  });

  it("lists generated proxy routes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ routes: [{ id: 1, domainId: 1, appId: 7, appName: "web", deploymentId: 11, hostname: "web.example.com", routerName: "routely-web-example-com", serviceName: "routely-web-example-com", targetUrl: "http://127.0.0.1:32011", enabled: true, createdAt: "2026-06-18T00:00:00.000Z", updatedAt: "2026-06-18T00:00:00.000Z" }], config: {} }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await GET_PROXY();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.routes[0].targetUrl).toBe("http://127.0.0.1:32011");
  });
});
