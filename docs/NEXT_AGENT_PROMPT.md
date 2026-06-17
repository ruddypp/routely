# Next Agent Prompt

Last updated: 2026-06-18  
Latest completed commit: `965695d feat: add production server foundation`

Use this prompt for the next implementation agent. It intentionally asks for a comprehensive product/backend/frontend slice, not a frontend-only redesign.

```text
You are working in /home/ruddypp/Documents/work/routely.

Read AGENTS.md, docs/HANDOFF.md, docs/14-implementation-plan.md, docs/13-current-setup-status.md, DESIGN.md, and the relevant feature/spec docs before editing. Follow AGENTS.md strictly, including the Next.js docs rule and the auto-commit rule.

Project intent:
Routely is a 9Router-inspired local app runner plus Dokploy-inspired VPS deployment platform. The differentiator is a local-to-production workflow for solo developers: local apps/services first, then one-server production operations later.

Current progress:
- Checkpoint 0 is complete and committed.
- Checkpoint 1 local runner is complete and committed.
- Checkpoint 2 dashboard local lifecycle controls are implemented and committed.
- Checkpoint 2.5 frontend product shell is implemented and polished.
- Checkpoint 3 config, presets, and Compose services is implemented and committed.
- Checkpoint 4 production server foundation is implemented and committed.
- Latest completed commit: 965695d `feat: add production server foundation`.
- Browser code must keep using same-origin `/api/*`; do not call the daemon directly from browser code.
- Local daemon should bind to `127.0.0.1` in local mode.
- `routely.yml` remains desired portable config; SQLite stores runtime state/history.
- Production server readiness/auth foundation exists. Do not implement domains, HTTPS, GitHub automation, backups, or broader production app actions before their checkpoints.

Current implemented surface:
- CLI supports workspace init/sync/add/up/down/ps/logs/restart/doctor.
- `routely add <path>` detects common local presets and writes editable config back to `routely.yml`.
- `routely db add <postgres|mysql|mariadb|redis|mongodb>` registers Compose-backed local database services.
- Config normalization and SQLite persistence cover install/dev/build/start commands, env, dependencies, healthchecks, domains/source metadata, Compose metadata, internal flags, images, and volumes.
- Presets exist for Next.js, Vite/React, Laravel, Express, NestJS, Django, FastAPI, Go, static HTML/CSS, and PHP custom.
- Compose driver generates local Compose files under `.routely/compose` and uses Docker Compose for local service start/stop.
- Daemon lifecycle endpoints support command and Compose resources through existing `/apps/:id/start|stop|restart|logs` paths.
- Next.js route handlers proxy same-origin `/api/*` requests to the daemon.
- Dashboard has local app/service resource separation, dense rows, inspector, recent logs, add/edit registry forms, desktop sidebar, mobile bottom nav, and inert future production nav placeholders.
- CLI now supports `routely server init` and `routely server doctor`.
- SQLite settings persist production mode, production data directory, admin token hash/salt metadata, and latest server doctor result.
- Daemon exposes `/server/status`, `/auth/status`, and `/server/doctor`; production mode requires an admin bearer token for private app/registry/lifecycle API paths.
- Next.js exposes `/api/server/status` and forwards `ROUTELY_ADMIN_TOKEN` server-side when configured.
- Dashboard includes a server foundation readiness panel backed by real server status data, while deploy/domain/HTTPS/GitHub/backup capabilities remain locked placeholders.

Your next task:
Implement Checkpoint 5 from docs/14-implementation-plan.md comprehensively: Production Deploy Vertical Slice.

This must be a full product/backend/frontend slice. Do not only polish CSS. Build the smallest end-to-end production deploy path, docs, tests, daemon/API/storage behavior, CLI commands, and a substantially improved Dokploy-inspired operational panel while reusing the Checkpoint 4 server foundation.

Important execution bar:
- Make meaningful backend progress first: deployment tables/state, Dockerfile deploy helpers, daemon endpoints, auth enforcement, CLI deploy commands, and focused tests.
- Then enhance the frontend around that real data. The panel should feel much closer to Dokploy: operational, dense, status-rich, with deployment phases, logs, server readiness, resource status, and locked future capabilities clearly separated.
- Do not deliver a frontend-only redesign. Every new production/deploy panel should be backed by daemon/API/storage data where practical.
- Keep unsafe or future production features inert until their checkpoints. Do not implement domains, HTTPS automation, GitHub automation, backups, or broad VPS operations during Checkpoint 5.

Required reading before coding:
1. AGENTS.md
2. docs/HANDOFF.md
3. docs/14-implementation-plan.md, especially Checkpoint 5
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
14. docs/feature-specs/local-runner.md
15. docs/feature-specs/dashboard.md
16. DESIGN.md

Before editing `apps/web`, read relevant Next.js docs in `node_modules/next/dist/docs/`. This repo uses Next.js 16.2.9 and AGENTS.md says this is not the Next.js you know.

Inspect current implementation before changing it:
- apps/cli/src/*
- apps/daemon/src/server.js
- apps/web/src/app/dashboard-client.tsx
- apps/web/src/app/api/*
- apps/web/src/lib/daemon.ts
- packages/core/src/config.js and related DTO/types
- packages/db/*
- packages/drivers/*
- packages/presets/*
- packages/proxy/* if production foundation touches proxy planning
- packages/core/src/server-foundation.js
- docs/feature-specs/production-deploy.md
- docs/feature-specs/runtime-and-build-system.md

Checkpoint 5 backend/product goals:
- Add the smallest complete production deployment vertical slice, centered on Dockerfile first and static only if the Dockerfile path is stable.
- Add deployment state tables/log tables needed for queued/preparing/building/starting/healthchecking/succeeded/failed lifecycle.
- Add `routely deploy <app>` and `routely deploy <app> --watch` if consistent with the current CLI shape.
- Implement a conservative Dockerfile deploy driver/helper that can build and start a container on the single server, with logs captured incrementally.
- Keep the previous production app alive on failed deploy where practical; at minimum, do not delete known-good metadata on failure.
- Add only the daemon/API and same-origin Next.js route handlers needed for deployment status/log display and triggering the vertical slice.
- Require production auth for deployment actions. Local mode must remain frictionless for local runner behavior.
- Keep domains, HTTPS automation, GitHub automation, backups, and broader VPS operations deferred.
- Make deployment logs inspectable from both CLI and dashboard.
- Store enough metadata for later rollback without implementing full rollback if that would exceed Checkpoint 5.
- Add failure states and useful error messages for missing Dockerfile, Docker unavailable, build failure, container start failure, and auth failure.
- Do not bind production apps to public domains yet; use a temporary host port or internal container status as the checkpoint allows.

Frontend/product goals:
- Extend the current Dokploy-inspired operational surface with a deploy/status/log vertical slice backed by real deployment data.
- Do not create a landing page. The first screen must remain a usable product control surface.
- Keep local resources and server foundation visible; add deployment status/log UI only where backend data exists.
- Keep domains, HTTPS, GitHub, and backups disabled/inert until their checkpoints.
- Keep the visual system aligned with DESIGN.md: near-black surfaces, compact typography, functional green accent, pill/circle controls, heavy dark elevation, no generic SaaS landing page.
- Make the panel better than the current baseline:
  - stronger right-side inspector with tabs/sections for Overview, Deployments, Logs, and Config where feasible
  - deployment timeline/phase rows with clear statuses and timestamps
  - server readiness cards for Docker/auth/data-dir/ports near deploy controls
  - separate local resources vs production deployment surfaces without confusing local start/restart with deploy actions
  - disabled placeholders for Domains, HTTPS, GitHub, and Backups that look intentional, not unfinished
  - responsive desktop/tablet/mobile layouts with no overlap and no horizontal overflow
  - action buttons disabled when auth/server readiness/deploy preconditions are missing
- Preserve existing same-origin browser calls. Browser code must call `/api/*` only.

Testing and verification:
- Add or adjust tests for backend/deployment state/config/API behavior. Pure CSS polish is not enough.
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

Documentation and commit:
- Update docs if behavior, commands, config fields, verification status, or known caveats change.
- Update docs/HANDOFF.md and docs/13-current-setup-status.md at the end.
- Preserve unrelated user changes. Do not use destructive git commands.
- After verification, commit only files changed for this Checkpoint 5 slice with a concise commit message such as `feat: add production deploy slice`.
```

## Execution Notes For The Next Agent

- The user explicitly wants the next slice to include a better Dokploy-inspired panel, but not as a frontend-only task.
- Treat the UI as an operational surface backed by real deployment/server/auth/readiness data.
- Checkpoint 5 may perform the first real production deploy action, but keep it narrow: Dockerfile/static vertical slice only.
- Keep domains, HTTPS automation, GitHub automation, backups, rollback UI beyond metadata, and broad VPS app operations out of scope until later checkpoints.
- If the Checkpoint 5 scope needs narrowing, implement the smallest complete vertical slice that includes storage, CLI, daemon/API, same-origin Next.js API, dashboard panel, tests, docs, and commit.
