import { daemonFetch, daemonProxyResponse, type DaemonAppEnvResponse } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; key: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id, key } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await daemonFetch<DaemonAppEnvResponse>(`/apps/${encodeURIComponent(id)}/env/${encodeURIComponent(key)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  }, { request });
  return daemonProxyResponse(result);
}

export async function DELETE(request: Request, { params }: Context) {
  const { id, key } = await params;
  const result = await daemonFetch<DaemonAppEnvResponse>(`/apps/${encodeURIComponent(id)}/env/${encodeURIComponent(key)}`, {
    method: "DELETE"
  }, { request });
  return daemonProxyResponse(result);
}
