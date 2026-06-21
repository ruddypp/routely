import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appToConfigEntry, normalizeWorkspaceConfig } from "@routely/core";
import { buildComposeConfig, composeConfigToYaml } from "@routely/drivers";
import { createDatabaseService, detectPreset } from "@routely/presets";

describe("checkpoint 3 config and preset helpers", () => {
  it("detects a Next.js app and keeps commands editable", async () => {
    const root = await mkdtemp(join(tmpdir(), "routely-next-"));
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ dependencies: { next: "16.2.9" }, scripts: { dev: "next dev", build: "next build", start: "next start" } }),
      "utf8"
    );

    const preset = detectPreset(root);

    expect(preset.preset).toBe("nextjs");
    expect(preset.dev).toBe("npm run dev");
    expect(preset.build).toBe("npm run build");
    expect(preset.start).toBe("npm run start");
    expect(preset.port).toBe(3000);
  });

  it("normalizes config fields and filters secret-like env keys on export", () => {
    const config = normalizeWorkspaceConfig({
      apps: [
        {
          name: "web",
          preset: "nextjs",
          install: "npm install",
          dev: "npm run dev",
          build: "npm run build",
          start: "npm run start",
          env: { NODE_ENV: "development", API_TOKEN: "hidden" },
          depends_on: ["postgres"],
          healthcheck: { path: "/", expected_status: 200 },
          source: { type: "github", repo: "owner/web", branch: "main" }
        }
      ]
    });

    expect(config.apps[0].depends_on).toEqual(["postgres"]);
    expect(config.apps[0].healthcheck?.expected_status).toBe(200);

    const exported = appToConfigEntry(config.apps[0]);
    expect(exported.env).toEqual({ NODE_ENV: "development" });
  });

  it("generates a Compose database service from a template", () => {
    const postgres = createDatabaseService("postgres");
    const config = buildComposeConfig({ id: 1, server_id: 1, status: "stopped", enabled: true, created_at: "", updated_at: "", ...postgres });
    const yaml = composeConfigToYaml(config);

    expect(postgres.driver).toBe("compose");
    expect(postgres.image).toBe("postgres:16");
    expect(config.services.postgres.ports).toBeUndefined();
    expect(yaml).toContain("postgres:16");
    expect(yaml).toContain("postgres_data");
    expect(yaml).not.toContain("5432:5432");
  });
});
