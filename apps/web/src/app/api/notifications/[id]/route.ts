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
  });
  return daemonProxyResponse(result);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await daemonFetch<NotificationsResponse>(`/notifications/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
  return daemonProxyResponse(result);
}
