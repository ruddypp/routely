# Routely Agent Handoff

Last updated: 2026-06-18

This file preserves the current implementation context so another agent can continue without relying on chat history.

## Project Intent

Routely is an open source, self-hosted app orchestrator for solo developers.

Core direction:

- 9Router-like local experience: run `routely` and all registered local apps/services start.
- Dokploy-like VPS experience: use one VPS as a self-hosted control plane for deploys, domains, HTTPS, logs, metrics, databases, and backups.
- Main differentiator: local-to-production workflow using the same app registry and dashboard mental model.

## Read First

Before implementing, read:

1. `AGENTS.md`
2. `docs/HANDOFF.md`
3. `docs/14-implementation-plan.md`
4. `docs/13-current-setup-status.md`
5. `docs/05-cli-spec.md`
6. `docs/06-api-spec.md`
7. `docs/07-config-spec.md`
8. `docs/feature-specs/local-runner.md`
9. `docs/feature-specs/dashboard.md`
10. `DESIGN.md`

For Next.js changes, follow `AGENTS.md`: read the relevant guide in `node_modules/next/dist/docs/` before editing Next.js code.

## Recent Commits

Recent history at handoff time:

```text
965695d feat: add production server foundation
64d20ab feat: add local services config
d868b09 feat: add frontend product shell
0daf3e3 feat: add dashboard local controls
b5f62f0 docs: update checkpoint handoff
8b296fb feat: finish local runner checkpoint
51005c1 feat: implement Routely dashboard with Spotify-inspired theme and API integration
8c48766 feat: add local runner lifecycle commands
bde6da9 feat: stabilize workspace root resolution
0d3dfd8 docs: add implementation checkpoint plan
```

Treat `docs/14-implementation-plan.md` as the canonical execution backlog unless a newer document explicitly replaces it.

## Completed Progress

### Documentation Baseline

Completed in `0d3dfd8`:

- Added `docs/14-implementation-plan.md` as the end-to-end checkpoint plan.
- Added auto-commit rules to `AGENTS.md`.
- Linked the implementation plan from `docs/README.md`.

Important workflow rule:

- After finishing a feature/checkpoint and passing verification, commit only files relevant to that feature/checkpoint.
- Preserve unrelated user changes.

### Checkpoint 0: Stabilize Foundations

Completed in `bde6da9`:

- Split CLI path handling into install root and workspace root.
- Added `apps/cli/src/paths.ts` and tests.
- `routely` uses the current working directory as workspace by default.
- `ROUTELY_WORKSPACE_ROOT` can override active workspace.
- `ROUTELY_REPO_ROOT` remains the Routely install/dev root override.
- Daemon reads workspace config/state from `ROUTELY_WORKSPACE_ROOT`.
- Dashboard server-side daemon URL uses `ROUTELY_DAEMON_URL`.
- Added `packages/core/src/config.js` for `routely.yml` loading.
- Added config sync helpers in `packages/db`.
- Updated README and setup status docs.

Verification was performed with CLI tests, CLI build, lint, temp workspace smoke tests, and daemon `/health` smoke test.

### Checkpoint 1: Local Runner v1, First Slice

Completed in `8c48766`:

- Added `routely down`.
- Added `routely logs [app] [--follow]`.
- Added `routely restart [app]`.
- Added `routely doctor`.
- Added app log persistence under `.routely/logs/<app>.log`.
- Added port conflict detection before `routely up`.
- Added `apps/cli/src/ports.ts` and tests.
- Added DB helper for running runtime instances.
- Updated command driver typing for richer stdio options.
- Updated README and setup status docs.

Verification was performed with CLI tests, CLI build, lint, local runner smoke tests, and port conflict tests on port `4173`.

### Checkpoint 1: Local Runner v1, Completion

Completed in `8b296fb`:

- Added `depends_on` support to config normalization, DTO/type declarations, and SQLite storage.
- Added `apps/cli/src/dependencies.ts` for dependency ordering with cycle detection.
- `routely up` starts enabled command apps in dependency order and rejects dependency cycles before starting anything.
- Added shared `reconcileStaleRuntimeInstances` DB helper.
- CLI commands reconcile stale runtime PIDs before status/lifecycle operations.
- Daemon boot reconciles stale runtime PIDs before serving app state to dashboard/API consumers.
- Hardened `routely down` and `routely restart` for detached managed processes: SIGTERM process group, wait briefly, then SIGKILL if still alive.
- Added tests for dependency ordering/cycles and stale PID reconciliation.
- Updated README and `docs/13-current-setup-status.md`.

