import { daemonFetch, daemonProxyResponse, type DaemonNotificationAttempt, type DaemonNotificationChannel } from "@/lib/daemon";

export const dynamic = "force-dynamic";

type NotificationsResponse = {
  channels: DaemonNotificationChannel[];
  attempts: DaemonNotificationAttempt[];
  channel?: DaemonNotificationChannel;
};

export async function GET(request: Request) {
  const result = await daemonFetch<NotificationsResponse>("/notifications", undefined, { request });
  return daemonProxyResponse(result);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await daemonFetch<NotificationsResponse>("/notifications", {
    method: "POST",
    body: JSON.stringify(body)
  }, { request });
  return daemonProxyResponse(result);
}
