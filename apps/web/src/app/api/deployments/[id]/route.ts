import { daemonFetch, daemonProxyResponse, type DaemonDeployment } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const result = await daemonFetch<{ deployment: DaemonDeployment }>(`/deployments/${encodeURIComponent(id)}`);
  return daemonProxyResponse(result);
}
