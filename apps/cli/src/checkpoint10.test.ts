import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  backupJobToPublicDto,
  backupRunToPublicDto,
  backupScheduleDue,
  databaseToPublicDto,
  normalizeBackupSchedule,
  selectBackupRunsForRetention
} from "@routely/core";
import {
  createBackupRun,
  getBackupJobForDatabase,
  initializeRoutely,
  listBackupRuns,
  listDatabases,
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
    const finished = updateBackupRun(db, run.id, { status: "succeeded", filePath: "/tmp/postgres.sql", sizeBytes: 12, finishedAt: "2026-06-18T00:00:00.000Z" });

    expect(listDatabases(db)).toHaveLength(1);
    expect(databaseToPublicDto(database).envKeys).toEqual(["POSTGRES_DB", "POSTGRES_PASSWORD"]);
    expect(JSON.stringify(databaseToPublicDto(database))).not.toContain("secret");
    expect(backupJobToPublicDto(getBackupJobForDatabase(db, database.id)!).schedule).toBe("0 2 * * *");
    expect(backupRunToPublicDto(finished!).filePath).toBe("/tmp/postgres.sql");
    expect(listBackupRuns(db)).toHaveLength(1);
    db.close();
  });
});
