import { daemonFetch, daemonProxyResponse, type DaemonNotificationAttempt, type DaemonNotificationChannel } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type NotificationsResponse = {
  ok?: boolean;
  channels: DaemonNotificationChannel[];
  attempts: DaemonNotificationAttempt[];
  channel?: DaemonNotificationChannel;
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const result = await daemonFetch<NotificationsResponse>(`/notifications/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  }, { request });
  return daemonProxyResponse(result);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await daemonFetch<NotificationsResponse>(`/notifications/${encodeURIComponent(id)}`, {
    method: "DELETE"
  }, { request });
  return daemonProxyResponse(result);
}
