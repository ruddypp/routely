import { describe, expect, it } from "vitest";
import { appFormFromDaemonApp, appFormPayload, blankAppForm, type AppFormSource } from "../../lib/app-registry-form";

describe("dashboard app registry form payload", () => {
  it("serializes Compose-first app registry fields", () => {
    const payload = appFormPayload({
      ...blankAppForm,
      name: "api",
      type: "app",
      preset: "express",
      driver: "compose",
      path: "./apps/api",
      port: "4000",
      enabled: false,
      dependsOn: "postgres, redis",
      healthcheckPath: "/health",
      healthcheckStatus: "204",
      domains: "api.example.test, api.localhost",
      sourceRepo: "owner/api",
      sourceBranch: "main",
      image: "ghcr.io/example/api:latest",
      env: "PUBLIC_API_URL=https://api.example.test\nFEATURE_FLAG=true",
      volumes: "api-cache:/cache",
      composeFile: "compose.yml",
      composeService: "api"
    });

    expect(payload).toMatchObject({
      name: "api",
      type: "app",
      preset: "express",
      driver: "compose",
      path: "./apps/api",
      port: 4000,
      enabled: false,
      depends_on: ["postgres", "redis"],
      healthcheck: { path: "/health", expected_status: 204 },
      domains: ["api.example.test", "api.localhost"],
      source: { type: "github", repo: "owner/api", branch: "main" },
      image: "ghcr.io/example/api:latest",
      env: { PUBLIC_API_URL: "https://api.example.test", FEATURE_FLAG: "true" },
      volumes: ["api-cache:/cache"],
      compose_file: "compose.yml",
      compose_service: "api"
    });
  });

  it("omits redacted stored env values so edit saves preserve daemon state", () => {
    const form = appFormFromDaemonApp(appSource({
      type: "database",
      driver: "compose",
      env: {},
      envKeys: ["POSTGRES_DB", "POSTGRES_PASSWORD"],
      internal: true,
      composeFile: "compose.yml",
      composeService: "postgres",
      enabled: false
    }));

    const payload = appFormPayload({ ...form, port: "5432" });

    expect(form.envLocked).toBe(true);
    expect(form.env).toContain("POSTGRES_PASSWORD=[stored]");
    expect(payload).not.toHaveProperty("env");
    expect(payload).toMatchObject({
      enabled: false,
      port: 5432,
      compose_file: "compose.yml",
      compose_service: "postgres"
    });
  });

  it("preserves GitHub auto-deploy metadata when editing a source app", () => {
    const form = appFormFromDaemonApp(appSource({
      source: {
        type: "github",
        repo: "owner/api",
        branch: "main",
        auto_deploy: { enabled: false, branches: ["main", "release"] }
      }
    }));

    expect(appFormPayload(form)).toMatchObject({
      source: {
        type: "github",
        repo: "owner/api",
        branch: "main",
        auto_deploy: { enabled: false, branches: ["main", "release"] }
      }
    });
  });
});

function appSource(overrides: Partial<AppFormSource> = {}): AppFormSource {
  return {
    name: "api",
    type: "app",
    preset: "custom",
    driver: "command",
    path: "/workspace/api",
    command: "npm run dev",
    install: null,
    dev: "npm run dev",
    build: null,
    start: null,
    env: { NODE_ENV: "development" },
    port: 4000,
    dependsOn: [],
    healthcheck: null,
    domains: [],
    source: null,
    image: null,
    internal: false,
    volumes: [],
    composeFile: null,
    composeService: null,
    enabled: true,
    ...overrides
  };
}
