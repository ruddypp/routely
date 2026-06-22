import { describe, expect, it } from "vitest";
import {
  appEnablementBlockReason,
  appActionBlockReason,
  bulkStartSkipReason,
  bulkStartStateLabel,
  startAllBlockReason,
  startAllPlan,
  type AppLifecycleResource
} from "../../lib/app-lifecycle";

const commandApp: AppLifecycleResource = { driver: "command", enabled: true, status: "stopped" };
const composeApp: AppLifecycleResource = { driver: "compose", enabled: true, status: "stopped" };
const disabledRunningApp: AppLifecycleResource = { driver: "command", enabled: false, status: "running" };
const disabledStoppedApp: AppLifecycleResource = { driver: "command", enabled: false, status: "stopped" };
const dockerfileApp: AppLifecycleResource = { driver: "dockerfile", enabled: true, status: "stopped" };
const failedSetupApp: AppLifecycleResource = { driver: "command", enabled: true, status: "failed" };
const needsSetupApp: AppLifecycleResource = { driver: "compose", enabled: true, status: "needs_setup" };

describe("app lifecycle dashboard state", () => {
  it("plans Start All for stopped enabled command and Compose resources", () => {
    expect(startAllPlan([commandApp, composeApp, disabledRunningApp, dockerfileApp])).toEqual({
      startableCount: 2,
      stoppedStartableCount: 2,
      disabledCount: 1,
      deferredCount: 1,
      alreadyRunningCount: 0
    });
    expect(startAllBlockReason([commandApp], true, false)).toBeNull();
  });

  it("keeps disabled resources visible as skipped rather than startable", () => {
    expect(bulkStartSkipReason(disabledRunningApp)).toBe("skipped by Start All: disabled in registry");
    expect(bulkStartStateLabel(disabledRunningApp)).toBe("Start All skips: disabled");
    expect(appActionBlockReason(disabledRunningApp, "start", true, false)).toBe("disabled resources are skipped by Start All until re-enabled");
  });

  it("does not treat failed or needs-setup apps as startable", () => {
    expect(startAllPlan([failedSetupApp, needsSetupApp])).toEqual({
      startableCount: 0,
      stoppedStartableCount: 0,
      disabledCount: 0,
      deferredCount: 2,
      alreadyRunningCount: 0
    });
    expect(bulkStartStateLabel(failedSetupApp)).toBe("Start All skips: failed setup");
    expect(bulkStartSkipReason(needsSetupApp)).toBe("skipped by Start All: setup verification must pass before this resource can start");
    expect(appActionBlockReason(failedSetupApp, "start", true, false)).toBe("last setup failed; fix configuration and verify before starting");
    expect(startAllBlockReason([commandApp, failedSetupApp], true, false)).toBe("resolve failed or needs-setup resources before Start All");
  });

  it("allows stopping a disabled app without treating stop as disable", () => {
    expect(appActionBlockReason(disabledRunningApp, "stop", true, false)).toBeNull();
  });

  it("guards enablement without hiding Disable from enabled apps", () => {
    expect(appEnablementBlockReason(commandApp, "disable", true, false)).toBeNull();
    expect(appEnablementBlockReason(disabledStoppedApp, "enable", true, false)).toBeNull();
    expect(appEnablementBlockReason({ ...failedSetupApp, enabled: false }, "enable", true, false)).toBe("last setup failed; fix configuration and verify before enabling auto-start");
    expect(appEnablementBlockReason(commandApp, "enable", false, false)).toBe("daemon offline");
  });

  it("marks unsupported drivers as deferred with a CLI fallback when nothing can start", () => {
    expect(bulkStartStateLabel(dockerfileApp)).toBe("Start All deferred: dockerfile");
    expect(appActionBlockReason(dockerfileApp, "start", true, false)).toBe("dockerfile lifecycle is deferred");
    expect(startAllBlockReason([disabledRunningApp, dockerfileApp], true, false)).toBe("no enabled command or Compose resources");
    expect(startAllBlockReason([commandApp], false, false)).toBe("daemon offline; CLI fallback: routely up");
  });
});
