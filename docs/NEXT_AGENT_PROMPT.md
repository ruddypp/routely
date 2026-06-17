# Next Agent Prompt

Last updated: 2026-06-18  
Latest completed commit: `64d20ab feat: add local services config`

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
- Latest completed commit: 64d20ab `feat: add local services config`.
- Browser code must keep using same-origin `/api/*`; do not call the daemon directly from browser code.
- Local daemon should bind to `127.0.0.1` in local mode.
- `routely.yml` remains desired portable config; SQLite stores runtime state/history.
- Production/VPS behavior is not implemented yet. Do not implement deploy pipelines, domains, HTTPS, GitHub automation, backups, or production app actions before their checkpoints.

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

Your next task:
Implement Checkpoint 4 from docs/14-implementation-plan.md comprehensively: Production Server Foundation, while also enhancing the dashboard/panel design to feel more Dokploy-inspired operationally.

This must be a full product/backend/frontend slice. Do not only polish CSS. Build real foundation behavior, data model, CLI/API surface, server checks, docs, and tests.

Required reading before coding:
1. AGENTS.md
2. docs/HANDOFF.md
3. docs/14-implementation-plan.md, especially Checkpoint 4
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

Checkpoint 4 backend/product goals:
- Implement `routely server init` for one-server production foundation. It should prepare local Routely production state/config without deploying user apps yet.
- Implement `routely server doctor` for production readiness checks:
  - Docker availability
  - Docker Compose availability where relevant
  - Node/npm availability if needed for the current install mode
  - required ports such as 80, 443, daemon/dashboard port
  - disk/memory basics where practical
  - production data directory readiness
  - mode/auth readiness status
- Add production mode config/state in a conservative way:
  - local mode remains no-auth and frictionless
  - production mode requires an admin token/session foundation before infrastructure actions are exposed
  - no public production actions should be reachable unauthenticated
- Add a first-run admin token or equivalent local production auth foundation. Keep it simple and documented; do not overbuild full user management.
- Add or prepare SQLite tables/settings for production server foundation where needed, without jumping ahead to deployments/domains/backups.
- Add daemon/API endpoints only where needed for server status/doctor/auth foundation/dashboard display.
- Add matching same-origin Next.js route handlers for browser access. Browser code must not call the daemon directly.
- Keep production deploys, domains, HTTPS automation, GitHub automation, backups, and real VPS app operations deferred.

Dokploy-inspired frontend/panel goals:
- Enhance the dashboard panel so it feels closer to Dokploy’s operational control plane while preserving Routely’s local-first identity and DESIGN.md.
- Do not create a landing page. The first screen must remain a usable product control surface.
- Add a stronger production foundation panel/section, but keep unsafe actions disabled/inert until backend support exists.
- Make the app feel like it has clear operational zones:
  - Local resources: apps, services, databases, logs, dependencies.
  - Server foundation: server mode, doctor checks, Docker/ports/data-dir/auth readiness.
  - Future production: deployments/domains/backups/GitHub shown as disabled placeholders only.
- Improve panel quality:
  - better right-side inspector panels
  - denser status cards/rows for server checks
  - clearer resource/service/database cards or rows
  - config and command metadata grouped cleanly
  - health/auth/server readiness badges
  - mobile and desktop responsive layouts with no overlap
- Keep the visual system aligned with DESIGN.md: near-black surfaces, compact typography, functional green accent, pill/circle controls, heavy dark elevation, no generic SaaS landing page.
- Avoid a frontend-only pass. Every new panel should be backed by real data from CLI/daemon/API/storage where practical.

Testing and verification:
- Add or adjust tests for backend/server checks/config/API behavior. Pure CSS polish is not enough.
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
- After verification, commit only files changed for this Checkpoint 4 slice with a concise commit message.
```

## Execution Notes For The Next Agent

- The user explicitly wants the next slice to include a better Dokploy-inspired panel, but not as a frontend-only task.
- Treat the UI as an operational surface backed by real server/doctor/auth/readiness data.
- Keep production actions safe: showing readiness is acceptable; performing real deployments/domains/HTTPS/GitHub/backups is not part of Checkpoint 4.
- If the current Checkpoint 4 scope needs a narrower first vertical slice, implement the smallest complete production foundation slice that includes CLI, daemon/API, storage/config, dashboard panel, tests, docs, and commit.
