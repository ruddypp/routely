import { daemonFetch, daemonProxyResponse, type DaemonGithubDelivery } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await daemonFetch<{ deliveries: DaemonGithubDelivery[] }>("/github/deliveries");
  return daemonProxyResponse(result);
}
