/**
 * Server-side helpers for talking to the Routely daemon.
 *
 * The dashboard never calls the daemon from the browser; these helpers run in
 * Next.js Route Handlers (the `/api/*` surface defined in docs/06-api-spec.md),
 * which proxy to the daemon. This keeps the daemon bound to 127.0.0.1 and gives
 * the browser a same-origin API.
 */

export const DAEMON_URL = process.env.ROUTELY_DAEMON_URL || "http://127.0.0.1:9977";

export type DaemonApp = {
  id: number;
  serverId: number;
  name: string;
  type: string;
  preset: string;
  driver: string;
  path: string | null;
  command: string | null;
  port: number | null;
  enabled: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type DaemonAppLifecycleResponse = {
  app: DaemonApp;
  pid?: number | null;
  stopped?: Array<{ pid: number; result: string }>;
};

export type DaemonAppLogsResponse = {
  app: DaemonApp;
  logs: string;
  path: string;
  bytes: number;
  truncated: boolean;
};

export type DaemonHealth = {
  ok: boolean;
  service: string;
  version: string;
  workspace?: string;
  database?: string;
  startedAt?: string;
  apps?: DaemonApp[];
};

export type DaemonResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string };

/**
 * Fetch a daemon endpoint with a short timeout. Network/timeout failures are
 * returned as a structured error rather than thrown, so Route Handlers can map
 * them to a clean 503 instead of a stack trace.
 */
export async function daemonFetch<T>(path: string, init?: RequestInit): Promise<DaemonResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(`${DAEMON_URL}${path}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: { "content-type": "application/json", ...(init?.headers || {}) }
    });

    const text = await response.text();
    const data = text ? (JSON.parse(text) as T) : ({} as T);

    if (!response.ok) {
      const error =
        (data as { error?: string })?.error || `Daemon responded with HTTP ${response.status}`;
      return { ok: false, status: response.status, error };
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    const reason = isAbort
      ? "Routely daemon did not respond in time."
      : "Could not reach the Routely daemon. Is it running?";
    return { ok: false, status: 503, error: reason };
  } finally {
    clearTimeout(timeout);
  }
}

export function daemonProxyResponse<T>(result: DaemonResult<T>, fallback?: T) {
  if (!result.ok) {
    return Response.json(fallback ? { ...fallback, error: result.error } : { error: result.error }, {
      status: result.status
    });
  }

  return Response.json(result.data, { status: result.status });
}
