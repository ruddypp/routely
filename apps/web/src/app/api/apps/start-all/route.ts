import { daemonFetch, daemonProxyResponse, type DaemonAppStartAllResponse } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const result = await daemonFetch<DaemonAppStartAllResponse>("/apps/start-all", { method: "POST" }, { request });
  return daemonProxyResponse(result);
}
