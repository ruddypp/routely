# Routely Agent Handoff

Last updated: 2026-06-18

This file preserves the current implementation context so another agent can continue without relying on chat history.

## Project Intent

Routely is an open source, self-hosted app orchestrator for solo developers.

Core direction:

- 9Router-like local experience: run `routely` and all registered local apps/services start.
- Dokploy-like VPS experience: use one VPS as a self-hosted control plane for deploys, domains, HTTPS, logs, metrics, databases, and backups.
- Main differentiator: local-to-production workflow using the same app registry and dashboard mental model.

Reference products future agents should inspect before major product/backend/frontend work:

- 9Router repository: `https://github.com/decolua/9router`
- 9Router Docker/runtime docs: `https://github.com/decolua/9router/blob/master/DOCKER.md`
- Dokploy repository: `https://github.com/Dokploy/dokploy`
- Dokploy product site: `https://dokploy.com/`
- Dokploy docs: `https://docs.dokploy.com/`
- Dokploy Going Production guide: `https://docs.dokploy.com/docs/core/applications/going-production`

Use these as product references, not templates to clone. 9Router should inform the local-first one-command runner and fast dashboard control loop. Dokploy should inform the VPS production surface: dense panels, deployment history, domains, HTTPS/proxy, logs, resource status, readable inspector panels, and safe operational controls. Routely's product identity remains the bridge between local development and single-server production using one registry and one dashboard mental model.

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

For production/dashboard work, also read the current 9Router and Dokploy repositories/docs listed above before planning implementation. The implementation should be comprehensive across backend, daemon/API, CLI where useful, persistence, tests, docs, and frontend. Frontend polish should make the panel more Dokploy-like, readable, and comfortable, but it must be backed by real daemon/API/storage data rather than mock-only UI.

For Next.js changes, follow `AGENTS.md`: read the relevant guide in `node_modules/next/dist/docs/` before editing Next.js code.

## Recent Commits

Recent history at handoff time:

