import { createServer as createNetServer, type Server as NetServer } from "node:net";
import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { findExistingRoutelyDashboard, findUnavailablePorts, isPortAvailable, probeRoutelyDashboard } from "./ports.js";

const servers: Array<NetServer | HttpServer> = [];

function listen(port = 0): Promise<{ server: NetServer; port: number }> {
  return new Promise((resolve, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not resolve test server address."));
        return;
      }

      servers.push(server);
      resolve({ server, port: address.port });
    });
  });
}

function listenHttp(handler: Parameters<typeof createHttpServer>[0]): Promise<{ server: HttpServer; port: number }> {
  return new Promise((resolve, reject) => {
    const server = createHttpServer(handler);
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not resolve test HTTP server address."));
        return;
      }

      servers.push(server);
      resolve({ server, port: address.port });
    });
  });
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        })
    )
  );
});

describe("port checks", () => {
  it("reports an unused port as available", async () => {
    expect(await isPortAvailable(0)).toBe(true);
  });

  it("detects an occupied port", async () => {
    const { port } = await listen();

    expect(await isPortAvailable(port)).toBe(false);
  });

  it("returns unavailable app ports", async () => {
    const { port } = await listen();

    await expect(
      findUnavailablePorts([
        { name: "api", port },
        { name: "worker", port: null }
      ])
    ).resolves.toEqual([{ name: "api", port }]);
  });

  it("detects an existing Routely dashboard health endpoint", async () => {
    const { port } = await listenHttp((request, response) => {
      if (request.url === "/api/health") {
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ connected: true, daemonUrl: "http://127.0.0.1:9977" }));
        return;
      }
      response.statusCode = 404;
      response.end("not found");
    });

    await expect(probeRoutelyDashboard(port)).resolves.toBe(`http://127.0.0.1:${port}`);
    await expect(findExistingRoutelyDashboard([1, port])).resolves.toBe(`http://127.0.0.1:${port}`);
  });
});
