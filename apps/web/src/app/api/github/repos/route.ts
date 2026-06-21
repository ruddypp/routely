import { daemonFetch, daemonProxyResponse, type DaemonGithubRepository } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await daemonFetch<{ repositories: DaemonGithubRepository[] }>("/github/repos", undefined, { request });
  return daemonProxyResponse(result);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await daemonFetch<{ repository: DaemonGithubRepository }>("/github/repos", {
    method: "POST",
    body: JSON.stringify(body)
  }, { request });
  return daemonProxyResponse(result);
}