Verification performed:

- `npm run lint` passed.
- `npm run build --workspace apps/cli` passed.
- `npm run test --workspace apps/cli` passed: 4 files, 12 tests.
- Temp workspace smoke test passed for `init`, `add`, `sync`, `ps`, `up`, Ctrl+C shutdown, `restart hello`, `logs hello`, `down`, and final `ps`.
- Final process check found no leftover Routely daemon/web/example processes.

Verification caveat:

- `npm run build --workspaces --if-present` and `npm run build --workspace apps/web` were attempted, but this tool only returned the Next.js progress line (`Finished TypeScript...`) and no final exit marker even though no build process remained afterward. Do not treat the broad/web build as a confirmed pass from this handoff.

## Current Checkpoint Status

Checkpoint 0 is complete.

Checkpoint 1 is complete for the documented remaining scope.

Checkpoint 2 has started. Implemented and committed in `0daf3e3`:

- Daemon local lifecycle endpoints:
  - `POST /apps/:id/start`
  - `POST /apps/:id/stop`
  - `POST /apps/:id/restart`
  - `GET /apps/:id/logs`
- Next.js same-origin proxy route for app actions at `/api/apps/:id/:action`.
- Dashboard app table controls for start, stop, restart, open local URL, manual refresh, and recent logs.
- Focused route-handler tests for happy-path start proxying and daemon-unreachable log access.

Additional Checkpoint 2 / 2.5 work implemented and committed in `d868b09`:

- Added daemon `PATCH /apps/:id` support for editing app registry entries by id.
- Added same-origin Next.js `PATCH /api/apps/:id` proxying.
- Reworked the browser UI into a dense local-first product shell with desktop sidebar, mobile bottom navigation, workspace/status header, local app control rows, app inspector, recent logs, and add/edit registry forms.
- Add/edit forms cover the current app registry schema: name, type, preset, driver, path, command, port, enabled, and dependencies.
- Future production sections are represented only as inert navigation placeholders; no production/VPS actions have been implemented.
- Added focused route-handler tests for app create/edit proxying and daemon-unreachable edit failures.

Additional Checkpoint 2.5 frontend design enhancement work completed after `d868b09`:

- Refined the existing local-first product shell without adding production/VPS behavior.
- Tightened app row rhythm across desktop, tablet, and mobile, including a safer desktop two-line metadata/action layout.
- Improved inspector/log contrast, panel hierarchy, loading and empty states, shared action controls, focus states, disabled states, and add/edit form field affordances.
- Kept browser calls same-origin under `/api/*`; no direct daemon calls were added.

Verification for the current Checkpoint 2 / 2.5 work:

- `npm run lint` passed.
- `npm run test --workspace apps/web` passed: 3 files, 5 tests.
- `npx tsc --noEmit --project apps/web/tsconfig.json` passed.
- `node --check apps/daemon/src/server.js` passed.
- `npm run build --workspace apps/cli` passed.
- `npm run test --workspace apps/cli` passed: 4 files, 12 tests.
- Browser/API smoke passed with daemon and web dev server running locally: `/api/apps` returned `hello-command`, `/api/apps/3/logs` returned an empty log payload, and desktop/tablet/mobile headless Chrome screenshots showed the responsive shell without obvious overlap.
- Current design enhancement verification passed with `npm run lint`, `npm run test --workspace apps/web`, `npx tsc --noEmit --project apps/web/tsconfig.json`, same-origin `/api/apps` smoke through the web server, and desktop/tablet/mobile headless Chrome screenshots. An initial desktop screenshot exposed app-row action overlap; this was fixed and rechecked with an updated desktop screenshot.

Web build caveat:

- `npm run build --workspace apps/web` was attempted twice, including once with an explicit exit marker. The tool returned only `Finished TypeScript in ...` and no final exit marker, and no `next build`/Turbopack process remained afterward. This matches the known pre-existing build-reporting failure from the handoff rather than a new checkpoint-specific error.

