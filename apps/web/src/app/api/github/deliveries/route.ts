import { daemonFetch, daemonProxyResponse, type DaemonGithubDelivery } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await daemonFetch<{ deliveries: DaemonGithubDelivery[] }>("/github/deliveries", undefined, { request });
  return daemonProxyResponse(result);
}
