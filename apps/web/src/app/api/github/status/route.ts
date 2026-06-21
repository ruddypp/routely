import { daemonFetch, daemonProxyResponse, type DaemonGithubStatusResponse } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await daemonFetch<DaemonGithubStatusResponse>("/github/status", undefined, { request });
  return daemonProxyResponse(result);
}
