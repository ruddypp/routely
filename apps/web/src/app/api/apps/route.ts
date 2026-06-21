import { daemonFetch, daemonProxyResponse, type DaemonApp } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await daemonFetch<{ apps: DaemonApp[] }>("/apps", undefined, { request });
  return daemonProxyResponse(result);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await daemonFetch<{ app: DaemonApp }>("/apps", {
    method: "POST",
    body: JSON.stringify(body)
  }, { request });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result.data, { status: result.status });
}
