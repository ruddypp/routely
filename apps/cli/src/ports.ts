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
