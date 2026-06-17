import { daemonFetch, daemonProxyResponse, type DaemonDomain } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await daemonFetch<{ rootDomain: string | null; serverPublicIp: string | null; domains: DaemonDomain[] }>("/domains");

  if (!result.ok) {
    return Response.json({ rootDomain: null, serverPublicIp: null, domains: [], error: result.error }, { status: 200 });
  }

  return daemonProxyResponse(result);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await daemonFetch<{ domain: DaemonDomain }>("/domains", {
    method: "POST",
    body: JSON.stringify(body)
  });
  return daemonProxyResponse(result);
}
