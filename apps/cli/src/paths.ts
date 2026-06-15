import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type PathEnvironment = {
  ROUTELY_REPO_ROOT?: string;
  ROUTELY_WORKSPACE_ROOT?: string;
};

export function readDevRoot(cliDir: string): string | null {
  const rootFile = resolve(cliDir, "dev-root.json");

  if (!existsSync(rootFile)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(rootFile, "utf8")) as { root?: string };
    return parsed.root || null;
  } catch {
    return null;
  }
}

export function resolveInstallRoot(cliDir: string, env: PathEnvironment = process.env): string {
  if (env.ROUTELY_REPO_ROOT) {
    return resolve(env.ROUTELY_REPO_ROOT);
  }

  const devRoot = readDevRoot(cliDir);
  if (devRoot) {
    return resolve(devRoot);
  }

  return resolve(cliDir, "../../..");
}

export function resolveWorkspaceRoot(cwd: string, env: PathEnvironment = process.env): string {
  if (env.ROUTELY_WORKSPACE_ROOT) {
    return resolve(env.ROUTELY_WORKSPACE_ROOT);
  }

  return resolve(cwd);
}
