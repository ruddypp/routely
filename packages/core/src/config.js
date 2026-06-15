import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { normalizeWorkspaceConfig } from "./index.js";

export const WORKSPACE_CONFIG_FILENAMES = ["routely.yml", "routely.yaml"];

/**
 * Resolve the path to the first existing workspace config file in `root`.
 * Returns null when no config file is present.
 */
export function resolveWorkspaceConfigPath(root) {
  for (const filename of WORKSPACE_CONFIG_FILENAMES) {
    const candidate = resolve(root, filename);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Load and normalize the workspace config (routely.yml) from `root`.
 * Returns { config, configPath } or null when no config file exists.
 * Throws a descriptive error when the file exists but cannot be parsed.
 */
export function loadWorkspaceConfig(root) {
  const configPath = resolveWorkspaceConfigPath(root);

  if (!configPath) {
    return null;
  }

  let raw;
  try {
    raw = parseYaml(readFileSync(configPath, "utf8")) || {};
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse ${configPath}: ${reason}`);
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`Invalid workspace config in ${configPath}: expected a YAML mapping.`);
  }

  return { config: normalizeWorkspaceConfig(raw), configPath };
}
