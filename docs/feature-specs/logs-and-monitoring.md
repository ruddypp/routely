# Feature Spec: Logs And Monitoring

Version: 0.1  
Status: Draft

## English

Logs and monitoring must make Routely useful for real production debugging, not just deployment.

## Indonesia

Log dan monitoring harus membuat Routely berguna untuk debugging production, bukan hanya deploy.

## Logs

Required logs:

- App logs.
- Build logs.
- Deploy logs.
- Proxy logs.
- Backup logs.

## Metrics

Required metrics:

- CPU.
- RAM.
- Disk.
- App health.
- Response time.
- Restart count.
- Last deploy status.

## Alerts

MVP alert channels:

- Discord webhook.
- Telegram bot.
- Generic webhook.

## Acceptance Criteria

- User can inspect failed deploy logs from dashboard.
- User can see CPU/RAM/disk usage.
- User can configure a Discord or Telegram alert for app down.

