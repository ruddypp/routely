import { daemonFetch, daemonProxyResponse, type DaemonDatabase, type DaemonApp } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await daemonFetch<{ databases: DaemonDatabase[] }>("/databases");
  return daemonProxyResponse(result);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await daemonFetch<{ app: DaemonApp; database: DaemonDatabase }>("/databases", {
    method: "POST",
    body: JSON.stringify(body)
  });
  return daemonProxyResponse(result);
}
