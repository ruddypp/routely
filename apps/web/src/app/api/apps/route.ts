import { daemonFetch, type DaemonApp } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await daemonFetch<{ apps: DaemonApp[] }>("/apps");

  if (!result.ok) {
    return Response.json({ apps: [], error: result.error }, { status: 200 });
  }

  return Response.json({ apps: result.data.apps || [], error: null });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await daemonFetch<{ app: DaemonApp }>("/apps", {
    method: "POST",
    body: JSON.stringify(body)
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result.data, { status: result.status });
}
