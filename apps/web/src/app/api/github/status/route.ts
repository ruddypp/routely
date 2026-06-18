import { daemonFetch, daemonProxyResponse, type DaemonGithubStatusResponse } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await daemonFetch<DaemonGithubStatusResponse>("/github/status");
  return daemonProxyResponse(result, { github: null as unknown as DaemonGithubStatusResponse["github"] });
}
