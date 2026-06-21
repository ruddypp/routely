import { daemonFetch, daemonProxyResponse, type DaemonProxyRoute } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await daemonFetch<{ routes: DaemonProxyRoute[]; config: Record<string, unknown> }>("/proxy/routes", undefined, { request });

  if (!result.ok) {
    return Response.json({ routes: [], config: {}, error: result.error }, { status: 200 });
  }

  return daemonProxyResponse(result);
}
