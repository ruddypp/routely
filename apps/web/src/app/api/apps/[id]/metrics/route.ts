import { daemonFetch, daemonProxyResponse } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const url = new URL(request.url);
  const query = url.search || "";
  const result = await daemonFetch(`/apps/${encodeURIComponent(id)}/metrics${query}`);
  return daemonProxyResponse(result);
}
