export const routelyGithubVersion: string;

export interface RoutelyGithubAppConfig {
  appId: string | null;
  clientId: string | null;
  webhookSecretConfigured: boolean;
  privateKeyConfigured: boolean;
  configured: boolean;
}

export function getGithubAppConfig(env?: Record<string, string | undefined>): RoutelyGithubAppConfig;
export function githubWebhookSecret(env?: Record<string, string | undefined>): string | null;
export function signGithubWebhookPayload(payload: string | Buffer, secret: string): string;
export function validateGithubWebhookSignature(input: {
  payload: string | Buffer;
  signature?: string | null;
  secret?: string | null;
}): { ok: boolean; reason: string | null };

export interface RoutelyGithubPushEvent {
  repo: string;
  branch: string;
  commitSha: string;
  repositoryId: number | null;
  pusher: string | null;
  message: string | null;
  url: string | null;
}

export function parseGithubPushEvent(payload: Record<string, unknown>): RoutelyGithubPushEvent | null;
export function shouldAutoDeployForPush(app: Record<string, unknown>, push: RoutelyGithubPushEvent): boolean;
export function filterGithubWebhookEvent(
  eventName: string | null | undefined,
  payload: Record<string, unknown>
): { supported: boolean; action: string; reason: string | null; push: RoutelyGithubPushEvent | null };
