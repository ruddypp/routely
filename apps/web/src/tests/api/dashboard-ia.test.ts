import { describe, expect, it } from "vitest";
import { DASHBOARD_MODULES, DASHBOARD_NAV_GROUPS } from "../../components/dashboard-shell/types";

describe("dashboard information architecture", () => {
  it("keeps solo-operator operations modules easy to scan", () => {
    expect(DASHBOARD_NAV_GROUPS.map((group) => group.label)).toEqual(["Operate", "Release", "Observe", "Data", "Server"]);
    expect(DASHBOARD_MODULES.map((module) => module.label)).toEqual([
      "Dashboard",
      "Apps / Services",
      "Deployments",
      "Domains",
      "GitHub",
      "Env / Secrets",
      "Logs",
      "Health",
      "Metrics",
      "Databases",
      "Server Status",
      "Notifications / Settings"
    ]);
  });

  it("uses runtime host and deferred-state copy", () => {
    const copy = DASHBOARD_MODULES.map((module) => `${module.label} ${module.summary}`).join(" ").toLowerCase();

    expect(copy).toContain("runtime host");
    expect(copy).toContain("redacted");
    expect(copy).toContain("deferred");
    expect(copy).not.toContain("one-vps");
    expect(copy).not.toContain("one vps");
    expect(copy).not.toContain("local →");
    expect(DASHBOARD_MODULES.map((module) => module.key)).not.toContain("backups");
    expect(copy).not.toContain("enterprise");
    expect(copy).not.toContain("rbac");
    expect(copy).not.toContain("team");
  });
});
