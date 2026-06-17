import { daemonFetch, daemonProxyResponse } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ hostname: string }> };

export async function DELETE(_request: Request, { params }: Context) {
  const { hostname } = await params;
  const result = await daemonFetch<{ ok: boolean; hostname: string }>(`/domains/${encodeURIComponent(hostname)}`, {
    method: "DELETE"
  });
  return daemonProxyResponse(result);
}
