import { createServer, type Server } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { findUnavailablePorts, isPortAvailable } from "./ports.js";

const servers: Server[] = [];

function listen(port = 0): Promise<{ server: Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = createServer();
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
});
