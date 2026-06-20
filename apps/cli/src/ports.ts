import { createServer } from "node:net";

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

export async function findUnavailablePorts(apps: Array<{ name: string; port: number | null }>) {
  const checks = await Promise.all(
    apps
      .filter((app): app is { name: string; port: number } => Number.isInteger(app.port))
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

export async function findExistingRoutelyDashboard(ports: number[]): Promise<string | null> {
  const uniquePorts = [...new Set(ports.filter((port) => Number.isInteger(port) && port > 0))];
  for (const port of uniquePorts) {
    const url = await probeRoutelyDashboard(port);
    if (url) return url;
  }
  return null;
}
