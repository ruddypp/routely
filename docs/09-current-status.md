# Routely Current Status

Status: Canonical implementation status summary
Owner: PM, Backend, Frontend, QA, Security
Last updated: 2026-06-21

## Product Direction

Routely is in public-alpha preparation. The alpha is accepted through three demos:

1. Local demo: three apps and one database started by `routely`.
2. VPS demo: one Dockerfile app deployed to one VPS with domain and HTTPS.
3. GitHub demo: push to configured branch triggers redeploy and broken deploy logs are inspectable.

## Repo Shape

```text
routely/
  apps/
    cli/       # routely command
    daemon/    # long-running API/process
    web/       # Next.js dashboard and same-origin API route handlers
  packages/
    core/      # config/spec/DTO helpers
    db/        # SQLite persistence
    drivers/   # command, compose, Dockerfile runtime helpers
    github/    # GitHub App/webhook helpers
    proxy/     # Traefik-compatible proxy helpers
    presets/   # framework/database presets
  docs/
  examples/
```

## Implemented Or Alpha Foundations

Local runner:

- CLI package and local global install flow exist.
- Workspace resolution separates the Routely repo/install root from the active user workspace.
- `routely.yml` loading/normalization and SQLite sync foundations exist.
- SQLite state lives under `<workspace>/.routely/routely.db`.
- Local command-driver apps can be registered and started.
- Local lifecycle commands exist for init/add/sync/up/ps/down/restart/logs/doctor.
- Command app logs are persisted under `.routely/logs`.
- Dependency ordering, port preflight, and stale PID reconciliation have foundations.
- Compose-backed database/service registration exists for common database templates.

Dashboard/API:

- Next.js dashboard exists in `apps/web`.
- Browser code uses same-origin `/api/*` route handlers rather than calling the daemon directly.
- Dashboard modules exist for overview, apps, deployments, domains, GitHub, env, logs, health, metrics, databases, backups, notifications/settings, and server status.

Server and production operations:

- `routely server init` and `routely server doctor` foundations exist.
- Production private daemon paths require admin bearer token auth.
- Server-side dashboard/API calls can forward `ROUTELY_ADMIN_TOKEN` without exposing it to browser code.
- Dockerfile deploy foundations exist with deployment history and logs.
- Domain/proxy/HTTPS state exists with Traefik-compatible helpers.
- GitHub signed webhook validation and repo/branch auto-deploy foundations exist.
- Env/secrets storage, masking, injection, restart/redeploy-needed state, and redaction helpers exist.
- Health, runtime/deployment logs, and narrow metric sampling foundations exist.
- Production database records and local-file backup foundations exist.
- Generic webhook, Discord, and Telegram notification foundations exist.

## Hardening Needed

- Fresh local demo path with three apps plus one database.
- Fresh VPS verification for Dockerfile deploy, domain, DNS, and HTTPS state.
- GitHub push demo with one successful deploy and one intentional broken deploy.
- Complete production login/session UI or clear alpha access guidance.
- Installer/service-manager guidance for running Routely itself on a VPS.
- Security review for auth, secrets, GitHub webhooks, notification SSRF, Docker/proxy exposure, backups, and untrusted dashboard text.
- QA smoke reports for local, VPS, GitHub, and responsive dashboard views.

## Deferred

- npm publishing.
- Static/buildpack/Nixpacks/Railpack production deploy drivers unless verified.
- Marketplace/templates as public feature.
- Teams/RBAC.
- Kubernetes.
- Public multi-server UX.
- External backup storage.
- Destructive restore automation.
- Email notifications.
- Broad VPS administration outside Routely-managed apps/services.
