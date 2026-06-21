import { daemonFetch, daemonProxyResponse, type DaemonBackupJob, type DaemonBackupRun } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type BackupsResponse = { jobs: DaemonBackupJob[]; runs: DaemonBackupRun[]; job?: DaemonBackupJob };

export async function GET(request: Request) {
  const result = await daemonFetch<BackupsResponse>("/backups", undefined, { request });
  return daemonProxyResponse(result);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await daemonFetch<BackupsResponse>("/backups", {
    method: "POST",
    body: JSON.stringify(body)
  }, { request });
  return daemonProxyResponse(result);
}
