import { daemonFetch, daemonProxyResponse } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.search || "";
  const result = await daemonFetch(`/metrics${query}`);
  return daemonProxyResponse(result);
}
