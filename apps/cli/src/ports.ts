import { createServer } from "node:net";

export type PortCandidate = {
  name: string;
  port: number | null;
  internal?: boolean | null;
};

export type PortConflict = {
  name: string;
  port: number;
  detail?: string;
};

export function isPortAvailable(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

export function hostBoundPortCandidates(apps: PortCandidate[]): Array<{ name: string; port: number }> {
  return apps.filter((app): app is { name: string; port: number } => Number.isInteger(app.port) && app.internal !== true);
}

export function findDuplicatePorts(apps: PortCandidate[]): PortConflict[] {
  const namesByPort = new Map<number, string[]>();

  for (const app of hostBoundPortCandidates(apps)) {
    const names = namesByPort.get(app.port) || [];
    names.push(app.name);
    namesByPort.set(app.port, names);
  }

  return [...namesByPort.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([port, names]) => ({ name: names.join(", "), port, detail: "duplicate host port" }));
}

export async function findUnavailablePorts(apps: PortCandidate[]): Promise<PortConflict[]> {
  const checks = await Promise.all(
    hostBoundPortCandidates(apps)
      .map(async (app) => ({ ...app, available: await isPortAvailable(app.port) }))
  );

  return checks.filter((check) => !check.available).map(({ name, port }) => ({ name, port }));
}

export async function probeRoutelyDashboard(port: number, timeoutMs = 1000): Promise<string | null> {
  if (!Number.isInteger(port) || port <= 0) {
    return null;
  }

  const url = `http://127.0.0.1:${port}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${url}/api/health`, { signal: controller.signal });
    const data = (await response.json().catch(() => null)) as { connected?: unknown; daemonUrl?: unknown } | null;
    if (response.ok && data && ("connected" in data || "daemonUrl" in data)) {
      return url;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }

  return null;
}

export async function probeRoutelyDaemon(port: number, timeoutMs = 1000): Promise<string | null> {
  if (!Number.isInteger(port) || port <= 0) {
    return null;
  }

  const url = `http://127.0.0.1:${port}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${url}/health`, { signal: controller.signal });
    const data = (await response.json().catch(() => null)) as { ok?: unknown; service?: unknown } | null;
    if (response.ok && data?.ok === true && data.service === "routely-daemon") {
      return url;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }

  return null;
}

export async function waitForRoutelyEndpoint(
  port: number,
  probe: (port: number, timeoutMs?: number) => Promise<string | null>,
  options: { timeoutMs?: number; intervalMs?: number; probeTimeoutMs?: number } = {}
): Promise<string | null> {
  const timeoutMs = Math.max(1, options.timeoutMs ?? 15_000);
  const intervalMs = Math.max(10, options.intervalMs ?? 250);
  const probeTimeoutMs = Math.max(1, options.probeTimeoutMs ?? Math.min(1000, intervalMs));
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const url = await probe(port, probeTimeoutMs);
    if (url) {
      return url;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return null;
}

export async function findExistingRoutelyDashboard(ports: number[]): Promise<string | null> {
  const uniquePorts = [...new Set(ports.filter((port) => Number.isInteger(port) && port > 0))];
  for (const port of uniquePorts) {
    const url = await probeRoutelyDashboard(port);
    if (url) return url;
  }
  return null;
}
