import { daemonFetch, daemonProxyResponse, type DaemonGithubInstallation } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await daemonFetch<{ installations: DaemonGithubInstallation[] }>("/github/installations", undefined, { request });
  return daemonProxyResponse(result);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await daemonFetch<{ installation: DaemonGithubInstallation }>("/github/installations", {
    method: "POST",
    body: JSON.stringify(body)
  }, { request });
  return daemonProxyResponse(result);
}
