import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { loadWorkspaceConfig } from "@routely/core";
import { initializeRoutely, listApps, syncWorkspaceConfig } from "@routely/db";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const localDemoRoot = resolve(repoRoot, "examples/local-demo");
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function createDemoWorkspace(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "routely-local-demo-"));
  tempDirs.push(root);
  const config = readFileSync(resolve(localDemoRoot, "routely.yml"), "utf8").replaceAll("../hello-command", resolve(repoRoot, "examples/hello-command"));
  writeFileSync(resolve(root, "routely.yml"), config, "utf8");
  return root;
}

describe("local demo example", () => {
  it("registers three command apps and one compose-backed postgres service", async () => {
    const workspace = await createDemoWorkspace();
    const loaded = loadWorkspaceConfig(workspace);
    expect(loaded).not.toBeNull();

    const { db } = initializeRoutely(workspace);
    const synced = syncWorkspaceConfig(db, loaded!);
    const apps = listApps(db);

    expect(synced).toEqual(["web", "api", "worker", "postgres"]);
    expect(apps.map((app) => app.name).sort()).toEqual(["api", "postgres", "web", "worker"]);

    const commandApps = apps.filter((app) => app.driver === "command");
    expect(commandApps).toHaveLength(3);
    expect(commandApps.map((app) => app.port).sort()).toEqual([3101, 3102, 3103]);
    for (const app of commandApps) {
      expect(app.path).toBe(resolve(repoRoot, "examples/hello-command"));
      expect(existsSync(resolve(app.path!, "server.js"))).toBe(true);
      expect(app.depends_on).toEqual(["postgres"]);
      expect(app.healthcheck?.path).toBe("/health");
    }

    const postgres = apps.find((app) => app.name === "postgres");
    expect(postgres).toMatchObject({
      type: "database",
      preset: "postgres",
      driver: "compose",
      image: "postgres:16",
      port: 5432,
      internal: true
    });
    expect(postgres?.env).toMatchObject({ POSTGRES_DB: "routely_demo" });
    db.close();
  });
});
