import { spawn } from "node:child_process";

export const routelyDriversVersion = "0.1.0";

export function startCommandApp(app, options = {}) {
  if (app.driver !== "command") {
    throw new Error(`Unsupported driver for local command runner: ${app.driver}`);
  }

  if (!app.command) {
    throw new Error(`App ${app.name} does not have a command configured.`);
  }

  const child = spawn(app.command, {
    cwd: app.path || process.cwd(),
    env: { ...process.env, ...(options.env || {}) },
    detached: process.platform !== "win32",
    shell: true,
    stdio: options.stdio || "inherit"
  });

  return child;
}
