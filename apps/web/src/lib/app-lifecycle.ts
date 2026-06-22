export type AppLifecycleAction = "start" | "stop" | "restart";
export type AppEnablementAction = "enable" | "disable";

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
const NEEDS_SETUP_STATUSES = new Set(["draft", "incomplete", "missing", "needs-fix", "needs-setup", "unverified"]);
const FAILED_SETUP_STATUSES = new Set(["failed", "invalid", "setup-failed", "verification-failed"]);

function normalizedStatus(status: string) {
  return status.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

export function appSetupBlockReason(app: AppLifecycleResource) {
  const status = normalizedStatus(app.status || "");
  if (NEEDS_SETUP_STATUSES.has(status)) return "setup verification must pass before this resource can start";
  if (FAILED_SETUP_STATUSES.has(status)) return "last setup failed; fix configuration and verify before starting";
  return null;
}

export function isAppRuntimeRunning(app: AppLifecycleResource) {
  return app.status === "running" || app.status === "starting";
}

export function appSupportsBulkStart(app: AppLifecycleResource) {
  return BULK_START_DRIVERS.has(app.driver);
}

export function bulkStartSkipReason(app: AppLifecycleResource) {
  if (!app.enabled) return "skipped by Start All: disabled in registry";
  if (!appSupportsBulkStart(app)) return `skipped by Start All: ${app.driver} driver deferred`;
  const setupBlockReason = appSetupBlockReason(app);
  if (setupBlockReason) return `skipped by Start All: ${setupBlockReason}`;
  if (isAppRuntimeRunning(app)) return "Start All skips already running resources";
  return null;
}

export function bulkStartStateLabel(app: AppLifecycleResource) {
  if (!app.enabled) return "Start All skips: disabled";
  if (!appSupportsBulkStart(app)) return `Start All deferred: ${app.driver}`;
  const setupBlockReason = appSetupBlockReason(app);
  if (setupBlockReason) return setupBlockReason.startsWith("last setup failed") ? "Start All skips: failed setup" : "Start All skips: needs setup";
  if (isAppRuntimeRunning(app)) return "Start All skips: running";
  return "Start All ready";
}

export function startAllPlan(apps: AppLifecycleResource[]): BulkStartPlan {
  const startable = apps.filter((app) => app.enabled && appSupportsBulkStart(app) && !appSetupBlockReason(app));
  const alreadyRunning = startable.filter(isAppRuntimeRunning);

  return {
    startableCount: startable.length,
    stoppedStartableCount: startable.length - alreadyRunning.length,
    disabledCount: apps.filter((app) => !app.enabled).length,
    deferredCount: apps.filter((app) => app.enabled && (!appSupportsBulkStart(app) || Boolean(appSetupBlockReason(app)))).length,
    alreadyRunningCount: alreadyRunning.length
  };
}

export function startAllBlockReason(apps: AppLifecycleResource[], connected: boolean, busy: boolean) {
  if (busy) return "Start All is already running";
  if (!connected) return "daemon offline; CLI fallback: routely up";

  const plan = startAllPlan(apps);
  if (apps.some((app) => app.enabled && appSupportsBulkStart(app) && appSetupBlockReason(app))) {
    return "resolve failed or needs-setup resources before Start All";
  }
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
  if (action === "start" || action === "restart") {
    const setupBlockReason = appSetupBlockReason(app);
    if (setupBlockReason) return setupBlockReason;
  }
  if (action === "start" && isAppRuntimeRunning(app)) return "resource is already running";

  return null;
}

export function appEnablementBlockReason(app: AppLifecycleResource, action: AppEnablementAction, connected: boolean, busy: boolean) {
  if (busy) return "another lifecycle action is running";
  if (!connected) return "daemon offline";

  if (action === "disable") {
    return app.enabled ? null : "resource is already disabled";
  }

  if (app.enabled) return "resource is already enabled";

  const setupBlockReason = appSetupBlockReason(app);
  if (setupBlockReason) return setupBlockReason.replace("can start", "can be enabled for auto-start").replace("before starting", "before enabling auto-start");

  return null;
}
