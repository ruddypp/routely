import { DAEMON_URL, dashboardUnauthorizedResponse, isDashboardRequestAuthorized } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  if (!isDashboardRequestAuthorized(request)) {
    return dashboardUnauthorizedResponse();
  }

  const { id } = await params;
  const url = new URL(request.url);
  const adminToken = process.env.ROUTELY_ADMIN_TOKEN;
  try {
    const response = await fetch(`${DAEMON_URL}/deployments/${encodeURIComponent(id)}/logs/stream${url.search}`, {
      cache: "no-store",
      headers: adminToken ? { authorization: `Bearer ${adminToken}` } : undefined
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform"
      }
    });
  } catch {
    return Response.json({ error: "Could not reach the Routely daemon. Is it running?" }, { status: 503 });
  }
}
