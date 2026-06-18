import { createHmac, timingSafeEqual } from "node:crypto";

export const routelyGithubVersion = "0.1.0";

export function getGithubAppConfig(env = process.env) {
  return {
    appId: env.ROUTELY_GITHUB_APP_ID || env.GITHUB_APP_ID || null,
    clientId: env.ROUTELY_GITHUB_CLIENT_ID || env.GITHUB_CLIENT_ID || null,
    webhookSecretConfigured: Boolean(env.ROUTELY_GITHUB_WEBHOOK_SECRET || env.GITHUB_WEBHOOK_SECRET),
    privateKeyConfigured: Boolean(env.ROUTELY_GITHUB_PRIVATE_KEY || env.GITHUB_PRIVATE_KEY),
    configured: Boolean(
      (env.ROUTELY_GITHUB_APP_ID || env.GITHUB_APP_ID) &&
        (env.ROUTELY_GITHUB_WEBHOOK_SECRET || env.GITHUB_WEBHOOK_SECRET)
    )
  };
}

export function githubWebhookSecret(env = process.env) {
  return env.ROUTELY_GITHUB_WEBHOOK_SECRET || env.GITHUB_WEBHOOK_SECRET || null;
}

export function signGithubWebhookPayload(payload, secret) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload || ""), "utf8");
  const digest = createHmac("sha256", String(secret || "")).update(body).digest("hex");
  return `sha256=${digest}`;
}

export function validateGithubWebhookSignature({ payload, signature, secret }) {
  if (!secret) {
    return { ok: false, reason: "GitHub webhook secret is not configured." };
  }

  if (!signature || typeof signature !== "string" || !signature.startsWith("sha256=")) {
    return { ok: false, reason: "Missing GitHub SHA-256 signature." };
  }

  const expected = Buffer.from(signGithubWebhookPayload(payload, secret), "utf8");
  const actual = Buffer.from(signature, "utf8");

  if (expected.length !== actual.length) {
    return { ok: false, reason: "GitHub webhook signature length mismatch." };
  }

  return timingSafeEqual(expected, actual)
    ? { ok: true, reason: null }
    : { ok: false, reason: "GitHub webhook signature mismatch." };
}

export function parseGithubPushEvent(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const ref = typeof payload.ref === "string" ? payload.ref : "";
  if (!ref.startsWith("refs/heads/")) {
    return null;
  }

  const repo = payload.repository?.full_name || payload.repository?.fullName;
  const branch = ref.slice("refs/heads/".length);
  const commitSha = payload.after || payload.head_commit?.id || null;

  if (!repo || !branch || !commitSha || commitSha === "0000000000000000000000000000000000000000") {
    return null;
  }

  return {
    repo: String(repo),
    branch,
    commitSha: String(commitSha),
    repositoryId: payload.repository?.id == null ? null : Number(payload.repository.id),
    pusher: payload.pusher?.name || payload.sender?.login || null,
    message: payload.head_commit?.message || null,
    url: payload.head_commit?.url || payload.compare || null
  };
}

export function shouldAutoDeployForPush(app, push) {
  if (!app || !push) return false;
  const source = app.source || {};
  const autoDeploy = source.auto_deploy || source.autoDeploy || {};
  const enabled = autoDeploy.enabled !== false;
  const sourceRepo = source.repo || source.repository || null;
  const sourceBranch = source.branch || null;
  const allowedBranches = Array.isArray(autoDeploy.branches) && autoDeploy.branches.length > 0
    ? autoDeploy.branches.map(String)
    : sourceBranch
      ? [sourceBranch]
      : ["main", "master"];

  return enabled && source.type === "github" && sourceRepo === push.repo && allowedBranches.includes(push.branch);
}

export function filterGithubWebhookEvent(eventName, payload) {
  if (eventName !== "push") {
    return { supported: false, action: "ignored", reason: `Unsupported GitHub event: ${eventName || "unknown"}.`, push: null };
  }

  const push = parseGithubPushEvent(payload);
  if (!push) {
    return { supported: false, action: "ignored", reason: "Push event is not a deployable branch update.", push: null };
  }

  return { supported: true, action: "push", reason: null, push };
}
