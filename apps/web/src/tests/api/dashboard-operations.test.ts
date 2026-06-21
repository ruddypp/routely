import { describe, expect, it } from "vitest";
import { backupRunFileState, backupStorageLabel, databaseExposureLabel, deploymentLogsLabel, deploymentStateLabel, domainDnsLabel, domainProxyLabel, domainTargetLabel, domainTlsLabel, envVisibilityLabel, isDeploymentInProgress, latestSuccessfulDeployment, logAvailabilityLabel, productionAuthState, safeEnvDisplay } from "../../lib/dashboard-operations";

describe("dashboard operation state labels", () => {
  const successfulDeployment = { id: 10, status: "succeeded", phase: "succeeded", logsUrl: "/deployments/10/logs" };
  const activeDeployment = { id: 11, status: "building", phase: "building", logsUrl: "/deployments/11/logs" };
  const failedDeployment = { id: 12, status: "failed", phase: "preparing", logsUrl: "/deployments/12/logs" };

  it("distinguishes active, failed, successful, and log-backed deployments", () => {
    expect(isDeploymentInProgress(activeDeployment)).toBe(true);
    expect(deploymentStateLabel(activeDeployment)).toBe("deploy in progress: building");
    expect(deploymentStateLabel(failedDeployment)).toBe("failed phase: preparing");
    expect(deploymentStateLabel(successfulDeployment)).toBe("latest successful deployment #10");
    expect(deploymentLogsLabel(successfulDeployment)).toBe("deployment logs available");
    expect(latestSuccessfulDeployment([activeDeployment, successfulDeployment, failedDeployment])).toBe(successfulDeployment);
  });

  it("labels DNS, generated proxy routes, TLS, and deployment targets independently", () => {
    const domain = { dnsStatus: "failed", proxyStatus: "generated", tlsStatus: "pending", targetPort: 32010, targetUrl: "http://127.0.0.1:32010" };

    expect(domainDnsLabel(domain.dnsStatus)).toBe("DNS mismatch");
    expect(domainProxyLabel(domain, false)).toBe("generated route");
    expect(domainTlsLabel(domain.tlsStatus)).toBe("pending TLS");
    expect(domainTlsLabel("active")).toBe("verified TLS");
    expect(domainTlsLabel("failed")).toBe("failed TLS");
    expect(domainTargetLabel(domain)).toBe("http://127.0.0.1:32010");
  });

  it("never returns raw secret values for secret env metadata", () => {
    expect(safeEnvDisplay({ isSecret: true, displayValue: "postgres://secret", value: "postgres://secret" })).toBe("[redacted]");
    expect(safeEnvDisplay({ isSecret: true, displayValue: "[redacted]", value: null })).toBe("[redacted]");
    expect(safeEnvDisplay({ isSecret: false, displayValue: "NODE_ENV=production", value: "NODE_ENV=production" })).toBe("NODE_ENV=production");
    expect(envVisibilityLabel({ isSecret: true, displayValue: "[redacted]" })).toBe("secret metadata");
  });

  it("labels log availability without assuming success", () => {
    expect(logAvailabilityLabel(null)).toBe("logs not loaded");
    expect(logAvailabilityLabel({ path: "/var/log/app.log", bytes: 42, truncated: false })).toBe("logs available");
    expect(logAvailabilityLabel({ path: "/var/log/app.log", bytes: 65536, truncated: true })).toBe("logs available: truncated tail");
    expect(logAvailabilityLabel({ bytes: 0, path: "/var/log/empty.log", truncated: false })).toBe("logs available: empty");
  });

  it("distinguishes missing production auth from unavailable server data", () => {
    expect(productionAuthState(null, ["Routely production API requires an admin token."])).toMatchObject({ label: "missing auth", tone: "error" });
    expect(productionAuthState(null, [])).toMatchObject({ label: "unavailable", tone: "warn" });
    expect(productionAuthState({ auth: { required: false, configured: false } })).toMatchObject({ label: "local bypass", tone: "ok" });
  });

  it("sorts latest successful deployments by real deployment timestamps", () => {
    const oldSuccess = { id: 20, status: "succeeded", phase: "succeeded", finishedAt: "2026-06-22T00:01:00.000Z" };
    const newSuccess = { id: 21, status: "succeeded", phase: "succeeded", finishedAt: "2026-06-22T00:02:00.000Z" };

    expect(latestSuccessfulDeployment([oldSuccess, activeDeployment, newSuccess])).toBe(newSuccess);
  });

  it("labels internal databases and backup metadata without implying file serving", () => {
    expect(databaseExposureLabel({ internal: true, connectionScope: "internal-only" })).toMatchObject({ label: "internal-only", tone: "ok" });
    expect(databaseExposureLabel({ internal: false, connectionScope: "public-requested" })).toMatchObject({ label: "public-requested", tone: "error" });
    expect(backupStorageLabel({ storageType: "local", storageStatus: "metadata-only", storage: { type: "local", servesFiles: false } })).toMatchObject({ label: "local · metadata-only", tone: "ok" });
    expect(backupRunFileState({ status: "failed", storageStatus: "metadata-only", filePath: null, file: { available: false, servesFile: false, downloadUrl: null } })).toMatchObject({ label: "no backup file", tone: "error" });
    expect(backupRunFileState({ status: "succeeded", storageStatus: "metadata-only", filePath: "/var/lib/routely/backups/postgres.sql", fileName: "postgres.sql", file: { available: true, name: "postgres.sql", servesFile: false, downloadUrl: null } })).toMatchObject({ label: "postgres.sql", tone: "ok" });
  });
});
