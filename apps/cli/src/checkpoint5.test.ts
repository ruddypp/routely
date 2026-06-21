import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deploymentToPublicDto } from "@routely/core";
import { initializeRoutely, appendDeploymentLog, createDeployment, getDeploymentById, listDeploymentLogs, updateDeployment, upsertApp } from "@routely/db";
import {
  buildComposeConfig,
  buildDockerfileContainerName,
  buildDockerfileImageTag,
  composeConfigToYaml,
  composeProjectName,
  composePsRunningArgs,
  composeStopArgs,
  composeUpArgs,
  dockerBuildArgs,
  dockerRunArgs
} from "@routely/drivers";

describe("checkpoint 5 production deployment slice", () => {
  it("persists deployment phases and incremental logs", async () => {
    const root = await mkdtemp(join(tmpdir(), "routely-deploy-state-"));
    const { db } = initializeRoutely(root);
    const app = upsertApp(db, {
      name: "web",
      driver: "dockerfile",
      path: root,
      port: 3000
    });

    const deployment = createDeployment(db, { appId: app.id, containerPort: 3000 });
    expect(deployment.status).toBe("queued");

    updateDeployment(db, deployment.id, {
      status: "building",
      phase: "building",
      imageTag: "routely/web:1",
      containerName: "routely_web_1"
    });
    appendDeploymentLog(db, deployment.id, { phase: "building", stream: "stdout", message: "step 1\n" });
    appendDeploymentLog(db, deployment.id, { phase: "building", stream: "stderr", message: "warning\n" });

    const updated = getDeploymentById(db, deployment.id);
    const logs = listDeploymentLogs(db, deployment.id, { afterSequence: 1 });

    expect(updated?.status).toBe("building");
    expect(updated?.image_tag).toBe("routely/web:1");
    expect(deploymentToPublicDto(updated!).logsUrl).toBe(`/deployments/${deployment.id}/logs`);
    expect(logs).toHaveLength(1);
    expect(logs[0].sequence).toBe(2);
    db.close();
  });

  it("keeps failed deployment phase, error, and log links inspectable", async () => {
    const root = await mkdtemp(join(tmpdir(), "routely-deploy-failure-"));
    const { db } = initializeRoutely(root);
    const app = upsertApp(db, { name: "api", driver: "dockerfile", path: root, port: 3000 });
    const deployment = createDeployment(db, { appId: app.id, containerPort: 3000 });

    updateDeployment(db, deployment.id, {
      status: "failed",
      phase: "healthchecking",
      errorMessage: "HTTP 503, expected 200",
      finishedAt: "2026-06-18T00:00:00.000Z"
    });
    appendDeploymentLog(db, deployment.id, { phase: "healthchecking", stream: "stderr", message: "HTTP 503, expected 200" });

    const dto = deploymentToPublicDto(getDeploymentById(db, deployment.id)!);
    expect(dto).toMatchObject({ status: "failed", phase: "healthchecking", errorMessage: "HTTP 503, expected 200" });
    expect(dto.logsUrl).toBe(`/deployments/${deployment.id}/logs`);
    expect(listDeploymentLogs(db, deployment.id)).toHaveLength(1);
    db.close();
  });

  it("builds conservative Dockerfile docker commands", () => {
    const imageTag = buildDockerfileImageTag("My Web", 42);
    const containerName = buildDockerfileContainerName("My Web", 42);

    expect(imageTag).toBe("routely/my_web:42");
    expect(containerName).toBe("routely_my_web_42");
    expect(dockerBuildArgs({ context: "/srv/app", dockerfile: "/srv/app/Dockerfile", imageTag })).toEqual([
      "build",
      "--pull",
      "-t",
      imageTag,
      "-f",
      "/srv/app/Dockerfile",
      "/srv/app"
    ]);
    expect(dockerRunArgs({ containerName, imageTag, hostPort: 32042, containerPort: 3000, env: { NODE_ENV: "production" } })).toEqual([
      "run",
      "-d",
      "--restart",
      "unless-stopped",
      "--name",
      containerName,
      "-p",
      "32042:3000",
      "-e",
      "NODE_ENV=production",
      imageTag
    ]);
  });

  it("builds Compose configs and docker compose commands for local and one-VPS operation", () => {
    const app = {
      name: "API Service",
      driver: "compose",
      image: "ghcr.io/acme/api:1",
      command: "npm start",
      env: { NODE_ENV: "production" },
      ports: [8080, 9090],
      depends_on: ["postgres"],
      volumes: ["api-data:/data"],
      compose_service: "api"
    };
    const composeFile = "/srv/routely/compose.yml";
    const project = composeProjectName("/srv/routely/workspace");

    const config = buildComposeConfig(app);
    expect(config).toMatchObject({
      services: {
        api: {
          image: "ghcr.io/acme/api:1",
          command: "npm start",
          environment: { NODE_ENV: "production" },
          ports: ["8080:8080", "9090:9090"],
          depends_on: ["postgres"],
          volumes: ["api-data:/data"]
        }
      },
      volumes: { "api-data": {} }
    });
    expect(composeConfigToYaml(config)).toContain("api-data: {}");
    expect(composeUpArgs({ project, composeFile, serviceName: "api" })).toEqual(["compose", "-p", project, "-f", composeFile, "up", "-d", "api"]);
    expect(composeStopArgs({ project, composeFile, serviceName: "api" })).toEqual(["compose", "-p", project, "-f", composeFile, "stop", "api"]);
    expect(composePsRunningArgs({ project, composeFile, serviceName: "api" })).toEqual(["compose", "-p", project, "-f", composeFile, "ps", "--status", "running", "-q", "api"]);
  });
});
