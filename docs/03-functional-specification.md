# Routely Functional Specification

Version: 0.1  
Status: Draft

## English

This document defines what Routely must do from a user and system behavior perspective.

## Indonesia

Dokumen ini menjelaskan perilaku fungsional Routely dari sudut pandang user dan sistem.

## 1. App Registry

Routely must store registered apps with:

- Name.
- Type: app, database, compose stack, static, worker.
- Mode support: local, production, or both.
- Source: local path, GitHub repo, Docker image, Dockerfile, Compose file.
- Runtime driver.
- Ports.
- Env vars.
- Domains.
- Healthcheck.
- Dependencies.
- Backup policy where relevant.

## 2. Local Runner

Required behavior:

- `routely` starts all enabled local apps.
- Use command driver by default for framework apps.
- Use Compose driver for local databases and Compose projects.
- Detect port conflicts before start.
- Stop all child processes when Routely exits.
- Stream logs to terminal and dashboard.

## 3. Production Deployment

Required behavior:

- Connect GitHub.
- Select repo and branch.
- Select preset/build strategy.
- Configure env vars.
- Configure domain.
- Build and deploy.
- Show build and deploy logs.
- Mark deploy failed if build, container start, proxy route, or healthcheck fails.
- Auto deploy on push to `main` or `master`.

## 4. Dashboard

Required views:

- Overview.
- Apps.
- App detail.
- Deployments.
- Logs.
- Metrics.
- Domains.
- Environment variables.
- Databases.
- Backups.
- Settings.

## 5. GitHub

Required behavior:

- Authenticate with GitHub App.
- List repositories installed for the app.
- Support private repos.
- Store installation metadata.
- Receive webhook events.
- Trigger deploy on push to configured branch.

## 6. Domain And HTTPS

Required behavior:

- Add root domain.
- Add wildcard domain instructions.
- Add custom domain per app.
- Verify DNS points to server IP.
- Create proxy route.
- Issue HTTPS automatically in production.
- Show certificate status.

## 7. Databases

Required templates:

- PostgreSQL.
- MySQL/MariaDB.
- Redis.
- MongoDB.

Security default:

- Internal-only network in production.
- Public exposure must be explicit.

## 8. Monitoring

Required metrics:

- App status.
- CPU.
- Memory.
- Disk.
- Network where available.
- Response time for HTTP apps.
- Last deploy status.
- Uptime/healthcheck state.

## 9. Backup

Required behavior:

- Per-database backup toggle.
- Manual backup.
- Scheduled backup.
- Backup retention setting.
- Backup status and logs.

## 10. Environment Manager

Required behavior:

- Add/edit/delete env vars per app.
- Mark secrets as hidden.
- Inject env vars into local process or production container.
- Require redeploy/restart when env changes affect running app.

## 11. Notifications

MVP should support low-friction free notification channels:

- Webhook URL.
- Discord webhook.
- Telegram bot token/chat ID.

Email can be postponed because free reliable email delivery is harder.

