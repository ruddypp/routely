import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appToConfigEntry, appToPublicDto, normalizeWorkspaceConfig } from "@routely/core";
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
          driver: "compose",
          install: "npm install",
          dev: "npm run dev",
          build: "npm run build",
          start: "npm run start",
          env: { NODE_ENV: "development", API_TOKEN: "hidden" },
          ports: [3000, "3001"],
          depends_on: ["postgres"],
          healthcheck: { path: "/", expected_status: 200 },
          domains: ["web.example.test"],
          source: { type: "github", repo: "owner/web", branch: "main", auto_deploy: { enabled: true, branches: ["main"] } },
          compose_file: "./compose.yml",
          compose_service: "web",
          enabled: false
        }
      ]
    });

    expect(config.apps[0].enabled).toBe(false);
    expect(config.apps[0].driver).toBe("compose");
    expect(config.apps[0].port).toBe(3000);
    expect(config.apps[0].ports).toEqual([3000, 3001]);
    expect(config.apps[0].depends_on).toEqual(["postgres"]);
    expect(config.apps[0].healthcheck?.expected_status).toBe(200);
    expect(config.apps[0].domains).toEqual(["web.example.test"]);
    expect(config.apps[0].source?.auto_deploy?.branches).toEqual(["main"]);
    expect(config.apps[0].compose_file).toBe("./compose.yml");
    expect(config.apps[0].compose_service).toBe("web");

    const exported = appToConfigEntry(config.apps[0]);
    expect(exported.env).toEqual({ NODE_ENV: "development" });
    expect(exported.ports).toEqual([3000, 3001]);
    expect(exported.depends_on).toEqual(["postgres"]);
    expect(exported.healthcheck).toEqual({ path: "/", expected_status: 200 });
    expect(exported.domains).toEqual(["web.example.test"]);
    expect(exported.source).toEqual({ type: "github", repo: "owner/web", branch: "main", auto_deploy: { enabled: true, branches: ["main"] } });
    expect(exported.compose_file).toBe("./compose.yml");
    expect(exported.compose_service).toBe("web");
    expect(exported.enabled).toBe(false);
  });

  it("preserves compose metadata and enablement while redacting secret-like env values", () => {
    const config = normalizeWorkspaceConfig({
      apps: [
        {
          name: "api",
          driver: "compose",
          compose_file: "./compose.yml",
          compose_service: "api",
          port: 8000,
          enabled: false,
          env: { PUBLIC_URL: "http://localhost:8000", API_TOKEN: "hidden" },
          depends_on: ["postgres"],
          healthcheck: { path: "/health", expected_status: 200 },
          domains: ["api.localhost"],
          source: { type: "github", repo: "owner/api", branch: "main", auto_deploy: { enabled: false, branches: ["main"] } }
        }
      ],
      services: [
        {
          name: "postgres",
          preset: "postgres",
          driver: "compose",
          image: "postgres:16",
          port: 5432,
          internal: true,
          enabled: false,
          env: { POSTGRES_DB: "app", POSTGRES_PASSWORD: "hidden" },
          volumes: ["postgres_data:/var/lib/postgresql/data"]
        }
      ]
    });

    expect(config.apps[0]).toMatchObject({
      driver: "compose",
      compose_file: "./compose.yml",
      compose_service: "api",
      enabled: false,
      depends_on: ["postgres"],
      domains: ["api.localhost"]
    });
    expect(config.services[0]).toMatchObject({ type: "database", preset: "postgres", enabled: false });

    const appExport = appToConfigEntry(config.apps[0]);
    expect(appExport).toMatchObject({
      driver: "compose",
      compose_file: "./compose.yml",
      compose_service: "api",
      enabled: false,
      env: { PUBLIC_URL: "http://localhost:8000" }
    });
    expect(appExport.env).not.toHaveProperty("API_TOKEN");

    const serviceExport = appToConfigEntry(config.services[0]);
    expect(serviceExport).toMatchObject({
      type: "database",
      preset: "postgres",
      driver: "compose",
      image: "postgres:16",
      internal: true,
      enabled: false,
      env: { POSTGRES_DB: "app" }
    });
    expect(serviceExport.env).not.toHaveProperty("POSTGRES_PASSWORD");

    const dto = appToPublicDto({ id: 1, server_id: 1, created_at: "", updated_at: "", status: "stopped", ...config.apps[0] });
    expect(dto.env).toEqual({ PUBLIC_URL: "http://localhost:8000" });
    expect(dto.envKeys).toEqual(["API_TOKEN", "PUBLIC_URL"]);
    expect(dto.enabled).toBe(false);
    expect(dto.composeFile).toBe("./compose.yml");
    expect(dto.composeService).toBe("api");
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

    const web = buildComposeConfig({
      id: 2,
      server_id: 1,
      name: "web",
      type: "app",
      preset: "custom",
      driver: "compose",
      path: null,
      command: null,
      install: null,
      dev: null,
      build: null,
      start: null,
      env: {},
      envKeys: [],
      port: 3000,
      ports: [3000, 3001],
      depends_on: [],
      healthcheck: null,
      domains: [],
      source: null,
      image: "example/web:latest",
      internal: false,
      volumes: [],
      compose_file: null,
      compose_service: null,
      status: "stopped",
      enabled: true,
      created_at: "",
      updated_at: ""
    });
    expect((web.services as Record<string, { ports?: string[] }>).web.ports).toEqual(["3000:3000", "3001:3001"]);
  });
});
