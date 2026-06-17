import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  defaultProductionDataDir,
  generateAdminToken,
  hashAdminToken,
  runServerDoctorChecks,
  verifyAdminToken
} from "@routely/core";
import { getServerFoundationState, initializeRoutely, saveServerFoundationState } from "@routely/db";

describe("checkpoint 4 server foundation", () => {
  it("hashes and verifies first-run admin tokens", () => {
    const token = generateAdminToken();
    const hashed = hashAdminToken(token, "fixed-salt");

    expect(token.length).toBeGreaterThan(24);
    expect(hashed.hash).not.toContain(token);
    expect(verifyAdminToken(token, hashed.salt, hashed.hash)).toBe(true);
    expect(verifyAdminToken("wrong", hashed.salt, hashed.hash)).toBe(false);
  });

  it("persists production mode and auth metadata in settings", async () => {
    const root = await mkdtemp(join(tmpdir(), "routely-server-state-"));
    const { db } = initializeRoutely(root);

    saveServerFoundationState(db, {
      mode: "production",
      dataDir: join(root, "data"),
      initializedAt: "2026-06-18T00:00:00.000Z",
      adminTokenHash: "hash",
      adminTokenSalt: "salt",
      adminTokenCreatedAt: "2026-06-18T00:00:00.000Z"
    });

    const state = getServerFoundationState(db);
    expect(state.production).toBe(true);
    expect(state.auth.required).toBe(true);
    expect(state.auth.configured).toBe(true);
    expect(state.dataDir).toContain("data");
    db.close();
  });

  it("returns serializable server doctor checks", async () => {
    const root = await mkdtemp(join(tmpdir(), "routely-server-doctor-"));
    const dataDir = defaultProductionDataDir(root);
    const doctor = await runServerDoctorChecks({ workspaceRoot: root, dataDir, ports: [0], createDataDir: true });

    expect(doctor.dataDir).toBe(dataDir);
    expect(doctor.checks.some((check) => check.id === "data-dir")).toBe(true);
    expect(doctor.checks.some((check) => check.id === "memory")).toBe(true);
    expect(JSON.parse(JSON.stringify(doctor))).toEqual(doctor);
  });
});

