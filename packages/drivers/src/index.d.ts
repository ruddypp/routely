import type { ChildProcess, StdioOptions } from "node:child_process";
import type { RoutelyAppRecord } from "@routely/core";

export interface StartCommandAppOptions {
  env?: Record<string, string>;
  stdio?: StdioOptions;
}

export interface ComposeServiceOptions {
  project?: string;
  stdio?: StdioOptions;
}

export const routelyDriversVersion: string;
export function startCommandApp(app: RoutelyAppRecord, options?: StartCommandAppOptions): ChildProcess;
export function buildComposeConfig(app: RoutelyAppRecord): Record<string, unknown>;
export function composeConfigToYaml(config: Record<string, unknown>): string;
export function writeComposeConfig(app: RoutelyAppRecord, workspaceRoot: string): string;
export function startComposeService(app: RoutelyAppRecord, workspaceRoot: string, options?: ComposeServiceOptions): ChildProcess;
export function stopComposeService(app: RoutelyAppRecord, workspaceRoot: string, options?: ComposeServiceOptions): ChildProcess;
