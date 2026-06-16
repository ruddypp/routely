import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getAppByName,
  initializeRoutely,
  listRunningRuntimeInstances,
  reconcileStaleRuntimeInstances,
  recordRuntimeStart,
  upsertApp
} from "@routely/db";

const tempDirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "routely-runtime-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("runtime reconciliation", () => {
  it("marks runtime rows stopped when their PID is stale", () => {
    const { db } = initializeRoutely(tempDir());
    const app = upsertApp(db, {
      name: "api",
      command: "npm run dev",
      status: "stopped"
    });
    recordRuntimeStart(db, app.id, 123456);

    const stale = reconcileStaleRuntimeInstances(db, () => false);

    expect(stale).toHaveLength(1);
    expect(listRunningRuntimeInstances(db)).toEqual([]);
    expect(getAppByName(db, "api")?.status).toBe("stopped");
    db.close();
  });

  it("keeps runtime rows running when their PID is alive", () => {
    const { db } = initializeRoutely(tempDir());
    const app = upsertApp(db, {
      name: "api",
      command: "npm run dev",
      status: "stopped"
    });
    recordRuntimeStart(db, app.id, 123456);

    const stale = reconcileStaleRuntimeInstances(db, () => true);

    expect(stale).toEqual([]);
    expect(listRunningRuntimeInstances(db)).toHaveLength(1);
    expect(getAppByName(db, "api")?.status).toBe("running");
    db.close();
  });
});
