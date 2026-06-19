import { daemonFetch, daemonProxyResponse, type DaemonNotificationAttempt, type DaemonNotificationChannel } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type NotificationsResponse = {
  channels: DaemonNotificationChannel[];
  attempts: DaemonNotificationAttempt[];
  attempt?: DaemonNotificationAttempt;
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const result = await daemonFetch<NotificationsResponse>(`/notifications/${encodeURIComponent(id)}/test`, {
    method: "POST",
    body: JSON.stringify(body)
  });
  return daemonProxyResponse(result);
}
