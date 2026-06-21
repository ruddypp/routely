import type { ChildProcess, StdioOptions } from "node:child_process";
import type { RoutelyAppRecord } from "@routely/core";

export interface StartCommandAppOptions {
  env?: Record<string, string>;
  stdio?: StdioOptions;
}

export interface ComposeServiceOptions {
  project?: string;
  env?: Record<string, string>;
  stdio?: StdioOptions;
}

export interface DockerCommandOptions {
  cwd?: string;
  env?: Record<string, string>;
  stdio?: StdioOptions;
}

export const routelyDriversVersion: string;
export function startCommandApp(app: RoutelyAppRecord, options?: StartCommandAppOptions): ChildProcess;
export function buildComposeConfig(app: RoutelyAppRecord): Record<string, unknown>;
export function composeConfigToYaml(config: Record<string, unknown>): string;
export function writeComposeConfig(app: RoutelyAppRecord, workspaceRoot: string): string;
export function resolveComposeFile(app: RoutelyAppRecord, workspaceRoot: string): string;
export function composeProjectName(workspaceRoot: string): string;
export function composeUpArgs(options: { project: string; composeFile: string; serviceName: string }): string[];
export function composeStopArgs(options: { project: string; composeFile: string; serviceName: string }): string[];
export function composePsRunningArgs(options: { project: string; composeFile: string; serviceName: string }): string[];
export function startComposeService(app: RoutelyAppRecord, workspaceRoot: string, options?: ComposeServiceOptions): ChildProcess;
export function stopComposeService(app: RoutelyAppRecord, workspaceRoot: string, options?: ComposeServiceOptions): ChildProcess;
export function buildDockerfileImageTag(appName: string, deploymentId: number): string;
export function buildDockerfileContainerName(appName: string, deploymentId: number): string;
export function dockerBuildArgs(options: { context: string; dockerfile: string; imageTag: string }): string[];
export function dockerRunArgs(options: {
  containerName: string;
  imageTag: string;
  hostPort: number;
  containerPort: number;
  env?: Record<string, string>;
}): string[];
export function dockerRemoveContainerArgs(containerName: string): string[];
export function dockerInspectRunningArgs(containerName: string): string[];
export function spawnDocker(args: string[], options?: DockerCommandOptions): ChildProcess;
