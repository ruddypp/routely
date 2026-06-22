import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateHttpHealthcheck, evaluateRuntimeHealth, formatSseEvent, healthSummaryToPublicDto, healthcheckToPublicDto, metricSampleToPublicDto } from "@routely/core";
import {
  initializeRoutely,
  listHealthchecksForApp,
  listMetricSamplesForApp,
  recordMetricSample,
  upsertApp,
  upsertHealthcheckResult
} from "@routely/db";

describe("checkpoint 9 logs, metrics, and health", () => {
  it("evaluates HTTP and runtime health consistently", () => {
    expect(evaluateHttpHealthcheck({ expectedStatus: 200, httpStatus: 200, responseTimeMs: 42 })).toEqual({
      status: "healthy",
      httpStatus: 200,
      responseTimeMs: 42,
      message: "HTTP 200 in 42ms"
    });
    expect(evaluateHttpHealthcheck({ expectedStatus: 200, httpStatus: 503, responseTimeMs: 10 }).status).toBe("unhealthy");
    expect(evaluateRuntimeHealth({ running: false, message: "container exited" })).toEqual({ status: "unhealthy", message: "container exited" });
    expect(evaluateRuntimeHealth({ available: false, message: "healthcheck deferred" })).toEqual({ status: "unavailable", message: "healthcheck deferred" });
  });

  it("frames deployment logs as SSE events", () => {
    const framed = formatSseEvent("deployment-log", { sequence: 2, message: "build ok" }, { id: 2 });

    expect(framed).toContain("id: 2\n");
    expect(framed).toContain("event: deployment-log\n");
    expect(framed).toContain('data: {"sequence":2,"message":"build ok"}\n\n');
  });

  it("persists app health and metric samples", async () => {
    const root = await mkdtemp(join(tmpdir(), "routely-health-state-"));
    const { db } = initializeRoutely(root);
    const app = upsertApp(db, { name: "web", driver: "dockerfile", path: root, port: 3000, healthcheck: { path: "/health", expected_status: 204 } });

    const health = upsertHealthcheckResult(db, {
      appId: app.id,
      target: "container",
      path: "/health",
      expectedStatus: 204,
      status: "healthy",
      httpStatus: 204,
      responseTimeMs: 37,
      message: "HTTP 204 in 37ms"
    });
    recordMetricSample(db, { appId: app.id, scope: "container", cpuPercent: 3.5, memoryBytes: 1024, memoryLimitBytes: 4096, message: "docker stats" });

    expect(healthcheckToPublicDto(health).responseTimeMs).toBe(37);
    expect(healthSummaryToPublicDto(listHealthchecksForApp(db, app.id))).toMatchObject({ status: "healthy", available: true, message: "HTTP 204 in 37ms" });
    expect(listHealthchecksForApp(db, app.id)).toHaveLength(1);
    const metrics = listMetricSamplesForApp(db, app.id);
    expect(metricSampleToPublicDto(metrics[0]).cpuPercent).toBe(3.5);
    db.close();
  });

  it("bounds retained metric samples while healthchecks stay upserted", async () => {
    const root = await mkdtemp(join(tmpdir(), "routely-metrics-retention-"));
    const { db } = initializeRoutely(root);
    const app = upsertApp(db, { name: "api", driver: "command", path: root, command: "npm run dev" });

    for (let index = 0; index < 505; index += 1) {
      recordMetricSample(db, { appId: app.id, scope: "container", cpuPercent: index });
    }
    upsertHealthcheckResult(db, { appId: app.id, target: "runtime", status: "healthy", message: "first" });
    upsertHealthcheckResult(db, { appId: app.id, target: "runtime", status: "unhealthy", message: "latest" });

    expect(db.prepare("SELECT COUNT(*) AS count FROM metrics_samples WHERE app_id = ? AND scope = 'container'").get(app.id)?.count).toBe(500);
    expect(listMetricSamplesForApp(db, app.id)).toHaveLength(30);
    expect(listHealthchecksForApp(db, app.id)).toHaveLength(1);
    expect(healthSummaryToPublicDto(listHealthchecksForApp(db, app.id)).message).toBe("latest");
    db.close();
  });

  it("summarizes missing healthchecks as unavailable for dashboard diagnosis", () => {
    expect(healthSummaryToPublicDto([])).toEqual({
      status: "unknown",
      available: false,
      reason: "unavailable",
      message: "No healthcheck results recorded yet.",
      checkedAt: null,
      checks: []
    });
  });
});