Recommended next step before moving on:

- Move to Checkpoint 3 only if the frontend remains stable and production/VPS work is still explicitly deferred.

Checkpoint 2.5 has been added to `docs/14-implementation-plan.md` as the explicit frontend polish checkpoint:

- Name: `9Router-Inspired Frontend Product Shell`.
- Scope: the whole Routely browser app, not only the dashboard home/table.
- Direction: make the UI/UX feel 9Router-inspired for local app runner workflows while respecting `DESIGN.md` for visual taste.
- `DESIGN.md` currently defines near-black Spotify-inspired taste: compact/dense app UI, functional green accent, pill/circular controls, heavy dark elevation, responsive sidebar/mobile navigation, and no generic SaaS landing-page treatment.
- Backend/product concept remains Dokploy-like for VPS deployment, domains, HTTPS, logs, metrics, databases, and backups, but production controls must wait for their checkpoints.

Checkpoint 3 is now implemented as a comprehensive local resource slice:

- Config normalization and SQLite persistence cover install/dev/build/start commands, env, dependencies, healthchecks, domains, source metadata, Compose metadata, internal flags, images, and volumes.
- Preset detection/defaults exist for Next.js, Vite/React, Laravel, Express, NestJS, Django, FastAPI, Go, static HTML/CSS, and PHP custom projects.
- `routely add <path>` detects presets where possible and writes editable generated config back to `routely.yml`.
- `routely db add <postgres|mysql|mariadb|redis|mongodb>` registers Compose-backed local database services under `services:`.
- The Compose driver generates local Compose files under `.routely/compose` and starts/stops services with Docker Compose.
- Daemon lifecycle endpoints now support command and Compose resources; browser mutations remain behind same-origin `/api/*` route handlers.
- The dashboard distinguishes apps from services/databases and exposes richer config/service metadata in rows, inspector, and add/edit forms.

Checkpoint 4 is now implemented as the production server foundation slice:

- `routely server init` prepares production mode state, creates/checks the production data directory, generates a one-time admin token, stores only a salted hash in SQLite settings, and runs server doctor checks.
- `routely server doctor` checks Docker, Docker Compose, Node/npm, disk, memory, data directory readiness, and required production ports `80`, `443`, and the dashboard port.
- SQLite settings now persist server mode, production data directory, admin token metadata, and the latest doctor result without adding deploy/domain/backup tables early.
- Daemon endpoints now expose server readiness/auth foundation at `/server/status`, `/auth/status`, and `/server/doctor`; production mode requires an admin bearer token for private app/registry/lifecycle API paths.
- Next.js continues to proxy browser access through same-origin `/api/*`; `/api/server/status` backs the dashboard panel and server-side proxy calls can forward `ROUTELY_ADMIN_TOKEN` without exposing it to browser code.
- The dashboard now has clearer Dokploy-inspired operational zones: local resources, server foundation readiness, and disabled future production placeholders.
- Production deploys, domains, HTTPS automation, GitHub automation, backups, and real VPS app actions remain deferred.

Checkpoint 5 is now implemented as a Dockerfile-first production deploy vertical slice:

- SQLite migrations now create `deployments`, `deployment_logs`, `app_sources`, and `healthchecks` tables.
- Shared DB helpers persist deployment lifecycle state and incremental log rows for `queued`, `preparing`, `building`, `starting`, `healthchecking`, `succeeded`, and `failed` phases.
- `packages/drivers` includes conservative Dockerfile helpers for image tags, container names, `docker build`, `docker run`, container removal, and container running inspection.
- The daemon exposes deployment endpoints:
  - `GET /deployments`
  - `GET /apps/:id/deployments`
  - `POST /apps/:id/deployments`
  - `GET /deployments/:id`
  - `GET /deployments/:id/logs`
