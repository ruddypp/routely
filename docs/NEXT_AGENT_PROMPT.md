# Next Agent Prompt

Last updated: 2026-06-18  
Latest completed commit: `010900c feat: add production deploy slice`

Use this prompt for the next implementation agent. It intentionally asks for a comprehensive product/backend/frontend slice, not a frontend-only redesign.

```text
You are working in /home/ruddypp/Documents/work/routely.

Read AGENTS.md, docs/HANDOFF.md, docs/14-implementation-plan.md, docs/13-current-setup-status.md, DESIGN.md, and the relevant feature/spec docs before editing. Follow AGENTS.md strictly, including the Next.js docs rule and the auto-commit rule.

Project intent:
Routely is a 9Router-inspired local app runner plus Dokploy-inspired single-VPS deployment platform. The differentiator is a local-to-production workflow for solo developers: local apps/services first, then one-server production operations using the same registry and dashboard mental model.

Current progress:
- Checkpoint 0 is complete and committed.
- Checkpoint 1 local runner is complete and committed.
- Checkpoint 2 dashboard local lifecycle controls are complete and committed.
- Checkpoint 2.5 frontend product shell is implemented and polished.
- Checkpoint 3 config, presets, and Compose services is complete and committed.
- Checkpoint 4 production server foundation is complete and committed.
- Checkpoint 5 production deploy vertical slice is complete and committed.
- Latest completed commit: 010900c `feat: add production deploy slice`.
- Browser code must keep using same-origin `/api/*`; do not call the daemon directly from browser code.
- Local daemon should bind to `127.0.0.1` in local mode.
- `routely.yml` remains desired portable config; SQLite stores runtime state/history.
- Production mode requires admin bearer token auth for private daemon actions; local mode remains frictionless.

Current implemented surface:
- CLI supports workspace init/sync/add/up/down/ps/logs/restart/doctor.
- `routely add <path>` detects common local presets and writes editable config back to `routely.yml`.
- `routely db add <postgres|mysql|mariadb|redis|mongodb>` registers Compose-backed local database services.
- Config normalization and SQLite persistence cover install/dev/build/start commands, env, dependencies, healthchecks, domains/source metadata, Compose metadata, internal flags, images, and volumes.
- Presets exist for Next.js, Vite/React, Laravel, Express, NestJS, Django, FastAPI, Go, static HTML/CSS, and PHP custom.
- Compose driver generates local Compose files under `.routely/compose` and uses Docker Compose for local service start/stop.
- Daemon lifecycle endpoints support command and Compose resources through existing `/apps/:id/start|stop|restart|logs` paths.
- CLI supports `routely server init` and `routely server doctor`.
- SQLite settings persist production mode, production data directory, admin token hash/salt metadata, and latest server doctor result.
- Daemon exposes `/server/status`, `/auth/status`, and `/server/doctor`; production mode requires an admin bearer token for private app/registry/lifecycle/API actions.
- Next.js exposes `/api/server/status` and forwards `ROUTELY_ADMIN_TOKEN` server-side when configured.
- Checkpoint 5 added SQLite deployment state/log tables plus `app_sources` and `healthchecks` table creation.
- Checkpoint 5 added Dockerfile deployment helpers and daemon endpoints:
  - `GET /deployments`
  - `GET /apps/:id/deployments`
  - `POST /apps/:id/deployments`
  - `GET /deployments/:id`
  - `GET /deployments/:id/logs`
- `routely deploy <app>` and `routely deploy <app> --watch` trigger Dockerfile deployments through the daemon and stream deployment logs.
- Dockerfile deployments currently build from a local source path containing `Dockerfile`, start a container on a temporary `127.0.0.1:32xxx` host port, run configured HTTP healthcheck or container-running check, and store image/container/port metadata for future rollback.
- Failed deploys mark deployment failed, keep last successful deployment metadata intact, and remove the failed new container where practical.
- Next.js same-origin route handlers proxy deployment list/trigger/detail/log endpoints under `/api/*`.
- Dashboard currently has local app/service resource separation, server foundation readiness, a Dockerfile deploy panel, deployment phase rows, deployment logs, temporary URLs, inspector tabs, desktop sidebar, mobile bottom nav, and locked placeholders for Domains/HTTPS/GitHub/Backups.

Your next task:
Implement Checkpoint 6 from docs/14-implementation-plan.md comprehensively: Proxy, Domains, and HTTPS.

This must be a full product/backend/frontend slice. Do not only polish CSS. Build the smallest end-to-end domain/proxy/HTTPS path, docs, tests, daemon/API/storage behavior, CLI commands, and a substantially improved Dokploy-inspired operational panel while reusing the Checkpoint 4 server foundation and Checkpoint 5 deployment metadata/logging.

Important execution bar:
- Make meaningful backend progress first: domain/proxy tables and state, proxy config helpers, daemon endpoints, auth enforcement, CLI domain commands, persistence, focused tests, and safe integration with successful Dockerfile deployments.
- Then enhance the frontend around real data. The production panel should feel much closer to Dokploy: operational, dense, status-rich, readable, easy to use, and comfortable for daily VPS operations.
- Do not deliver a frontend-only redesign. Every production/domain/proxy/HTTPS panel must be backed by daemon/API/storage data where practical.
- Keep unsafe or future production features inert until their checkpoints. Do not implement GitHub automation, backups, broad VPS operations, database production templates, notifications, or full rollback during Checkpoint 6.
- Domains and HTTPS are now in scope, but keep the implementation conservative. Prefer explicit admin-triggered actions and clear status over hidden automation.

Required reading before coding:
1. AGENTS.md
2. docs/HANDOFF.md
3. docs/14-implementation-plan.md, especially Checkpoint 6
4. docs/13-current-setup-status.md
5. docs/01-prd.md
6. docs/02-technical-architecture.md
7. docs/03-functional-specification.md
8. docs/04-user-flows.md
9. docs/05-cli-spec.md
10. docs/06-api-spec.md
11. docs/07-config-spec.md
12. docs/08-data-model.md
13. docs/09-security-model.md
14. docs/feature-specs/production-deploy.md
15. docs/feature-specs/domain-and-https.md
16. docs/feature-specs/runtime-and-build-system.md
17. docs/feature-specs/dashboard.md
18. DESIGN.md

Before editing `apps/web`, read relevant Next.js docs in `node_modules/next/dist/docs/`. This repo uses Next.js 16.2.9 and AGENTS.md says this is not the Next.js you know.

Inspect current implementation before changing it:
- apps/cli/src/*
- apps/daemon/src/server.js
- apps/web/src/app/dashboard-client.tsx
- apps/web/src/app/api/*
- apps/web/src/lib/daemon.ts
- packages/core/src/config.js and related DTO/types
- packages/core/src/server-foundation.js
- packages/db/*
- packages/drivers/*
- packages/proxy/*
- packages/presets/*
- docs/feature-specs/domain-and-https.md
- docs/feature-specs/production-deploy.md
- docs/feature-specs/dashboard.md

Checkpoint 6 backend/product goals:
- Add the smallest complete proxy/domain/HTTPS vertical slice for a single VPS and a Dockerfile-deployed app.
- Add domain/proxy/TLS state tables or extend existing schema in line with docs/08-data-model.md, without overbuilding multi-server behavior.
- Implement `packages/proxy` helpers around a Traefik-compatible model: dynamic config or labels/config generation, route naming, service target mapping, and safe serialization.
- Add daemon endpoints for domain list/add/delete/verify and route/proxy status where needed.
- Add same-origin Next.js route handlers for the new daemon endpoints. Browser code must call `/api/*` only.
- Add CLI domain commands consistent with docs/05-cli-spec.md where practical:
  - `routely domain root <domain>`
  - `routely domain add <app> <hostname>`
  - `routely domain verify <hostname>`
  - `routely domain ls`
- Tie domains to deployed app/container metadata from Checkpoint 5. If no successful deployment exists, show a clear precondition failure instead of creating a misleading live route.
- Verify DNS A records against the server public IP where practical. If public IP discovery is not robust yet, implement a conservative check with explicit status and actionable message.
- Generate or persist enough proxy route/TLS metadata to support later automation and troubleshooting.
- Support a conservative HTTPS status model. If full certificate issuance requires running Traefik/system integration that is too large for this checkpoint, store TLS state and make pending/manual status explicit; do not fake success.
- Do not expose databases publicly by default.
- Preserve the previous successful deployment on route/domain/proxy failure.
- Add useful failure states and messages for missing successful deployment, invalid hostname, DNS mismatch, proxy config generation failure, auth failure, and unsupported deployment type.
- Keep GitHub automation, backups, full rollback, metrics collection, notifications, and broad VPS operations deferred.

Frontend/product goals:
- Enhance the current production panel into a more Dokploy-inspired operational control surface backed by real domain/proxy/TLS/deployment data.
- Do not create a landing page. The first screen must remain a usable product control surface.
- Improve readability and daily usability: compact but not cramped, clear hierarchy, clear disabled/precondition states, readable logs/status rows, and obvious primary actions.
- Keep local resources visible, but make production deployment/domain/proxy surfaces clearly separate from local start/restart controls.
- Build a stronger right-side inspector with tabs/sections where feasible:
  - Overview
  - Deployments
  - Domains
  - Proxy/HTTPS
  - Logs
  - Config
- Add domain cards/rows with hostname, app, DNS status, proxy status, TLS status, last checked time, and actionable errors.
- Add route/proxy readiness cards near domain controls: Docker, auth, data-dir, ports 80/443, successful deployment, DNS, proxy config, TLS.
- Add disabled/inert placeholders for GitHub, Backups, Notifications, and broader VPS operations that look intentional, not unfinished.
- Make the visual design closer to Dokploy while still respecting DESIGN.md:
  - dark operational surfaces
  - dense resource tables/cards
  - readable right inspector
  - status-rich badges and phase rows
  - functional green accent only for active/primary actions
  - no generic SaaS hero/landing page
  - no horizontal overflow or overlapping controls on desktop/tablet/mobile
- Every visible production/domain/proxy control should be backed by real daemon/API/storage state or intentionally disabled with a clear checkpoint label.

Testing and verification:
- Add or adjust tests for backend/domain/proxy/storage/API behavior. Pure CSS polish is not enough.
- Add unit tests for proxy config generation and DNS verification helpers where implemented.
- Add route-handler tests for same-origin domain/proxy endpoints and daemon-unreachable/auth failures.
- Add CLI/shared tests when CLI/core/db/proxy code changes.
- Run at minimum:
  - npm run lint
  - npm run test --workspace apps/cli if CLI/shared code is touched
  - npm run build --workspace apps/cli if CLI/shared runtime code is touched
  - npm run test --workspace apps/web if web/API route handlers are touched
  - npx tsc --noEmit --project apps/web/tsconfig.json if apps/web is touched
  - node --check apps/daemon/src/server.js if daemon code is touched
  - relevant package tests/builds for touched workspaces
  - browser smoke/responsive screenshots for desktop/tablet/mobile if frontend UI changes
- Attempt `npm run build --workspace apps/web`, but note the known caveat: this tool may return only `Finished TypeScript...` with no final exit marker and no remaining build process. Treat this as pre-existing unless your changes produce a new explicit error.
- If practical, run a temporary Dockerfile app deploy smoke first, then add/verify a test domain/proxy route in the safest local/manual way possible. Do not claim public HTTPS success unless actually verified.

Documentation and commit:
- Update docs if behavior, commands, config fields, verification status, known caveats, or deferred boundaries change.
- Update docs/HANDOFF.md and docs/13-current-setup-status.md at the end.
- Update docs/NEXT_AGENT_PROMPT.md at the end if the next checkpoint changes.
- Preserve unrelated user changes. Do not use destructive git commands.
- After verification, commit only files changed for this Checkpoint 6 slice with a concise commit message such as `feat: add domain proxy slice`.
```

## Execution Notes For The Next Agent

- The user explicitly wants the frontend design enhanced to feel more Dokploy-like, but not as a frontend-only task.
- Treat the UI as an operational surface backed by real domain/proxy/TLS/deployment/server/auth/readiness data.
- Backend, storage, daemon/API, CLI, and tests should lead the work. The frontend should expose the real behavior clearly after the backend exists.
- Keep the panel readable and comfortable: dense operational data, clear status cards, clear action buttons, obvious disabled states, and responsive layouts without overlap.
- Checkpoint 6 should build on Checkpoint 5 deployment metadata. Domain/proxy actions should require a successful deployment or show a clear precondition failure.
- Keep GitHub automation, backups, notifications, production database templates, full rollback, metrics collection, and broad VPS operations out of scope until later checkpoints.
- If Checkpoint 6 needs narrowing, implement the smallest complete vertical slice that includes storage, proxy helpers, daemon/API, same-origin Next.js API, CLI command(s), dashboard panel, tests, docs, and commit.
