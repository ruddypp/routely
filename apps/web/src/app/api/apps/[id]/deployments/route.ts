import { daemonFetch, daemonProxyResponse, type DaemonApp, type DaemonDeployment } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const result = await daemonFetch<{ app: DaemonApp; deployments: DaemonDeployment[] }>(`/apps/${encodeURIComponent(id)}/deployments`, undefined, { request });
  return daemonProxyResponse(result);
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const result = await daemonFetch<{ app: DaemonApp; deployment: DaemonDeployment }>(`/apps/${encodeURIComponent(id)}/deployments`, {
    method: "POST"
  }, { request });
  return daemonProxyResponse(result);
}