- `POST /apps/:id/deployments` runs as a background Dockerfile deployment job and is protected by the existing production admin-token auth hook.
- Dockerfile deploys validate the app is enabled, uses `driver: dockerfile`, has a source path, has a `Dockerfile`, and can reach Docker before build.
- Deployment logs capture Docker stdout/stderr incrementally and are inspectable from CLI and dashboard.
- Successful deploys run containers on temporary host ports in the `32000+` range and store image/container/port metadata for later rollback work.
- Failed deploys mark the deployment failed, keep last successful deployment metadata intact, and remove the failed new container when practical.
- `routely deploy <app>` and `routely deploy <app> --watch` call the daemon and pass `ROUTELY_ADMIN_TOKEN` when configured.
- Next.js same-origin route handlers proxy deployment list/trigger/detail/log endpoints under `/api/*`.
- The dashboard now has a Dokploy-inspired production deploy panel with server readiness cards, Dockerfile deploy actions, recent deployment phase rows, deployment logs, temporary URLs, and locked Domains/HTTPS/GitHub/Backups placeholders.
- The right inspector has Overview, Deployments, Logs, and Config tabs backed by app/deployment/log API data.
- Verification included a temporary local Dockerfile app smoke: `routely deploy web --watch` built an image, started a container on `127.0.0.1:32002`, passed HTTP healthcheck, streamed logs, and the test container/images were removed afterward.
- Domains, HTTPS automation, GitHub automation, backups, static deploys, rollback UI/actions, and broad VPS operations remain deferred.

Recommended next step after Checkpoint 5 verification and commit:

```text
Move to Checkpoint 6: Proxy, Domains, and HTTPS.
```

Do not start GitHub automation, backups, or broader VPS operations before their checkpoints. Domains/HTTPS are the next checkpoint; until then production navigation remains locked except for server readiness and Dockerfile deployment status/actions.

## Current Progress Snapshot For Next Agent

Last completed commit:

```text
pending commit: feat: add production deploy slice
```

Current state:

- Checkpoint 0 is complete.
- Checkpoint 1 local runner is complete.
- Checkpoint 2 dashboard local lifecycle controls are implemented.
- Checkpoint 2.5 frontend product shell is implemented and polished.
- Checkpoint 3 config, presets, and Compose services is implemented.
- Checkpoint 4 production server foundation is implemented.
- Checkpoint 5 production deploy vertical slice is implemented.
- Browser calls remain same-origin under `/api/*`.
- The shell currently has desktop sidebar navigation, mobile bottom navigation, workspace/status header, local app/service separation, dense resource rows, app/service inspector, recent logs, and add/edit registry forms.
- The latest frontend pass improved row rhythm, inspector/log hierarchy, form validation/focus/disabled states, loading/empty states, responsive action wrapping, and the server foundation readiness panel.
- Checkpoint 3 added richer config fields, preset detection, Compose-backed database services, `routely db add`, local Compose driver behavior, SQLite persistence for expanded registry fields, daemon lifecycle support for Compose resources, and dashboard visibility/editing for local services/databases.
- Checkpoint 5 added deployment history/log tables, Dockerfile driver helpers, daemon deployment endpoints, `routely deploy <app> [--watch]`, same-origin Next.js deployment routes, and a production deploy dashboard panel backed by real deployment state.
- Known web build caveat remains: `npm run build --workspace apps/web` returns only `Finished TypeScript...` with no final exit marker and no remaining build process.

Next execution direction:

- Start Checkpoint 6 from `docs/14-implementation-plan.md` only after Checkpoint 5 is committed.
- Reuse the deployment metadata/logging primitives from Checkpoint 5.
- Keep GitHub automation, backups, and broader VPS app operations deferred until their checkpoints.

## Current Known Environment

Previously verified local versions:

```text
Node.js:        v24.12.0
npm:            11.6.2
Git:            2.54.0
Docker:         29.5.3
Docker Compose: v5.1.4
```

Default ports:

```text
3030 dashboard
9977 daemon
4173 hello-command example
20128 reserved for 9Router, do not use
```

## Important Notes

