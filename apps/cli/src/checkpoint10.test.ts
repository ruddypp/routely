import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  backupJobToPublicDto,
  backupRunToPublicDto,
  backupScheduleDue,
  databaseToPublicDto,
  loadWorkspaceConfig,
  normalizeBackupSchedule,
  selectBackupRunsForRetention
} from "@routely/core";
import {
  createBackupRun,
  getDatabaseByName,
  getBackupJobForDatabase,
  initializeRoutely,
  listBackupRuns,
  listDatabases,
  syncWorkspaceConfig,
  updateBackupRun,
  upsertBackupJob,
  upsertDatabase
} from "@routely/db";

describe("checkpoint 10 databases and backups", () => {
  it("validates schedules and detects due jobs", () => {
    expect(normalizeBackupSchedule("0 2 * * *")).toBe("0 2 * * *");
    expect(backupScheduleDue("0 2 * * *", new Date("2026-06-18T02:00:00.000Z"))).toBe(true);
    expect(backupScheduleDue("@daily", new Date("2026-06-18T02:00:00.000Z"))).toBe(true);
    expect(() => normalizeBackupSchedule("99 2 * * *")).toThrow(/outside/);
  });

  it("selects only expired successful backup files for retention pruning", () => {
    const now = new Date("2026-06-18T00:00:00.000Z");
    const runs = [
      { id: 1, status: "succeeded", file_path: "/tmp/old.sql", finished_at: "2026-06-01T00:00:00.000Z" },
      { id: 2, status: "succeeded", file_path: "/tmp/new.sql", finished_at: "2026-06-17T00:00:00.000Z" },
      { id: 3, status: "failed", file_path: "/tmp/failed.sql", finished_at: "2026-06-01T00:00:00.000Z" }
    ];

    expect(selectBackupRunsForRetention(runs, 7, now).map((run) => run.id)).toEqual([1]);
  });

  it("persists database records and backup run state without exposing env values", async () => {
    const root = await mkdtemp(join(tmpdir(), "routely-backup-state-"));
    const { db } = initializeRoutely(root);
    const database = upsertDatabase(db, {
      name: "postgres",
      type: "postgres",
      status: "running",
      image: "postgres:16",
      port: 5432,
      env: { POSTGRES_PASSWORD: "secret", POSTGRES_DB: "app" }
    });
    const job = upsertBackupJob(db, { databaseId: database.id, schedule: "0 2 * * *", retentionDays: 3 });
    const run = createBackupRun(db, { backupJobId: job.id, trigger: "manual" });
    const finished = updateBackupRun(db, run.id, {
      status: "succeeded",
      filePath: "/tmp/postgres.sql",
      sizeBytes: 12,
      message: "completed backup with password secret",
      finishedAt: "2026-06-18T00:00:00.000Z"
    });
    const publicAttempt = upsertDatabase(db, { name: "public-postgres", type: "postgres", internal: false });

    expect(listDatabases(db)).toHaveLength(2);
    expect(databaseToPublicDto(database).envKeys).toEqual(["POSTGRES_DB", "POSTGRES_PASSWORD"]);
    expect(JSON.stringify(databaseToPublicDto(database))).not.toContain("secret");
    expect(databaseToPublicDto(publicAttempt).internal).toBe(true);
    const jobDto = backupJobToPublicDto(getBackupJobForDatabase(db, database.id)!);
    expect(jobDto.schedule).toBe("0 2 * * *");
    expect(jobDto.storageType).toBe("local");
    expect(jobDto.restoreStatus).toBe("deferred");
    const runDto = backupRunToPublicDto(finished!);
    expect(runDto).not.toHaveProperty("filePath");
    expect(JSON.stringify(runDto)).not.toContain("/tmp/postgres.sql");
    expect(runDto.fileName).toBe("postgres.sql");
    expect(runDto.file.available).toBe(true);
    expect(runDto.file.servesFile).toBe(false);
    expect(runDto.downloadUrl).toBeNull();
    expect(runDto.message).not.toContain("secret");
    expect(runDto.message).toContain("[redacted]");
    expect(backupRunToPublicDto({ ...finished!, status: "failed" }).file.available).toBe(false);
    expect(listBackupRuns(db)).toHaveLength(1);
    db.close();
  });

  it("syncs database services into internal-only database records", async () => {
    const root = await mkdtemp(join(tmpdir(), "routely-database-sync-"));
    await writeFile(join(root, "routely.yml"), `version: 1
name: db-sync
apps: []
services:
  - name: postgres
    type: database
    preset: postgres
    driver: compose
    image: postgres:16
    port: 5432
    internal: false
    env:
      POSTGRES_DB: app
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres_data:/var/lib/postgresql/data
`, "utf8");

    const loaded = loadWorkspaceConfig(root)!;
    const { db } = initializeRoutely(root);
    expect(syncWorkspaceConfig(db, loaded)).toEqual(["postgres"]);

    const database = getDatabaseByName(db, "postgres")!;
    const dto = databaseToPublicDto(database);
    expect(dto.internal).toBe(true);
    expect(dto.connectionScope).toBe("internal-only");
    expect(dto.volumeName).toBe("postgres_data");
    expect(dto.envKeys).toEqual(["POSTGRES_DB", "POSTGRES_PASSWORD"]);
    expect(JSON.stringify(dto)).not.toContain("secret");
    db.close();
  });
});
