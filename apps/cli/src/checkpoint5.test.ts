import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { initializeRoutely, appendDeploymentLog, createDeployment, getDeploymentById, listDeploymentLogs, updateDeployment, upsertApp } from "@routely/db";
import { buildDockerfileContainerName, buildDockerfileImageTag, dockerBuildArgs, dockerRunArgs } from "@routely/drivers";

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
    expect(logs).toHaveLength(1);
    expect(logs[0].sequence).toBe(2);
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
});
