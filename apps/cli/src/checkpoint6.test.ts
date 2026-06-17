import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDeployment, createDomain, initializeRoutely, listDomains, listProxyRoutes, updateDeployment, updateDomainVerification, upsertApp, upsertProxyRoute } from "@routely/db";
import { buildDockerLabelsForRoute, buildTraefikDynamicConfig, buildTraefikRoute, verifyDnsARecord, wildcardInstructions } from "@routely/proxy";

describe("checkpoint 6 proxy, domains, and HTTPS slice", () => {
  it("generates Traefik-compatible HTTPS route config", () => {
    const route = buildTraefikRoute({
      domain: { hostname: "web.example.com" },
      deployment: { id: 4, status: "succeeded", host_port: 32004 },
      app: { type: "app", internal: false }
    });
    const config = buildTraefikDynamicConfig([route]);

    expect(route?.routerName).toBe("routely-web-example-com");
    expect(config.http.routers["routely-http-catchall"].middlewares).toEqual(["routely-https-redirect"]);
    expect(config.http.routers["routely-web-example-com"].tls.certResolver).toBe("letsencrypt");
    expect(config.http.services["routely-web-example-com"].loadBalancer.servers[0].url).toBe("http://127.0.0.1:32004");
  });

  it("does not expose internal database apps through the proxy", () => {
    const route = buildTraefikRoute({
      domain: { hostname: "postgres.example.com" },
      deployment: { id: 4, status: "succeeded", host_port: 32004 },
      app: { type: "database", internal: true }
    });

    expect(route).toBeNull();
  });

  it("verifies DNS A records with a mocked resolver", async () => {
    const ok = await verifyDnsARecord("web.example.com", "203.0.113.10", async () => ["203.0.113.10"]);
    const wrong = await verifyDnsARecord("web.example.com", "203.0.113.10", async () => ["198.51.100.5"]);

    expect(ok.ok).toBe(true);
    expect(ok.status).toBe("verified");
    expect(wrong.ok).toBe(false);
    expect(wrong.message).toContain("expected 203.0.113.10");
  });

  it("persists domain and proxy route state", async () => {
    const root = await mkdtemp(join(tmpdir(), "routely-domain-state-"));
    const { db } = initializeRoutely(root);
    const app = upsertApp(db, { name: "web", driver: "dockerfile", path: root, port: 3000 });
    const deployment = createDeployment(db, { appId: app.id, containerPort: 3000, hostPort: 32042 });
    updateDeployment(db, deployment.id, { status: "succeeded", phase: "succeeded", hostPort: 32042 });
    const domain = createDomain(db, { appId: app.id, hostname: "web.example.com", targetPort: 32042 });
    const updated = updateDomainVerification(db, domain.hostname, {
      status: "ready",
      dnsStatus: "verified",
      tlsStatus: "issuing",
      targetPort: 32042,
      verificationMessage: "web.example.com resolves to 203.0.113.10."
    });

    upsertProxyRoute(db, {
      domainId: updated.id,
      appId: app.id,
      deploymentId: deployment.id,
      routerName: "routely-web-example-com",
      serviceName: "routely-web-example-com",
      targetUrl: "http://127.0.0.1:32042",
      config: { hostname: "web.example.com" }
    });

    expect(listDomains(db)[0].status).toBe("ready");
    expect(listProxyRoutes(db)[0].target_url).toBe("http://127.0.0.1:32042");
    db.close();
  });

  it("generates wildcard instructions and Docker labels", () => {
    expect(wildcardInstructions("example.com", "203.0.113.10").records).toEqual([
      { type: "A", name: "@", value: "203.0.113.10" },
      { type: "A", name: "*", value: "203.0.113.10" }
    ]);
    expect(buildDockerLabelsForRoute("web.example.com", 3000)).toContain("traefik.http.routers.routely-web-example-com.tls=true");
  });
});
