import { daemonFetch, daemonProxyResponse, type DaemonDatabase } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const result = await daemonFetch<{ database: DaemonDatabase }>(`/databases/${encodeURIComponent(id)}/stop`, { method: "POST" }, { request });
  return daemonProxyResponse(result);
}
