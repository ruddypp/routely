import type { ChildProcess } from "node:child_process";
import type { RoutelyAppRecord } from "@routely/core";

export interface StartCommandAppOptions {
  env?: Record<string, string>;
  stdio?: "inherit" | "pipe" | "ignore";
}

export const routelyDriversVersion: string;
export function startCommandApp(app: RoutelyAppRecord, options?: StartCommandAppOptions): ChildProcess;
