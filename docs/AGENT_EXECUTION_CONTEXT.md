# Routely Agent Execution Context

Last updated: 2026-06-18  
Current completed checkpoint: Checkpoint 9, Logs, Metrics, and Health  
Next checkpoint: Checkpoint 10, Database Services and Backups

This file is a compact handoff and copy-paste prompt for another implementation agent.

## Product Identity

Routely is an open source, self-hosted app manager for solo developers.

- Local-first command/control inspired by 9Router: one command starts local apps/services and status is visible quickly.
- Single-VPS production operations inspired by Dokploy: dense app management, deployments, domains, HTTPS/proxy, logs, health, metrics, env, databases, backups, and safe controls.
- Routely must not clone either product. Its identity is bridging local development and single-VPS production through one app registry and dashboard mental model.

Before major production/dashboard/backend work, read:

- `https://github.com/decolua/9router`
- `https://github.com/decolua/9router/blob/master/DOCKER.md`
- `https://github.com/Dokploy/dokploy`
- `https://dokploy.com/`
- `https://docs.dokploy.com/`
- `https://docs.dokploy.com/docs/core/applications/going-production`

## Current Progress

Implemented checkpoints:

- Checkpoint 0: foundation/root resolution.
- Checkpoint 1: local runner lifecycle, logs, restart/down/doctor, dependency ordering.
- Checkpoint 2: dashboard local controls and same-origin app action routes.
- Checkpoint 2.5: cohesive 9Router-inspired frontend shell.
- Checkpoint 3: config, presets, Compose services, local database service templates.
- Checkpoint 4: production server foundation and admin token auth.
- Checkpoint 5: Dockerfile-first production deploy vertical slice.
- Checkpoint 6: proxy, domains, and HTTPS state.
- Checkpoint 7: GitHub integration and signed push-to-deploy.
- Checkpoint 8: environment, secrets, app settings, redaction, env injection, restart/redeploy-needed state.
- Checkpoint 9: logs, metrics, and health.

Current important behavior:

- Browser code must call same-origin `/api/*` only. Do not call the daemon directly from browser components.
- Production mode requires admin bearer token auth for private daemon actions.
- Preserve manual Dockerfile deploy, domain/proxy/HTTPS state, signed GitHub push-to-deploy, stored env/secrets, redaction behavior, restart/redeploy-needed flags, and health/metrics/log state.
- Keep secrets out of `routely.yml` by default. Stored secret values are hidden after save.
- Keep unsafe/future features inert unless the checkpoint explicitly asks for them.

Checkpoint 9 added:

- SQLite `healthchecks` and `metrics_samples` persistence.
- Shared helpers for HTTP/runtime health evaluation, public health/metric DTOs, and SSE event framing.
- Authenticated daemon endpoints: `/apps/:id/health`, `/apps/:id/metrics`, `/metrics`, `/deployments/:id/logs/stream`.
- Health refresh uses configured HTTP healthchecks, Docker container running state for successful deployments, or local runtime/Compose state.
- Deployment failures persist unhealthy app state with failing phase summaries.
- Runtime and deployment logs continue to redact stored app secret values where practical.
- CLI `routely health <app>` shows health, latest deploy state, and recent metric samples.
- Same-origin Next.js route handlers proxy health, metrics, and log stream endpoints.
- Dashboard inspector has a Health tab and overview health/CPU/RAM cards backed by daemon/storage data.

Current CLI surface includes workspace init/sync/add/up/down/ps/logs/restart/doctor, server init/doctor, deploy, env, domain, GitHub, and `routely health <app>`.

## Execution Standard For Next Work

Do not do a frontend-only redesign. For every checkpoint:

1. Make meaningful backend/storage/API/CLI progress first.
2. Add focused tests for the real behavior.
3. Then improve the dashboard around real daemon/API/storage data.
4. Keep the production dashboard operational, dense, readable, status-rich, and comfortable for daily VPS work.
5. Every visible production/env/deploy/domain/proxy/GitHub/log/health/metrics/database/backup panel should be backed by real data where practical. If a feature is future scope, keep it disabled and label it as a later checkpoint.
6. Preserve Routely's local-first identity and the same app registry/dashboard mental model.

Next task:

Implement Checkpoint 10 from `docs/14-implementation-plan.md`: Database Services and Backups.

Checkpoint 10 should be conservative:

- Build production database service records/templates only when backed by real daemon/storage/runtime behavior.
- Add backup job/run persistence and a safe manual backup path.
- Keep restore/destructive operations explicit and deferred unless the plan requires a narrow inert placeholder.
- Do not implement notifications, full rollback, marketplace templates, broad VPS operations, or unsafe restore automation.
- Reuse secret redaction and never leak database credentials in logs/API/UI.

Required checks remain:

- `npm run lint`
- `npm run test --workspace apps/cli` if CLI/shared code is touched
- `npm run build --workspace apps/cli` if CLI/shared runtime code is touched
- `npm run test --workspace apps/web` if web/API route handlers are touched
- `npx tsc --noEmit --project apps/web/tsconfig.json` if apps/web is touched
- `node --check apps/daemon/src/server.js` if daemon code is touched
- Attempt `npm run build --workspace apps/web` and document the known Turbopack output caveat if it appears.

Known caveat:

- `npm run build --workspace apps/web` may return only partial Turbopack output such as `Finished TypeScript...` with no final exit marker. Treat this as the existing build-reporting caveat unless new concrete diagnostics appear.
