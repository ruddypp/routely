# Routely Agent Execution Context

Last updated: 2026-06-19  
Current completed checkpoint: Checkpoint 10, Database Services and Backups  
Next checkpoint: Checkpoint 11, Notifications and Release Polish

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

This reading is mandatory for the next agent. The agent should inspect enough of both repositories and public docs to understand the product model before planning, especially:

- How 9Router structures a local-first command/control workflow, one-command local runner, local registry, and quick status loop.
- How Dokploy structures production operations across app pages, deployments, domains, HTTPS/proxy, logs, metrics, databases, backups, settings, inspectors, and safe controls.
- How Routely should differ: one local-to-production registry and dashboard mental model for solo developers managing many apps on one VPS.

Future agents must treat those references as required product context, not optional inspiration. Read the repositories and docs enough to understand:

- 9Router's local-first command/control flow, local registry mental model, fast status visibility, and one-command daily workflow.
- Dokploy's dense single-VPS operations model: app/project pages, deployments, domains, HTTPS/proxy, logs, metrics, databases, backups, settings, readable status panels, and safe operational controls.
- Routely's differentiator: one app registry and one dashboard mental model that bridge local development and single-VPS production.

Do not copy either product mechanically. Use them to calibrate product shape, information architecture, and operational density.

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
- Checkpoint 10: database services and backups.

Current important behavior:

- Browser code must call same-origin `/api/*` only. Do not call the daemon directly from browser components.
- Production mode requires admin bearer token auth for private daemon actions.
- Preserve manual Dockerfile deploy, domain/proxy/HTTPS state, signed GitHub push-to-deploy, stored env/secrets, redaction behavior, restart/redeploy-needed flags, and health/metrics/log state.
- Keep secrets out of `routely.yml` by default. Stored secret values are hidden after save.
- Keep unsafe/future features inert unless the checkpoint explicitly asks for them.

Checkpoint 10 added:

- SQLite `databases`, `backup_jobs`, and `backup_runs` persistence with idempotent migrations.
- Shared helpers for database/backup DTOs, supported database type validation, cron schedule parsing, due-schedule checks, and retention selection.
- Authenticated daemon endpoints: `/databases`, `/databases/:id/start`, `/databases/:id/stop`, `/backups`, `/backups/:id`, and `/backups/:id/run`.
- Production database creation uses the existing Compose-backed database templates and keeps services internal-only by default.
- Manual backup runs execute narrow Docker Compose dump/checkpoint commands for PostgreSQL, MySQL, MariaDB, MongoDB, and Redis, write local files under the production data backup directory, persist run status/message/file metadata, and prune expired successful backup files according to retention.
- A lightweight daemon scheduler checks enabled backup jobs every minute using stored cron metadata and queues the same backup runner for due jobs.
- CLI now includes `routely db ls`, `routely backup enable <database>`, `routely backup disable <database>`, `routely backup run <database>`, and `routely backup ls`.
- Same-origin Next.js route handlers proxy database and backup endpoints under `/api/*`.
- Dashboard now has a real Databases & Backups operational panel backed by daemon/storage data, with create/start/stop database controls, backup enable/run/toggle controls, and backup run history.
- Secret/raw database env values are not returned in database DTOs; API/UI show env key names only.

Still deferred:

- Destructive restore automation.
- External backup storage.
- Notifications/alerts.
- Full rollback and broad VPS operations.

Current CLI surface includes workspace init/sync/add/up/down/ps/logs/restart/doctor, server init/doctor, deploy, env, domain, GitHub, and `routely health <app>`.

## Execution Standard For Next Work

Do not do a frontend-only redesign. For every checkpoint:

1. Make meaningful backend/storage/API/CLI progress first.
2. Add focused tests for the real behavior.
3. Then improve the dashboard around real daemon/API/storage data.
4. Keep the production dashboard operational, dense, readable, status-rich, and comfortable for daily VPS work.
5. Every visible production/env/deploy/domain/proxy/GitHub/log/health/metrics/database/backup panel should be backed by real data where practical. If a feature is future scope, keep it disabled and label it as a later checkpoint.
6. Preserve Routely's local-first identity and the same app registry/dashboard mental model.

Frontend/information architecture direction for upcoming work:

- The dashboard home must become overview-only: server readiness, fleet/app counts, recent deployments, health failures, backup status, urgent next actions, and nothing that belongs to a feature workflow.
- Do not keep expanding the main dashboard into a single overloaded page. New feature workflows must move into sidebar/navigation sections.
- Put feature-by-feature operational surfaces in the sidebar/navigation: Apps, Deployments, Domains, GitHub, Env, Logs, Health, Metrics, Databases, Backups, Settings.
- Each feature page/panel should be dense, readable, comfortable, and Dokploy-like: compact rows, clear hierarchy, status badges, safe actions, inspector tabs, timelines, readable logs, and no horizontal overflow.
- Improve typography as part of frontend work: use compact, readable app UI type; tighten oversized headings inside panels; keep labels legible; avoid cramped long strings; make code/log/env text easy to scan.
- Panels should feel like daily operations tools, not decorative marketing sections: clear resource rows, status cards, filters/tabs where useful, direct safe actions, obvious disabled states, and comfortable spacing.
- Frontend enhancement is required, but only after backend/API/storage behavior exists. Do not ship mock-only panels as if they are implemented.
- If a feature is not implemented yet, show it as disabled or future-checkpoint scope instead of making unsafe controls.

Implementation bar for all future checkpoints:

- Do not stop at frontend polish. Make comprehensive progress across storage/schema, DB helpers, daemon endpoints, production auth, safe runtime/command behavior, CLI/API workflows where useful, tests, docs, and then frontend.
- The frontend should get better during each product slice, but it must be backed by real daemon/API/storage data.
- Keep feature surfaces readable and comfortable: a solo developer should be able to inspect status, logs, settings, and next actions quickly without hunting through a long dashboard home.

Next task:

Implement Checkpoint 11 from `docs/14-implementation-plan.md`: Notifications and Release Polish.

Checkpoint 11 should be conservative:

- Add notification settings and delivery attempts only when backed by real storage/API behavior.
- Support generic webhook, Discord webhook, and Telegram where practical with secret redaction.
- Trigger notifications for deploy succeeded, deploy failed, and backup failed.
- Keep restore/destructive operations, marketplace templates, broad VPS operations, and full rollback deferred.

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
