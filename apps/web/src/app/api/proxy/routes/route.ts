import { daemonFetch, daemonProxyResponse, type DaemonProxyRoute } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await daemonFetch<{ routes: DaemonProxyRoute[]; config: Record<string, unknown> }>("/proxy/routes");

  if (!result.ok) {
    return Response.json({ routes: [], config: {}, error: result.error }, { status: 200 });
  }

  return daemonProxyResponse(result);
}
