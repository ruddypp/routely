type DaemonHealth = {
  ok: boolean;
  service: string;
  version: string;
  database?: string;
};

type RoutelyApp = {
  id: number;
  serverId: number;
  name: string;
  type: string;
  preset: string;
  driver: string;
  path: string | null;
  command: string | null;
  port: number | null;
  enabled: boolean;
  status: string;
};

type DashboardData = {
  connected: boolean;
  daemonUrl: string;
  health: DaemonHealth | null;
  apps: RoutelyApp[];
  error: string | null;
};

export const dynamic = "force-dynamic";

async function getDashboardData(): Promise<DashboardData> {
  const daemonUrl = process.env.NEXT_PUBLIC_ROUTELY_DAEMON_URL || "http://127.0.0.1:9977";

  try {
    const [healthResponse, appsResponse] = await Promise.all([
      fetch(`${daemonUrl}/health`, { cache: "no-store" }),
      fetch(`${daemonUrl}/apps`, { cache: "no-store" })
    ]);

    if (!healthResponse.ok) {
      throw new Error(`Daemon health returned HTTP ${healthResponse.status}`);
    }

    const health = (await healthResponse.json()) as DaemonHealth;
    const appsPayload = appsResponse.ok ? ((await appsResponse.json()) as { apps?: RoutelyApp[] }) : { apps: [] };

    return {
      connected: Boolean(health.ok),
      daemonUrl,
      health,
      apps: appsPayload.apps || [],
      error: null
    };
  } catch (error) {
    return {
      connected: false,
      daemonUrl,
      health: null,
      apps: [],
      error: error instanceof Error ? error.message : "Unable to reach Routely daemon"
    };
  }
}

export default async function Home() {
  const data = await getDashboardData();

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#1d1d1b]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-5 border-b border-[#d8d5cc] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#6f7468]">Routely local</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-normal text-[#171714]">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-[#d8d5cc] bg-white px-4 py-3 shadow-sm">
            <span
              className={`h-3 w-3 rounded-full ${data.connected ? "bg-[#188b53]" : "bg-[#c44536]"}`}
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold">Daemon {data.connected ? "connected" : "disconnected"}</p>
              <p className="text-xs text-[#6f7468]">{data.daemonUrl}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-[#d8d5cc] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#6f7468]">Service</p>
            <p className="mt-2 text-lg font-semibold">{data.health?.service || "Unavailable"}</p>
          </div>
          <div className="rounded-md border border-[#d8d5cc] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#6f7468]">Version</p>
            <p className="mt-2 text-lg font-semibold">{data.health?.version || "-"}</p>
          </div>
          <div className="rounded-md border border-[#d8d5cc] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#6f7468]">Registered apps</p>
            <p className="mt-2 text-lg font-semibold">{data.apps.length}</p>
          </div>
        </section>

        {data.error ? (
          <section className="rounded-md border border-[#e2b7af] bg-[#fff7f4] p-5 text-[#713126]">
            <p className="font-semibold">Daemon is not reachable</p>
            <p className="mt-1 text-sm">{data.error}</p>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-md border border-[#d8d5cc] bg-white shadow-sm">
          <div className="border-b border-[#d8d5cc] px-5 py-4">
            <h2 className="text-lg font-semibold">Apps</h2>
          </div>

          {data.apps.length === 0 ? (
            <div className="px-5 py-10 text-sm text-[#6f7468]">No apps registered yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-[#efeee8] text-xs uppercase tracking-[0.08em] text-[#6f7468]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Driver</th>
                    <th className="px-5 py-3 font-semibold">Port</th>
                    <th className="px-5 py-3 font-semibold">Command</th>
                  </tr>
                </thead>
                <tbody>
                  {data.apps.map((app) => (
                    <tr key={app.id} className="border-t border-[#ece9df]">
                      <td className="px-5 py-4 font-medium">{app.name}</td>
                      <td className="px-5 py-4">{app.status}</td>
                      <td className="px-5 py-4">{app.driver}</td>
                      <td className="px-5 py-4">{app.port || "-"}</td>
                      <td className="max-w-[340px] truncate px-5 py-4 font-mono text-xs text-[#5b5f54]">
                        {app.command || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