- Always inspect `git status --short` before editing.
- Do not use destructive git commands.
- Stage only files related to the current checkpoint.
- Do not commit `apps/cli/node_modules/` if it appears.
- Browser code should call same-origin `/api/*` routes, not the daemon directly.
- Dashboard lifecycle controls currently call `/api/apps/:id/start`, `/api/apps/:id/stop`, `/api/apps/:id/restart`, and `/api/apps/:id/logs`; these are handled by a single Next dynamic action route and proxied to the daemon.
- Dashboard app registry forms call same-origin `/api/apps` and `/api/apps/:id`; those route handlers proxy create/edit mutations to the daemon.
- Frontend visual/product direction is now explicit: the whole UI should feel 9Router-inspired while following `DESIGN.md`. Do not build a generic admin dashboard or SaaS landing page.
- For frontend work, read `DESIGN.md` before editing UI and keep the first screen as the actual app control surface.
- Local daemon should bind to `127.0.0.1`.
- Do not start production/VPS work until local runner and dashboard lifecycle primitives are reliable.

## Suggested Verification Commands

Use as appropriate:

```bash
npm run test --workspace apps/cli
npm run build --workspace apps/cli
npm run test --workspace apps/web
npm run lint
```

For Checkpoint 2, also verify the web/dashboard path after changes. Because Next.js APIs may differ from training data, read the relevant guide in `node_modules/next/dist/docs/` before editing `apps/web`.

Suggested smoke test shape:

```bash
tmp=$(mktemp -d /tmp/routely-smoke-XXXXXX)
cd "$tmp"
node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js init
node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js add /home/ruddypp/Documents/work/routely/examples/hello-command --name hello --command "npm run dev" --port 4173
node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js doctor
timeout 12s node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js up || test "$?" = "124"
node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js logs hello
node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js down
```

## Prompt For Next Agent

Copy `docs/NEXT_AGENT_PROMPT.md` into the next agent. That file is the canonical next prompt and targets Checkpoint 4 with a comprehensive backend/CLI/API/storage/dashboard slice plus a Dokploy-inspired panel enhancement.

The older Checkpoint 3 prompt below is kept only as historical reference. Do not use it for the next run unless intentionally auditing or repairing Checkpoint 3.

