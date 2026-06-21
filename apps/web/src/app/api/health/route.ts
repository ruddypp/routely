import { daemonFetch, type DaemonHealth } from "@/lib/daemon";

// Always reflect live daemon state; never cache.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await daemonFetch<DaemonHealth>("/health", undefined, { request });

  if (!result.ok) {
    return Response.json(
      { connected: false, daemonUrl: process.env.ROUTELY_DAEMON_URL || "http://127.0.0.1:9977", error: result.error },
      { status: 200 }
    );
  }

  return Response.json({
    connected: Boolean(result.data.ok),
    daemonUrl: process.env.ROUTELY_DAEMON_URL || "http://127.0.0.1:9977",
    health: result.data,
    error: null
  });
}
