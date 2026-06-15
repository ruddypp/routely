import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readDevRoot, resolveInstallRoot, resolveWorkspaceRoot } from "./paths.js";

const tempDirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "routely-cli-paths-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("CLI path resolution", () => {
  it("uses ROUTELY_REPO_ROOT as the install root override", () => {
    expect(resolveInstallRoot("/tmp/ignored", { ROUTELY_REPO_ROOT: "/opt/routely" })).toBe("/opt/routely");
  });

  it("uses dev-root.json when no install root override exists", () => {
    const dir = tempDir();
    writeFileSync(join(dir, "dev-root.json"), JSON.stringify({ root: "/home/user/routely" }), "utf8");

    expect(readDevRoot(dir)).toBe("/home/user/routely");
    expect(resolveInstallRoot(dir, {})).toBe("/home/user/routely");
  });

  it("uses current working directory as the default workspace root", () => {
    expect(resolveWorkspaceRoot("/home/user/project", {})).toBe("/home/user/project");
  });

  it("uses ROUTELY_WORKSPACE_ROOT as the workspace override", () => {
    expect(resolveWorkspaceRoot("/home/user/project", { ROUTELY_WORKSPACE_ROOT: "/srv/app" })).toBe("/srv/app");
  });
});
