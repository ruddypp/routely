import { promises as dns } from "node:dns";

export const routelyProxyVersion = "0.1.0";

export const DOMAIN_STATUSES = ["not-configured", "pending", "verified", "generated", "failed"];
export const DNS_STATUSES = ["not-configured", "pending", "verified", "failed"];
export const TLS_STATUSES = ["not-configured", "pending", "issuing", "active", "failed", "disabled"];
export const PROXY_ROUTE_STATUSES = ["pending", "generated", "failed"];

const HOSTNAME_PATTERN = /^(?=.{1,253}$)(\*\.)?([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])$/i;

export function normalizeHostname(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

export function validateHostname(value, { allowWildcard = true } = {}) {
  const hostname = normalizeHostname(value);
  if (!hostname) {
    throw new Error("Hostname is required.");
  }
  if (hostname.includes("/") || hostname.includes(":")) {
    throw new Error(`Hostname must not include a path or port: ${hostname}`);
  }
  if (hostname.startsWith("*.") && !allowWildcard) {
    throw new Error("Wildcard hostnames are not supported here.");
  }
  if (!HOSTNAME_PATTERN.test(hostname)) {
    throw new Error(`Invalid hostname: ${hostname}`);
  }
  return hostname;
}

export function wildcardInstructions(rootDomain, serverPublicIp = null) {
  const root = validateHostname(rootDomain, { allowWildcard: false });
  return {
    rootDomain: root,
    records: [
      { type: "A", name: "@", value: serverPublicIp || "<server-public-ip>" },
      { type: "A", name: "*", value: serverPublicIp || "<server-public-ip>" }
    ],
    examples: [`app.${root}`, `api.${root}`]
  };
}

export async function verifyDnsARecord(hostname, serverPublicIp, resolver = dns.resolve4) {
  const normalized = validateHostname(hostname);
  const expected = String(serverPublicIp || "").trim();
  if (!expected) {
    return {
      hostname: normalized,
      ok: false,
      status: "not-configured",
      addresses: [],
      expected,
      message: "Server public IP is not configured. Set ROUTELY_SERVER_PUBLIC_IP before verifying domains."
    };
  }

  try {
    const addresses = await resolver(normalized);
    const ok = addresses.includes(expected);
    return {
      hostname: normalized,
      ok,
      status: ok ? "verified" : "failed",
      addresses,
      expected,
      message: ok
        ? `${normalized} resolves to ${expected}.`
        : `${normalized} resolves to ${addresses.join(", ") || "no A records"}, expected ${expected}.`
    };
  } catch (error) {
    return {
      hostname: normalized,
      ok: false,
      status: "failed",
      addresses: [],
      expected,
      message: error instanceof Error ? error.message : `Could not resolve ${normalized}.`
    };
  }
}

export function routeNameForHostname(hostname) {
  return validateHostname(hostname).replace(/^\*\./, "wildcard-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function buildTraefikRoute({ domain, deployment, app }) {
  const hostname = validateHostname(domain.hostname);
  if (app?.internal || app?.type === "database") {
    return null;
  }
  if (!deployment?.host_port || deployment.status !== "succeeded") {
    return null;
  }

  const name = routeNameForHostname(hostname);
  const serviceName = `routely-${name}`;
  const routerName = `routely-${name}`;
  const targetUrl = `http://127.0.0.1:${deployment.host_port}`;
  const rule = hostname.startsWith("*.")
    ? `HostRegexp(\`{subdomain:[a-z0-9-]+}.${hostname.slice(2)}\`)`
    : `Host(\`${hostname}\`)`;

  return {
    hostname,
    status: "generated",
    deploymentId: deployment.id || null,
    targetUrl,
    routerName,
    serviceName,
    router: {
      rule,
      entryPoints: ["websecure"],
      service: serviceName,
      tls: { certResolver: "letsencrypt" },
      middlewares: ["routely-secure-headers"]
    },
    service: {
      loadBalancer: {
        servers: [{ url: targetUrl }]
      }
    }
  };
}

export function buildTraefikDynamicConfig(routes = []) {
  const http = {
    routers: {
      "routely-http-catchall": {
        rule: "HostRegexp(`{host:.+}`)",
        entryPoints: ["web"],
        middlewares: ["routely-https-redirect"],
        service: "routely-noop"
      }
    },
    services: {
      "routely-noop": {
        loadBalancer: { servers: [{ url: "http://127.0.0.1:9" }] }
      }
    },
    middlewares: {
      "routely-https-redirect": {
        redirectScheme: { scheme: "https", permanent: true }
      },
      "routely-secure-headers": {
        headers: {
          stsSeconds: 31536000,
          stsIncludeSubdomains: true,
          stsPreload: false,
          frameDeny: true,
          contentTypeNosniff: true
        }
      }
    }
  };

  for (const route of routes) {
    if (!route) continue;
    http.routers[route.routerName] = route.router;
    http.services[route.serviceName] = route.service;
  }

  return { http };
}

export function buildDockerLabelsForRoute(hostname, containerPort, { certResolver = "letsencrypt" } = {}) {
  const normalized = validateHostname(hostname);
  const name = routeNameForHostname(normalized);
  const router = `routely-${name}`;
  const service = `routely-${name}`;
  return [
    "traefik.enable=true",
    `traefik.http.routers.${router}.rule=Host(\`${normalized}\`)`,
    `traefik.http.routers.${router}.entrypoints=websecure`,
    `traefik.http.routers.${router}.tls=true`,
    `traefik.http.routers.${router}.tls.certresolver=${certResolver}`,
    `traefik.http.routers.${router}.middlewares=routely-secure-headers`,
    `traefik.http.routers.${router}.service=${service}`,
    `traefik.http.services.${service}.loadbalancer.server.port=${Number(containerPort || 3000)}`
  ];
}
