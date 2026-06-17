import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { appToConfigEntry, normalizeWorkspaceConfig } from "./index.js";

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

export function readRawWorkspaceConfig(root) {
  const configPath = resolveWorkspaceConfigPath(root) || resolve(root, "routely.yml");
  if (!existsSync(configPath)) {
    return { configPath, raw: { version: 1, name: "routely-local", apps: [], services: [] } };
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

  return { configPath, raw };
}

export function upsertWorkspaceConfigEntry(root, input, sectionName) {
  const { configPath, raw } = readRawWorkspaceConfig(root);
  const entry = appToConfigEntry(input);
  const section = sectionName || (entry.type === "app" || entry.type === "worker" || entry.type === "static" ? "apps" : "services");
  const list = Array.isArray(raw[section]) ? raw[section] : [];
  const existingIndex = list.findIndex((item) => item && item.name === entry.name);

  if (existingIndex >= 0) {
    list[existingIndex] = { ...list[existingIndex], ...entry };
  } else {
    list.push(entry);
  }

  raw.version = Number(raw.version || 1);
  raw.name = raw.name || "routely-local";
  raw.apps = Array.isArray(raw.apps) ? raw.apps : [];
  raw.services = Array.isArray(raw.services) ? raw.services : [];
  raw[section] = list;

  writeFileSync(configPath, stringifyYaml(raw), "utf8");
  return { configPath, entry, section };
}
