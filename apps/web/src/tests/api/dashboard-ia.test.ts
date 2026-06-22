import { describe, expect, it } from "vitest";
import { DASHBOARD_MODULES, DASHBOARD_NAV_GROUPS } from "../../components/dashboard-shell/types";

describe("dashboard information architecture", () => {
  it("keeps service operations inside the Apps workspace", () => {
    expect(DASHBOARD_NAV_GROUPS.map((group) => group.label)).toEqual(["Operate", "Server"]);
    expect(DASHBOARD_MODULES.map((module) => module.label)).toEqual([
      "Dashboard",
      "Apps / Services",
      "Server Status",
      "Notifications / Settings"
    ]);

    expect(DASHBOARD_MODULES.map((module) => module.label)).not.toEqual(expect.arrayContaining([
      "Deployments",
      "Domains",
      "GitHub",
      "Env / Secrets",
      "Logs",
      "Health",
      "Metrics",
      "Databases"
    ]));
  });

  it("uses runtime host and deferred-state copy", () => {
    const copy = DASHBOARD_MODULES.map((module) => `${module.label} ${module.summary}`).join(" ").toLowerCase();

    expect(copy).toContain("runtime host");
    expect(copy).toContain("services");
    expect(copy).toContain("project services");
    expect(copy).not.toContain("one-vps");
    expect(copy).not.toContain("one vps");
    expect(copy).not.toContain("local →");
    expect(DASHBOARD_MODULES.map((module) => module.key)).not.toContain("backups");
    expect(copy).not.toContain("enterprise");
    expect(copy).not.toContain("rbac");
    expect(copy).not.toContain("team");
  });
});