```text
58b75b7 feat: add domain proxy slice
010900c feat: add production deploy slice
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

Checkpoint 6 is now implemented as the proxy, domains, and HTTPS vertical slice:

- `packages/proxy` now provides hostname validation, wildcard DNS instructions, mocked-testable DNS A-record verification, route naming, Traefik-compatible dynamic config generation, HTTPS redirect/secure header middleware config, and Docker label helpers.
- SQLite migrations now create `domains` and `proxy_routes` tables.
- DB helpers list/create/delete/update domain records and persist materialized proxy routes with generated target/config metadata.
- The daemon exposes domain/proxy endpoints:
  - `GET /domains`
  - `POST /domains/root`
  - `POST /domains`
  - `GET /apps/:id/domains`
  - `POST /apps/:id/domains`
  - `POST /domains/:hostname/verify`
  - `DELETE /domains/:hostname`
  - `GET /proxy/routes`
  - `GET /proxy/config`
- Existing production auth enforcement protects the new private domain/proxy endpoints in production mode.
- Domain add rejects internal/database apps and duplicate/invalid hostnames.
- DNS verification compares A records to `ROUTELY_SERVER_PUBLIC_IP` or `server.public_ip` from settings and stores actionable status/messages.
- Successful Dockerfile deployments now refresh materialized proxy routes for that app.
- Routes target the latest successful deployment host port; if there is no successful deployment, the domain remains pending/verified without a misleading live route.
- TLS state is conservative: verified routes move to `issuing` for Traefik/ACME handoff, but Routely does not claim a certificate is active without future certificate observation.
- CLI commands added:
  - `routely domain root <domain>`
  - `routely domain add <app> <hostname>`
  - `routely domain verify <hostname>`
  - `routely domain ls`
- Next.js same-origin API routes now proxy `/api/domains`, `/api/domains/root`, `/api/domains/:hostname/verify`, `/api/domains/:hostname`, and `/api/proxy/routes`.
- The production dashboard panel now shows real domain/DNS/proxy/TLS state, root-domain DNS setup, app hostname add, DNS verify/remove controls, proxy target URLs, and inert placeholders for GitHub/backups/metrics/rollback.
- Browser code still calls same-origin `/api/*` only.
- GitHub automation, backups, static deploys, production database templates, full rollback, metrics collection, notifications, and broad VPS operations remain deferred.

Checkpoint 6 verification performed:

- `npm run lint` passed.
- `npm run test` passed: CLI 8 files / 25 tests, web 6 files / 13 tests.
- `npm run build --workspace apps/cli` passed.
- `npm run test --workspace apps/web` passed.
- `npx tsc -p apps/web/tsconfig.json --noEmit` passed.
- `node --check apps/daemon/src/server.js` passed.
- `node -e "import('@routely/proxy').then((m)=>console.log(m.routelyProxyVersion))"` passed.
- `npm run build --workspace apps/web` and the broad workspace build were attempted; the tool again returned only `Finished TypeScript...` and no final exit marker, while `.next` artifacts existed and no build process remained. This matches the known build-capture caveat from prior checkpoints.

Checkpoint 7 is now implemented as the GitHub integration and auto-deploy slice:

- `packages/github` now provides GitHub App configured-state detection, webhook secret lookup, SHA-256 HMAC signature generation/validation, push event filtering, and repo/branch auto-deploy matching helpers without exposing secrets in public DTOs.
- SQLite migrations now create `github_installations`, `github_repositories`, and `github_webhook_deliveries` tables.
- DB helpers persist GitHub installation metadata, installed/registered repositories, app-to-repo source metadata, webhook delivery deduplication state, and recent webhook delivery status.
- App `source` metadata now preserves GitHub auto-deploy settings under `source.auto_deploy` while keeping `routely.yml` exportable.
- The daemon exposes authenticated GitHub management endpoints:
  - `GET /github/status`
  - `GET /github/installations`
  - `POST /github/installations`
  - `GET /github/repos`
  - `POST /github/repos`
  - `GET /apps/:id/github`
  - `POST /apps/:id/github`
  - `GET /github/deliveries`
- The daemon exposes public `POST /github/webhook`, which authenticates with `X-Hub-Signature-256`, deduplicates `X-GitHub-Delivery`, ignores unsupported events, and queues the existing Dockerfile deployment path for connected app repo/branch push events.
- Duplicate webhook deliveries return a duplicate response and do not queue a second deployment.
- Invalid webhook signatures are rejected and recorded as rejected deliveries when a delivery ID is present.
- Manual Dockerfile deploy remains usable even when GitHub is unconfigured.
- CLI commands added:
  - `routely github status`
  - `routely github installation add <installation-id> --account <login>`
  - `routely github repo add <owner/repo> [--branch <branch>] [--installation-id <id>]`
  - `routely github connect <app> <owner/repo> [--branch <branch>] [--auto-deploy false]`
- Next.js same-origin API routes now proxy GitHub status/installations/repos/deliveries/app-connection endpoints under `/api/*`; `/api/github/webhook` forwards the raw signed body and GitHub headers to the daemon.
- The production dashboard now includes a GitHub repository section backed by daemon/API/storage data: configured/unconfigured state, webhook/key readiness, repo/branch app connection, auto-deploy toggle, repository rows, and recent webhook deliveries.
- The app inspector now has Overview, Deployments, Domains, Proxy, GitHub, Logs, and Config tabs backed by real app/deployment/domain/GitHub data.
- Full GitHub App OAuth install callback, live GitHub API repository/branch fetching, commit status updates, backups, notifications, production database templates, full rollback, metrics collection, and broad VPS operations remain deferred.

Checkpoint 7 verification performed:

- `npm run lint` passed.
- `npm run test --workspace apps/cli` passed: 9 files / 29 tests.
- `npm run build --workspace apps/cli` passed.
- `npm run test --workspace apps/web` passed: 7 files / 17 tests.
- `npx tsc --noEmit --project apps/web/tsconfig.json` passed.
- `node --check apps/daemon/src/server.js` passed.
- `npm run build --workspace apps/web` was attempted and failed with only the Turbopack summary `Turbopack build failed with 2 errors` plus npm lifecycle lines in the captured log. No actionable diagnostics were emitted, while lint and TypeScript passed. Treat this as the existing web-build reporting caveat unless a future run produces concrete diagnostics.

Recommended next step after Checkpoint 7 verification and commit:

```text
Move to Checkpoint 8: Environment, Secrets, and App Settings.
```

Do not start backups, production database templates, full rollback, metrics collection, notifications, or broader VPS operations before their checkpoints. Preserve existing manual Dockerfile deploy, domain/proxy/HTTPS, same-origin API proxying, and GitHub webhook behavior.

## Current Progress Snapshot For Next Agent

Last completed commit:

```text
pending commit: feat: add github auto deploy slice
```

Current state:

- Checkpoint 0 is complete.
- Checkpoint 1 local runner is complete.
- Checkpoint 2 dashboard local lifecycle controls are implemented.
- Checkpoint 2.5 frontend product shell is implemented and polished.
- Checkpoint 3 config, presets, and Compose services is implemented.
- Checkpoint 4 production server foundation is implemented.
- Checkpoint 5 production deploy vertical slice is implemented.
- Checkpoint 6 proxy, domains, and HTTPS is implemented.
- Checkpoint 7 GitHub integration and auto deploy is implemented.
- Browser calls remain same-origin under `/api/*`.
- The shell currently has desktop sidebar navigation, mobile bottom navigation, workspace/status header, local app/service separation, dense resource rows, app/service inspector, recent logs, and add/edit registry forms.
- The latest frontend pass improved row rhythm, inspector/log hierarchy, form validation/focus/disabled states, loading/empty states, responsive action wrapping, and the server foundation readiness panel.
- Checkpoint 3 added richer config fields, preset detection, Compose-backed database services, `routely db add`, local Compose driver behavior, SQLite persistence for expanded registry fields, daemon lifecycle support for Compose resources, and dashboard visibility/editing for local services/databases.
- Checkpoint 5 added deployment history/log tables, Dockerfile driver helpers, daemon deployment endpoints, `routely deploy <app> [--watch]`, same-origin Next.js deployment routes, and a production deploy dashboard panel backed by real deployment state.
- Checkpoint 6 added domain/proxy tables, Traefik-compatible proxy helpers, daemon domain/proxy endpoints, CLI domain commands, same-origin Next.js domain/proxy routes, and a dashboard domain/proxy/HTTPS panel backed by daemon/API/storage state.
- Checkpoint 7 added GitHub tables/helpers, signed webhook ingestion/deduplication, repo/branch source metadata, push-to-deploy integration with the existing Dockerfile deployment path, CLI GitHub commands, same-origin Next.js GitHub routes, and dashboard GitHub/repository/delivery panels backed by daemon/API/storage state.
- Known web build caveat remains: `npm run build --workspace apps/web` may return incomplete Turbopack output; during Checkpoint 7 it emitted only a two-error summary without diagnostics, while lint and TypeScript passed.

Next execution direction:

- Start Checkpoint 8 from `docs/14-implementation-plan.md` only after Checkpoint 7 is committed.
- Reuse existing app/deploy/domain/GitHub metadata and preserve signed webhook push-to-deploy behavior.
- Keep backups, notifications, production database templates, full rollback, metrics collection, and broader VPS operations deferred until their checkpoints.

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

Copy `docs/NEXT_AGENT_PROMPT.md` into the next agent. That file is now the canonical next prompt and targets Checkpoint 8: Environment, Secrets, and App Settings.

The next checkpoint should add env/secret storage, redaction, CLI/API/dashboard settings, and restart/redeploy-needed state while preserving the completed deploy/domain/GitHub behavior.

Do not use older embedded checkpoint prompts from previous handoffs. Checkpoint 0 through Checkpoint 7 are complete; the next implementation should start at Checkpoint 8 unless the user asks for a repair/audit.

## Immediate Next Checklist

- [ ] Check `git status --short`.
- [ ] Read `AGENTS.md`, this handoff, `docs/14-implementation-plan.md`, `docs/13-current-setup-status.md`, `DESIGN.md`, and relevant feature/spec docs.
- [ ] Read relevant Next.js docs from `node_modules/next/dist/docs/` before editing `apps/web`.
- [ ] Copy and follow `docs/NEXT_AGENT_PROMPT.md`.
- [ ] Inspect CLI, daemon, core config, DB, drivers, proxy package, presets, and current dashboard/API implementation.
- [ ] Implement Checkpoint 8 as a comprehensive backend/CLI/API/frontend slice, not a frontend-only redesign.
- [ ] Reuse existing app/deploy/domain/GitHub metadata and avoid leaking secret values in config, logs, or UI.
- [ ] Keep backups, notifications, production database templates, full rollback, metrics collection, and broad VPS operations deferred.
- [ ] Add/adjust focused tests for changed backend/domain/proxy/API/CLI behavior.
- [ ] Run lint, touched workspace tests/builds, web TypeScript when web is touched, and browser smoke/responsive checks when frontend UI is changed.
- [ ] Attempt/document the known web build caveat.
- [ ] Update docs for behavior and verification changes.
- [ ] Commit only this Checkpoint 8 slice.
