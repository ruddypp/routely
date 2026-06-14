import Fastify from "fastify";
import "dotenv/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_DAEMON_PORT, appToPublicDto } from "@routely/core";
import { initializeRoutely, listApps, upsertApp } from "@routely/db";

const port = Number(process.env.ROUTELY_DAEMON_PORT || DEFAULT_DAEMON_PORT);
const host = process.env.ROUTELY_DAEMON_HOST || "127.0.0.1";
const serverFile = fileURLToPath(import.meta.url);
const root = process.env.ROUTELY_REPO_ROOT || resolve(dirname(serverFile), "../../..");
const { db, databasePath } = initializeRoutely(root);

const app = Fastify({ logger: true });

app.get("/health", async () => {
  const apps = listApps(db).map(appToPublicDto);

  return {
    ok: true,
    service: "routely-daemon",
    version: "0.1.0",
    database: databasePath,
    apps
  };
});

app.get("/apps", async () => {
  return { apps: listApps(db).map(appToPublicDto) };
});

app.post("/apps", async (request, reply) => {
  try {
    const saved = upsertApp(db, request.body || {});
    return reply.code(201).send({ app: appToPublicDto(saved) });
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid app payload." });
  }
});

process.on("SIGTERM", () => {
  db.close();
  process.exit(0);
});

try {
  await app.listen({ port, host });
  console.log(`Routely daemon running at http://${host}:${port}`);
  console.log(`Routely database: ${databasePath}`);
} catch (error) {
  app.log.error(error);
  db.close();
  process.exit(1);
}
