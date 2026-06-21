import { daemonFetch, daemonProxyResponse, type DaemonDomain } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ hostname: string }> };

export async function POST(request: Request, { params }: Context) {
  const { hostname } = await params;
  const result = await daemonFetch<{ domain: DaemonDomain; verification: Record<string, unknown> }>(`/domains/${encodeURIComponent(hostname)}/verify`, {
    method: "POST"
  }, { request });
  return daemonProxyResponse(result);
}
