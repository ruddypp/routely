# Routely Current Status

Status: Canonical implementation status summary
Owner: PM, Backend, Frontend, QA, Security
Last updated: 2026-06-22

## Product Direction

Routely is in public-alpha preparation. The alpha direction is Compose-first, dashboard-first, and solo-operator focused:

1. Local dashboard-first demo: three apps and one database are registered, bulk-started, and managed individually.
2. One-VPS operations demo: one app runs on one VPS with honest domain/proxy, env/secrets, deploy history, logs, health, database, and backup state.
3. GitHub redeploy demo: a configured branch push redeploys the intended app and broken deploy logs are inspectable.

Current public docs must distinguish implemented behavior from target behavior. Production Compose parity and full dashboard-first setup are hardening targets until Backend/Frontend verify them.

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
- App enablement is represented in config/DB/API records.
- SQLite state lives under `<workspace>/.routely/routely.db`.
- Local command-driver apps can be registered and started.
- Local lifecycle commands exist for init/add/sync/up/ps/down/restart/logs/doctor.
- The local `routely` path filters for enabled `command` and `compose` resources before starting them.
- Command app logs are persisted under `.routely/logs`.
- Dependency ordering, port preflight, and stale PID reconciliation have foundations.
- Compose-backed database/service registration exists for common database presets.

Dashboard/API:

- Next.js dashboard exists in `apps/web`.
- Browser code uses same-origin `/api/*` route handlers rather than calling the daemon directly.
- Dashboard app forms and DTOs include enablement and Compose metadata fields.
- Dashboard modules exist for overview, apps, deployments, domains, GitHub, env, logs, health, metrics, databases, backups, notifications/settings, and server status.
- Several dashboard controls already expose disabled reasons, but full Start All and production Compose workflows still need verification before public docs present them as complete.

Server and production operations:

- `routely server init` and `routely server doctor` foundations exist.
- Production private daemon paths require admin bearer token auth.
- Server-side dashboard/API calls can forward `ROUTELY_ADMIN_TOKEN` without exposing it to browser code.
- Dockerfile deploy foundations exist with deployment history and logs.
- A narrow Compose-backed production deploy path exists for one registered Compose app/service on the Routely host; broader production Compose parity still needs fresh VPS verification.
- Domain/proxy/HTTPS state exists with Traefik-compatible helpers.
- GitHub signed webhook validation and repo/branch auto-deploy foundations exist.
- Env/secrets storage, masking, injection, restart/redeploy-needed state, and redaction helpers exist.
- Health, runtime/deployment logs, and narrow metric sampling foundations exist.
- Production database records and local-file backup foundations exist.
- Generic webhook, Discord, and Telegram notification foundations exist.

## Hardening Needed

- Fresh local dashboard-first demo path with three apps plus one database.
- Verified app enable/disable UX and Start All semantics across config, daemon/API, CLI, and dashboard.
- Dashboard app creation/editing that is usable without manual config editing for the normal path.
- Fresh one-VPS verification for deploy path, domain, DNS, HTTPS, env/secrets, logs, deploy history, health, database, and backup state.
- Fresh one-service Compose deploy verification on a VPS, plus explicit public-alpha copy for any Compose cases still outside the verified bridge.
- GitHub push demo with one successful deploy and one intentional broken deploy.
- Complete production login/session UI or clear alpha access guidance.
- Installer/service-manager guidance for running Routely itself on a VPS.
- Security review for auth, secrets, GitHub webhooks, notification SSRF, Docker/Compose/proxy exposure, backups, and untrusted dashboard text.
- QA smoke reports for local, one-VPS, GitHub, and responsive dashboard views.

## Deferred

- npm publishing.
- Static/buildpack/Nixpacks/Railpack production deploy drivers unless verified.
- Public app catalog.
- Teams/RBAC, organizations, billing, or enterprise administration.
- Kubernetes.
- Public multi-server UX.
- External backup storage.
- Destructive restore automation.
- Email notifications.
- Broad VPS administration outside Routely-managed apps/services.
