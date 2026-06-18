import { daemonFetch, daemonProxyResponse, type DaemonBackupJob, type DaemonBackupRun } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
type BackupsResponse = { jobs: DaemonBackupJob[]; runs: DaemonBackupRun[]; job?: DaemonBackupJob };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await daemonFetch<BackupsResponse>(`/backups/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
  return daemonProxyResponse(result);
}
