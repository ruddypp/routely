import { describe, expect, it } from "vitest";
import { appFormFromDaemonApp, appFormPayload, appFormValidationError, blankAppForm, type AppFormSource } from "../../lib/app-registry-form";

const baseApp: AppFormSource = {
  name: "api",
  type: "app",
  preset: "custom",
  driver: "command",
  path: "/srv/api",
  command: "npm run dev",
  install: null,
  dev: "npm run dev",
  build: null,
  start: null,
  env: { NODE_ENV: "development" },
  port: 3000,
  dependsOn: ["postgres"],
  healthcheck: { path: "/health", expected_status: 200 },
  domains: ["api.example.test"],
  source: null,
  image: null,
  internal: false,
  volumes: [],
  composeFile: null,
  composeService: null,
  enabled: true
};

describe("app registry form payload", () => {
  it("normalizes Compose registry fields without retaining command-driver scripts", () => {
    const payload = appFormPayload({
      ...blankAppForm,
      name: "postgres",
      type: "database",
      preset: "postgres",
      driver: "compose",
      command: "npm run dev",
      install: "npm install",
      dev: "npm run dev",
      build: "npm run build",
      start: "npm run start",
      env: "POSTGRES_DB=app",
      port: "5432",
      enabled: false,
      dependsOn: "redis, worker",
      healthcheckPath: "/ready",
      healthcheckStatus: "204",
      domains: "db.internal.test",
      sourceRepo: "owner/api",
      sourceBranch: "main",
      sourceAutoDeployConfigured: true,
      sourceAutoDeployEnabled: false,
      sourceAutoDeployBranches: "main, release",
      image: "postgres:16",
      internal: true,
      volumes: "postgres_data:/var/lib/postgresql/data",
      composeFile: "./compose.yml",
      composeService: "postgres"
    });

    expect(payload).toMatchObject({
      name: "postgres",
      type: "database",
      preset: "postgres",
      driver: "compose",
      command: null,
      install: null,
      dev: null,
      build: null,
      start: null,
      env: { POSTGRES_DB: "app" },
      port: 5432,
      enabled: false,
      depends_on: ["redis", "worker"],
      healthcheck: { path: "/ready", expected_status: 204 },
      domains: ["db.internal.test"],
      source: {
        type: "github",
        repo: "owner/api",
        branch: "main",
        auto_deploy: { enabled: false, branches: ["main", "release"] }
      },
      image: "postgres:16",
      internal: true,
      volumes: ["postgres_data:/var/lib/postgresql/data"],
      compose_file: "./compose.yml",
      compose_service: "postgres"
    });
  });

  it("omits env on locked edit forms so stored metadata is preserved", () => {
    const form = appFormFromDaemonApp({
      ...baseApp,
      env: {},
      envKeys: ["DATABASE_URL", "NODE_ENV"],
      source: { type: "github", repo: "owner/api", branch: "main", auto_deploy: { enabled: true, branches: ["main"] } }
    });
    const payload = appFormPayload(form);

    expect(form.envLocked).toBe(true);
    expect(form.env).toContain("DATABASE_URL=[stored]");
    expect(payload).not.toHaveProperty("env");
    expect(payload.source).toEqual({
      type: "github",
      repo: "owner/api",
      branch: "main",
      auto_deploy: { enabled: true, branches: ["main"] }
    });
  });

  it("returns actionable validation errors for unsupported incomplete driver metadata", () => {
    expect(appFormValidationError({ ...blankAppForm, name: "api", driver: "command" })).toBe("Command driver needs a command, dev, or start command.");
    expect(appFormValidationError({ ...blankAppForm, name: "api", driver: "compose" })).toBe("Compose driver needs a Compose service name.");
    expect(appFormValidationError({ ...blankAppForm, name: "api", command: "npm run dev", sourceBranch: "main" })).toBe("Source repo is required when source branch or auto-deploy metadata is set.");
  });
});
