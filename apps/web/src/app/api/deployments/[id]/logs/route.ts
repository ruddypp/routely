import { daemonFetch, daemonProxyResponse, type DaemonDeploymentLogsResponse } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const url = new URL(request.url);
  const after = url.searchParams.get("after");
  const query = after ? `?after=${encodeURIComponent(after)}` : "";
  const result = await daemonFetch<DaemonDeploymentLogsResponse>(`/deployments/${encodeURIComponent(id)}/logs${query}`, undefined, { request });
  return daemonProxyResponse(result);
}
