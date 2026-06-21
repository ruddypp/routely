import { daemonFetch, daemonProxyResponse, type DaemonAppEnvResponse } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const result = await daemonFetch<DaemonAppEnvResponse>(`/apps/${encodeURIComponent(id)}/env`, undefined, { request });
  return daemonProxyResponse(result);
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await daemonFetch<DaemonAppEnvResponse>(`/apps/${encodeURIComponent(id)}/env`, {
    method: "POST",
    body: JSON.stringify(body)
  }, { request });
  return daemonProxyResponse(result);
}
