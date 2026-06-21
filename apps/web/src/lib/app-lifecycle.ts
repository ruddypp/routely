export type AppLifecycleAction = "start" | "stop" | "restart";

export type AppLifecycleResource = {
  driver: string;
  enabled: boolean;
  status: string;
};

export type BulkStartPlan = {
  startableCount: number;
  stoppedStartableCount: number;
  disabledCount: number;
  deferredCount: number;
  alreadyRunningCount: number;
};

const BULK_START_DRIVERS = new Set(["command", "compose"]);

export function isAppRuntimeRunning(app: AppLifecycleResource) {
  return app.status === "running" || app.status === "starting";
}

export function appSupportsBulkStart(app: AppLifecycleResource) {
  return BULK_START_DRIVERS.has(app.driver);
}

export function bulkStartSkipReason(app: AppLifecycleResource) {
  if (!app.enabled) return "skipped by Start All: disabled in registry";
  if (!appSupportsBulkStart(app)) return `skipped by Start All: ${app.driver} driver deferred`;
  if (isAppRuntimeRunning(app)) return "Start All skips already running resources";
  return null;
}

export function bulkStartStateLabel(app: AppLifecycleResource) {
  if (!app.enabled) return "Start All skips: disabled";
  if (!appSupportsBulkStart(app)) return `Start All deferred: ${app.driver}`;
  if (isAppRuntimeRunning(app)) return "Start All skips: running";
  return "Start All ready";
}

export function startAllPlan(apps: AppLifecycleResource[]): BulkStartPlan {
  const startable = apps.filter((app) => app.enabled && appSupportsBulkStart(app));
  const alreadyRunning = startable.filter(isAppRuntimeRunning);

  return {
    startableCount: startable.length,
    stoppedStartableCount: startable.length - alreadyRunning.length,
    disabledCount: apps.filter((app) => !app.enabled).length,
    deferredCount: apps.filter((app) => app.enabled && !appSupportsBulkStart(app)).length,
    alreadyRunningCount: alreadyRunning.length
  };
}

export function startAllBlockReason(apps: AppLifecycleResource[], connected: boolean, busy: boolean) {
  if (busy) return "Start All is already running";
  if (!connected) return "daemon offline; CLI fallback: routely up";

  const plan = startAllPlan(apps);
  if (apps.length === 0) return "no resources registered";
  if (plan.stoppedStartableCount > 0) return null;
  if (plan.startableCount === 0) return "no enabled command or Compose resources";
  return "all enabled command and Compose resources are already running";
}

export function appActionBlockReason(app: AppLifecycleResource, action: AppLifecycleAction, connected: boolean, busy: boolean) {
  if (busy) return "another lifecycle action is running";
  if (!connected) return "daemon offline";

  if (action === "stop") {
    return isAppRuntimeRunning(app) ? null : "resource is not running";
  }

  if (!app.enabled) return "disabled resources are skipped by Start All until re-enabled";
  if (!appSupportsBulkStart(app)) return `${app.driver} lifecycle is deferred`;
  if (action === "start" && isAppRuntimeRunning(app)) return "resource is already running";

  return null;
}
