import { daemonFetch, daemonProxyResponse, type DaemonServerStatus } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await daemonFetch<{ server: DaemonServerStatus }>("/server/status", undefined, { request });
  return daemonProxyResponse(result, { server: null as unknown as DaemonServerStatus });
}
