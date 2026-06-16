import { describe, expect, it } from "vitest";
import { DependencyCycleError, sortByDependencies } from "./dependencies.js";

describe("dependency ordering", () => {
  it("starts dependencies before dependents", () => {
    const sorted = sortByDependencies([
      { name: "web", depends_on: ["api"] },
      { name: "worker", depends_on: "api" },
      { name: "api", depends_on: ["postgres"] },
      { name: "postgres" }
    ]);

    expect(sorted.map((app) => app.name)).toEqual(["postgres", "api", "web", "worker"]);
  });

  it("ignores dependencies that are not in the runnable set", () => {
    const sorted = sortByDependencies([{ name: "api", depends_on: ["postgres"] }]);

    expect(sorted.map((app) => app.name)).toEqual(["api"]);
  });

  it("throws a readable cycle error", () => {
    expect(() =>
      sortByDependencies([
        { name: "web", depends_on: ["api"] },
        { name: "api", depends_on: ["web"] }
      ])
    ).toThrow(DependencyCycleError);
  });
});
