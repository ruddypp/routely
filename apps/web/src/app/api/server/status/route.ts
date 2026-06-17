import { daemonFetch, daemonProxyResponse, type DaemonServerStatus } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await daemonFetch<{ server: DaemonServerStatus }>("/server/status");
  return daemonProxyResponse(result, { server: null as unknown as DaemonServerStatus });
}

