import { daemonFetch, daemonProxyResponse } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const url = new URL(request.url);
  const query = url.search || "";
  const result = await daemonFetch(`/apps/${encodeURIComponent(id)}/health${query}`);
  return daemonProxyResponse(result);
}

export async function POST(_request: Request, { params }: Context) {
  const { id } = await params;
  const result = await daemonFetch(`/apps/${encodeURIComponent(id)}/health`, { method: "POST" });
  return daemonProxyResponse(result);
}