```text
You are working in /home/ruddypp/Documents/work/routely.

Read AGENTS.md, docs/HANDOFF.md, docs/14-implementation-plan.md, docs/13-current-setup-status.md, DESIGN.md, and the relevant feature/spec docs before editing. Follow AGENTS.md strictly, including the Next.js docs rule and auto-commit rule.

Project intent:
Routely is a 9Router-inspired local app runner plus Dokploy-inspired VPS deployment platform. The differentiator is a local-to-production workflow for solo developers: local apps/services first, then one-server production operations later.

Current progress:
- Checkpoint 0 is complete and committed.
- Checkpoint 1 local runner is complete and committed.
- Checkpoint 2 dashboard local lifecycle controls are implemented and committed.
- Checkpoint 2.5 frontend product shell is implemented and polished.
- Latest completed commit: 14b5c0f `feat: polish frontend product shell`.
- The browser UI currently has desktop sidebar navigation, mobile bottom navigation, workspace/status header, dense local app rows, app inspector, recent logs, and add/edit app registry forms.
- Browser code must keep using same-origin `/api/*`; do not call the daemon directly from browser code.
- Daemon lifecycle/log endpoints are already present. Do not redo them unless fixing a bug.
- Future production sections are inert navigation placeholders only. Do not start production/VPS deployment work yet.

Your next task:
Implement Checkpoint 3 from docs/14-implementation-plan.md comprehensively: Config, Presets, and Compose Services. This should be a real product/backend/frontend slice, not only UI polish.

Execution expectations:
1. Read AGENTS.md and obey it.
2. Read the relevant docs before coding:
   - docs/14-implementation-plan.md, especially Checkpoint 3
   - docs/05-cli-spec.md
   - docs/06-api-spec.md
   - docs/07-config-spec.md
   - docs/08-data-model.md
   - docs/feature-specs/local-runner.md
   - docs/feature-specs/dashboard.md
   - DESIGN.md
3. Before editing `apps/web`, read relevant Next.js docs in `node_modules/next/dist/docs/`. This repo uses Next.js 16.2.9 and AGENTS.md says this is not the Next.js you know.
4. Inspect the current implementation before changing it:
   - apps/cli/src/*
   - apps/daemon/src/server.js
   - packages/core/src/config.js and related types/DTOs
   - packages/db/*
   - packages/drivers/*
   - packages/presets/*
   - apps/web/src/app/dashboard-client.tsx
   - apps/web/src/app/api/*

Checkpoint 3 implementation goals:
- Expand the config model toward docs/07-config-spec.md for realistic local apps/services:
  - install
  - dev
  - build
  - start
  - env
  - depends_on
  - healthcheck
  - domains/source fields only as stored metadata where appropriate, not production behavior
- Expand `packages/presets` with useful local preset detection/defaults for common stacks such as Next.js, Vite/React, Laravel, Express, NestJS, Django, FastAPI, Go, static HTML/CSS, and PHP custom.
- Add or improve `routely add <path>` preset detection so generated config remains editable and visible.
- Implement local Compose service support for Checkpoint 3:
  - Compose driver behavior for local services.
  - Database service templates for PostgreSQL, MySQL/MariaDB, Redis, and MongoDB where practical.
  - A CLI path such as `routely db add <type>` if consistent with the existing CLI architecture.
  - Dependency ordering so Compose/database services start before dependent command apps.
- Update SQLite persistence and sync helpers as needed so the dashboard and daemon can read the expanded registry consistently.
- Add daemon/API and same-origin Next.js route-handler support only where needed for the new local services/config behavior.
- Keep all browser mutations behind `/api/*` route handlers.

Frontend/product expectations:
- Do not make a landing page. The first screen must remain the actual product control surface.
- Make the Checkpoint 3 UI feel more Dokploy-inspired operationally while preserving Routely's local-first identity and DESIGN.md:
  - clearer app/service/resource separation
  - service/database rows or cards with status, driver, port, dependencies, and command/compose metadata
  - denser inspector sections for config, commands, dependencies, service type, and logs
  - better add/edit flows for presets, compose/database services, dependencies, and config fields
  - production/VPS nav may remain visible as disabled/inert placeholders only
- Do not implement production deploys, domains, HTTPS, GitHub automation, auth, backups, server setup, or real VPS actions yet.

Testing and verification:
- Add or adjust tests for backend/config/preset/driver/API behavior. Pure CSS polish alone is not enough for this checkpoint.
- Prefer focused tests first, then smoke tests.
- Run at minimum:
  - npm run lint
  - npm run test --workspace apps/cli if CLI/core/db/drivers/presets are touched
  - npm run build --workspace apps/cli if CLI/shared runtime code is touched
  - npm run test --workspace apps/web if web/API route handlers are touched
  - npx tsc --noEmit --project apps/web/tsconfig.json if apps/web is touched
  - node --check apps/daemon/src/server.js if daemon code is touched
  - relevant package tests/builds for touched workspaces
  - browser smoke/responsive screenshots for desktop, tablet, and mobile widths if frontend UI is changed
- Attempt `npm run build --workspace apps/web`, but note the known caveat: this tool currently returns only `Finished TypeScript...` with no final exit marker and no remaining build process. Treat this as pre-existing unless your changes produce a new explicit error.

Documentation and commit:
- Update docs if behavior, commands, config fields, verification status, or known caveats change.
- Preserve unrelated user changes. Do not use destructive git commands.
- After verification, commit only files changed for this Checkpoint 3 slice with a concise commit message.
```

## Immediate Next Checklist

- [ ] Check `git status --short`.
- [ ] Read `AGENTS.md`, this handoff, `docs/14-implementation-plan.md`, `docs/13-current-setup-status.md`, `DESIGN.md`, and relevant feature/spec docs.
- [ ] Read relevant Next.js docs from `node_modules/next/dist/docs/` before editing `apps/web`.
- [ ] Inspect CLI, daemon, core config, DB, drivers, presets, and current dashboard/API implementation.
- [ ] Implement Checkpoint 3 as a comprehensive backend/CLI/API/frontend slice.
- [ ] Keep production/VPS actions deferred and inert.
- [ ] Add/adjust focused tests for changed backend/config/preset/driver/API behavior.
- [ ] Run lint, touched workspace tests/builds, web TypeScript when web is touched, and browser smoke/responsive checks when frontend UI is changed.
- [ ] Attempt/document the known web build caveat.
- [ ] Update docs for behavior and verification changes.
- [ ] Commit only this Checkpoint 3 slice.
