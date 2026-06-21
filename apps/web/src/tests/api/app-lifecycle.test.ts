import { describe, expect, it } from "vitest";
import {
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
const dockerfileApp: AppLifecycleResource = { driver: "dockerfile", enabled: true, status: "stopped" };

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

  it("allows stopping a disabled app without treating stop as disable", () => {
    expect(appActionBlockReason(disabledRunningApp, "stop", true, false)).toBeNull();
  });

  it("marks unsupported drivers as deferred with a CLI fallback when nothing can start", () => {
    expect(bulkStartStateLabel(dockerfileApp)).toBe("Start All deferred: dockerfile");
    expect(appActionBlockReason(dockerfileApp, "start", true, false)).toBe("dockerfile lifecycle is deferred");
    expect(startAllBlockReason([disabledRunningApp, dockerfileApp], true, false)).toBe("no enabled command or Compose resources");
    expect(startAllBlockReason([commandApp], false, false)).toBe("daemon offline; CLI fallback: routely up");
  });
});
