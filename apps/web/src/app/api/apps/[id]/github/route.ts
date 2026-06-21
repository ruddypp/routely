import { daemonFetch, daemonProxyResponse, type DaemonApp, type DaemonGithubRepository, type DaemonGithubStatusResponse } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const result = await daemonFetch<{ app: DaemonApp; source: Record<string, unknown> | null; repository: DaemonGithubRepository | null; github: DaemonGithubStatusResponse["github"] }>(`/apps/${encodeURIComponent(id)}/github`, undefined, { request });
  return daemonProxyResponse(result);
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await daemonFetch<{ app: DaemonApp; repository: DaemonGithubRepository }>(`/apps/${encodeURIComponent(id)}/github`, {
    method: "POST",
    body: JSON.stringify(body)
  }, { request });
  return daemonProxyResponse(result);
}
