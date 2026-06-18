import { daemonFetch, daemonProxyResponse, type DaemonBackupJob, type DaemonBackupRun } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
type BackupsResponse = { jobs: DaemonBackupJob[]; runs: DaemonBackupRun[]; run?: DaemonBackupRun };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await daemonFetch<BackupsResponse>(`/backups/${encodeURIComponent(id)}/run`, {
    method: "POST",
    body: JSON.stringify(body)
  });
  return daemonProxyResponse(result);
}
