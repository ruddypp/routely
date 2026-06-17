import {
  daemonFetch,
  daemonProxyResponse,
  type DaemonAppLifecycleResponse,
  type DaemonAppLogsResponse
} from "@/lib/daemon";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; action: string }> };

const MUTATION_ACTIONS = new Set(["start", "stop", "restart"]);

export async function POST(_request: Request, { params }: Context) {
  const { id, action } = await params;

  if (!MUTATION_ACTIONS.has(action)) {
    return Response.json({ error: `Unsupported app action: ${action}` }, { status: 404 });
  }

  const result = await daemonFetch<DaemonAppLifecycleResponse>(
    `/apps/${encodeURIComponent(id)}/${encodeURIComponent(action)}`,
    { method: "POST" }
  );

  return daemonProxyResponse(result);
}

export async function GET(_request: Request, { params }: Context) {
  const { id, action } = await params;

  if (action !== "logs") {
    return Response.json({ error: `Unsupported app action: ${action}` }, { status: 404 });
  }

  const result = await daemonFetch<DaemonAppLogsResponse>(`/apps/${encodeURIComponent(id)}/logs`);

  return daemonProxyResponse(result);
}
