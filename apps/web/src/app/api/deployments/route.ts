import { daemonFetch, daemonProxyResponse, type DaemonDeployment } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const appId = url.searchParams.get("appId");
  const path = appId ? `/deployments?appId=${encodeURIComponent(appId)}` : "/deployments";
  const result = await daemonFetch<{ deployments: DaemonDeployment[] }>(path);

  if (!result.ok) {
    return Response.json({ deployments: [], error: result.error }, { status: 200 });
  }

  return daemonProxyResponse(result);
}
