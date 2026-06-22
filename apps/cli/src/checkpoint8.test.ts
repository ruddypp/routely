import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appEnvVarToPublicDto, filterExportableEnv, isSecretEnvKey, mergeAppEnv, normalizeAppEnvInput, redactSecrets } from "@routely/core";
import {
  appEnvPendingState,
  clearAppEnvPendingFlags,
  deleteAppEnvVar,
  initializeRoutely,
  listAppEnvVars,
  listSecretValuesForApp,
  updateApp,
  upsertApp,
  upsertAppEnvVar
} from "@routely/db";

describe("checkpoint 8 environment, secrets, and app settings", () => {
  it("redacts configured secret values from log text", () => {
    const output = redactSecrets("connecting with postgres://user:secret@db and token abc123", ["postgres://user:secret@db", "abc123"]);

    expect(output).toBe("connecting with [redacted] and token [redacted]");
  });

  it("classifies common URL, DSN, and URI connection env keys as secrets by default", () => {
    const secretKeys = ["DATABASE_URL", "REDIS_URL", "MONGODB_URI", "POSTGRES_URL", "MYSQL_URL", "SENTRY_DSN", "WEBHOOK_URL", "PROVIDER_DSN"];

    for (const key of secretKeys) {
      expect(isSecretEnvKey(key)).toBe(true);
      expect(normalizeAppEnvInput({ key, value: "postgres://user:pass@example.com/db" }).isSecret).toBe(true);
      expect(normalizeAppEnvInput({ key, value: "postgres://user:pass@example.com/db", isSecret: false }).isSecret).toBe(true);
    }

    expect(isSecretEnvKey("PUBLIC_URL")).toBe(false);
    expect(normalizeAppEnvInput({ key: "PUBLIC_URL", value: "https://example.com" }).isSecret).toBe(false);
    expect(appEnvVarToPublicDto({ id: 1, app_id: 1, key: "DATABASE_URL", value: "postgres://user:pass@example.com/db", is_secret: 0, scope: "all", needs_restart: 1, needs_redeploy: 1, created_at: "", updated_at: "" })).toMatchObject({
      value: null,
      displayValue: "[redacted]",
      isSecret: true
    });
    expect(filterExportableEnv({ DATABASE_URL: "postgres://user:pass@example.com/db", PUBLIC_URL: "https://example.com" })).toEqual({ PUBLIC_URL: "https://example.com" });
  });

  it("merges routely.yml env with stored app env by scope using stored values as overrides", () => {
    const mergedLocal = mergeAppEnv(
      { NODE_ENV: "development", API_URL: "http://localhost" },
      [
        { id: 1, app_id: 1, key: "API_URL", value: "https://api.example.com", is_secret: false, scope: "all", needs_restart: true, needs_redeploy: true, created_at: "", updated_at: "" },
        { id: 2, app_id: 1, key: "PROD_ONLY", value: "1", is_secret: false, scope: "production", needs_restart: true, needs_redeploy: true, created_at: "", updated_at: "" }
      ],
      { scope: "local" }
    );

    expect(mergedLocal).toEqual({ NODE_ENV: "development", API_URL: "https://api.example.com" });
  });

  it("persists env vars, hides secret values in public DTOs, and tracks pending restart/redeploy state", async () => {
    const root = await mkdtemp(join(tmpdir(), "routely-env-state-"));
    const { db } = initializeRoutely(root);
    const app = upsertApp(db, { name: "web", driver: "dockerfile", path: root, port: 3000, env: { NODE_ENV: "production" } });

    const plain = upsertAppEnvVar(db, app.id, { key: "PUBLIC_URL", value: "https://example.com", isSecret: false });
    const secret = upsertAppEnvVar(db, app.id, { key: "DATABASE_URL", value: "postgres://secret", isSecret: true });
    const rows = listAppEnvVars(db, app.id);

    expect(rows.map((row) => row.key)).toEqual(["DATABASE_URL", "PUBLIC_URL"]);
    expect(appEnvVarToPublicDto(secret!).value).toBeNull();
    expect(appEnvVarToPublicDto(secret!).displayValue).toBe("[redacted]");
    expect(JSON.stringify(appEnvVarToPublicDto(secret!))).not.toContain("postgres://secret");
    expect(appEnvVarToPublicDto(plain!).value).toBe("https://example.com");
    expect(listSecretValuesForApp(db, app.id)).toEqual(["postgres://secret"]);
    expect(appEnvPendingState(db, app.id)).toEqual({ count: 2, needsRestart: true, needsRedeploy: true });

    clearAppEnvPendingFlags(db, app.id, { restart: true });
    expect(appEnvPendingState(db, app.id)).toEqual({ count: 2, needsRestart: false, needsRedeploy: true });

    expect(deleteAppEnvVar(db, app.id, "PUBLIC_URL")).toBe(true);
    expect(listAppEnvVars(db, app.id).map((row) => row.key)).toEqual(["DATABASE_URL"]);
    expect(appEnvPendingState(db, app.id)).toEqual({ count: 1, needsRestart: true, needsRedeploy: true });
    db.close();
  });

  it("redacts legacy connection-string env rows even when stored as non-secret", async () => {
    const root = await mkdtemp(join(tmpdir(), "routely-env-legacy-secret-"));
    const { db } = initializeRoutely(root);
    const app = upsertApp(db, { name: "api", driver: "command", path: root, command: "npm run dev" });
    const legacy = upsertAppEnvVar(db, app.id, { key: "LEGACY_REDIS_URL", value: "redis://:pass@example.com:6379/0", isSecret: false });
    db.prepare("UPDATE app_env_vars SET key = ?, is_secret = 0 WHERE id = ?").run("REDIS_URL", legacy?.id);
    const row = db.prepare("SELECT * FROM app_env_vars WHERE id = ?").get(legacy?.id);

    expect(row?.is_secret).toBe(0);
    expect(appEnvVarToPublicDto(row!).isSecret).toBe(true);
    expect(appEnvVarToPublicDto(row!).value).toBeNull();
    expect(listSecretValuesForApp(db, app.id)).toEqual(["redis://:pass@example.com:6379/0"]);
    db.close();
  });

  it("marks app settings changes as needing restart and redeploy", async () => {
    const root = await mkdtemp(join(tmpdir(), "routely-settings-state-"));
    const { db } = initializeRoutely(root);
    const app = upsertApp(db, { name: "api", driver: "command", path: root, command: "npm run dev", port: 4000 });

    expect(appEnvPendingState(db, app.id)).toEqual({ count: 0, needsRestart: false, needsRedeploy: false });

    updateApp(db, app.id, { command: "npm run start" });

    expect(appEnvPendingState(db, app.id)).toEqual({ count: 0, needsRestart: true, needsRedeploy: true });
    db.close();
  });
});
