import { daemonFetch, daemonProxyResponse, type DaemonDeployment } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const appId = url.searchParams.get("appId");
  const path = appId ? `/deployments?appId=${encodeURIComponent(appId)}` : "/deployments";
  const result = await daemonFetch<{ deployments: DaemonDeployment[] }>(path);
  return daemonProxyResponse(result);
}
