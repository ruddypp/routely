import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
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

async function runCli(workspaceRoot: string, args: string[]) {
  const child = spawn(process.execPath, ["--import", "tsx", resolve(repoRoot, "apps/cli/src/index.ts"), ...args], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ROUTELY_REPO_ROOT: repoRoot,
      ROUTELY_WORKSPACE_ROOT: workspaceRoot
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
  const code = await new Promise<number | null>((resolveExit) => child.once("exit", resolveExit));
  return { code, stdout, stderr };
}

async function expectCli(workspaceRoot: string, args: string[]) {
  const result = await runCli(workspaceRoot, args);
  expect(result.code, result.stderr).toBe(0);
  return result;
}

describe("local demo example", () => {
  it("supports the public local quick start registration commands", { timeout: 20000 }, async () => {
    const workspace = await mkdtemp(resolve(tmpdir(), "routely-local-quickstart-"));
    tempDirs.push(workspace);
    const examplePath = resolve(repoRoot, "examples/hello-command");

    await expectCli(workspace, ["init"]);
    await expectCli(workspace, ["add", examplePath, "--name", "web", "--command", "PORT=3101 ROUTELY_EXAMPLE_NAME=web ROUTELY_EXAMPLE_ROLE=frontend npm run dev", "--port", "3101", "--health-path", "/health"]);
    await expectCli(workspace, ["add", examplePath, "--name", "api", "--command", "PORT=3102 ROUTELY_EXAMPLE_NAME=api ROUTELY_EXAMPLE_ROLE=api npm run dev", "--port", "3102", "--health-path", "/health"]);
    await expectCli(workspace, ["add", examplePath, "--name", "worker", "--command", "PORT=3103 ROUTELY_EXAMPLE_NAME=worker ROUTELY_EXAMPLE_ROLE=worker npm run dev", "--port", "3103", "--health-path", "/health"]);
    await expectCli(workspace, ["db", "add", "postgres", "--name", "postgres", "--port", "5432"]);
    const ps = await expectCli(workspace, ["ps"]);

    expect(ps.stdout).toContain("web\tstopped\tcommand\t:3101");
    expect(ps.stdout).toContain("api\tstopped\tcommand\t:3102");
    expect(ps.stdout).toContain("worker\tstopped\tcommand\t:3103");
    expect(ps.stdout).toContain("postgres\tstopped\tcompose\t:5432");
  });

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
