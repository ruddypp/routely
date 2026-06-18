import { DAEMON_URL } from "@/lib/daemon";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.arrayBuffer();
  const headers = new Headers();
  for (const key of ["content-type", "x-github-delivery", "x-github-event", "x-hub-signature-256"]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }

  try {
    const response = await fetch(`${DAEMON_URL}/github/webhook`, {
      method: "POST",
      body,
      headers,
      cache: "no-store"
    });
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") || "application/json" }
    });
  } catch {
    return Response.json({ error: "Could not reach the Routely daemon. Is it running?" }, { status: 503 });
  }
}
