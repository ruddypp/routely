import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  connectAppToGithubRepository,
  getGithubSourceForApp,
  initializeRoutely,
  listGithubConnectedAppsForPush,
  recordGithubWebhookDelivery,
  upsertApp,
  upsertGithubInstallation,
  upsertGithubRepository
} from "@routely/db";
import {
  filterGithubWebhookEvent,
  signGithubWebhookPayload,
  validateGithubWebhookSignature
} from "@routely/github";

describe("checkpoint 7 GitHub integration and auto deploy slice", () => {
  it("validates GitHub webhook signatures with SHA-256 HMAC", () => {
    const payload = JSON.stringify({ ref: "refs/heads/main" });
    const signature = signGithubWebhookPayload(payload, "secret");

    expect(validateGithubWebhookSignature({ payload, signature, secret: "secret" }).ok).toBe(true);
    expect(validateGithubWebhookSignature({ payload, signature, secret: "wrong" }).ok).toBe(false);
    expect(validateGithubWebhookSignature({ payload, signature: "sha1=abc", secret: "secret" }).ok).toBe(false);
  });

  it("filters deployable push events", () => {
    const push = filterGithubWebhookEvent("push", {
      ref: "refs/heads/main",
      after: "abc123",
      repository: { id: 42, full_name: "acme/web" },
      head_commit: { message: "ship", url: "https://github.com/acme/web/commit/abc123" }
    });
    const tag = filterGithubWebhookEvent("push", {
      ref: "refs/tags/v1.0.0",
      after: "abc123",
      repository: { full_name: "acme/web" }
    });
    const issues = filterGithubWebhookEvent("issues", {});

    expect(push.supported).toBe(true);
    expect(push.push?.repo).toBe("acme/web");
    expect(push.push?.branch).toBe("main");
    expect(tag.supported).toBe(false);
    expect(issues.supported).toBe(false);
  });

  it("deduplicates webhook deliveries", async () => {
    const root = await mkdtemp(join(tmpdir(), "routely-github-delivery-"));
    const { db } = initializeRoutely(root);

    const first = recordGithubWebhookDelivery(db, {
      deliveryId: "delivery-1",
      event: "push",
      status: "received",
      signatureValid: true,
      repo: "acme/web",
      branch: "main"
    });
    const second = recordGithubWebhookDelivery(db, {
      deliveryId: "delivery-1",
      event: "push",
      status: "received",
      signatureValid: true
    });

    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(false);
    db.close();
  });

  it("persists GitHub installation, repository, and app source metadata", async () => {
    const root = await mkdtemp(join(tmpdir(), "routely-github-source-"));
    const { db } = initializeRoutely(root);
    const app = upsertApp(db, { name: "web", driver: "dockerfile", path: root, port: 3000 });

    const installation = upsertGithubInstallation(db, {
      installationId: 1001,
      accountLogin: "acme",
      accountType: "Organization",
      events: ["push"],
      permissions: { contents: "read" }
    });
    const repository = upsertGithubRepository(db, {
      installationId: installation.installation_id,
      repositoryId: 2002,
      fullName: "acme/web",
      private: true,
      defaultBranch: "main"
    });
    const connected = connectAppToGithubRepository(db, app.id, {
      fullName: repository.full_name,
      installationId: installation.installation_id,
      branch: "main",
      autoDeployEnabled: true
    });

    const source = getGithubSourceForApp(db, app.id);
    const matches = listGithubConnectedAppsForPush(db, { repo: "acme/web", branch: "main" });

    expect(connected?.app.source?.type).toBe("github");
    expect(source.repository?.full_name).toBe("acme/web");
    expect(source.repository?.private).toBe(true);
    expect(matches.map((item) => item.name)).toEqual(["web"]);
    db.close();
  });
});
