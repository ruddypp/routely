import { daemonFetch, type DaemonApp } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const result = await daemonFetch<{ app: DaemonApp }>(`/apps/${encodeURIComponent(id)}`, undefined, { request });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result.data, { status: result.status });
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await daemonFetch<{ app: DaemonApp }>(`/apps/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  }, { request });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result.data, { status: result.status });
}

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  const result = await daemonFetch<{ ok: boolean; id: number }>(`/apps/${encodeURIComponent(id)}`, {
    method: "DELETE"
  }, { request });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result.data, { status: result.status });
}
