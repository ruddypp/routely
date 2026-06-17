# Routely End-to-End Implementation Plan

Version: 0.3  
Status: Execution checkpoint plan  
Last updated: 2026-06-17

## 1. Purpose

This document is the execution plan for building Routely end to end from the current skeleton into a usable open source product.

It is written so a future implementation agent can read this file, follow the checkpoints in order, and continue the project without relying on chat history.

Routely's intended product direction is:

```text
Local first:
  One command starts every registered local app and service.

Production second:
  The same app registry becomes a single-server VPS deployment control plane.

Automation third:
  GitHub pushes, domains, HTTPS, logs, metrics, backups, and alerts are managed from the dashboard and CLI.
```

The project is inspired by:

- 9Router's single-command local daemon/dashboard experience.
- Dokploy's self-hosted VPS app deployment and management experience.

Routely should not become a clone of either project. Its differentiator is the local-to-production workflow for solo developers.

## 2. How To Use This Plan

Execute this plan checkpoint by checkpoint.

For each checkpoint:

1. Read the linked docs and existing code before editing.
2. Implement the smallest complete slice for that checkpoint.
3. Add or update tests for the behavior changed.
4. Run the required verification commands.
5. Update documentation if behavior changed.
6. Commit the completed feature/checkpoint changes after verification passes, following `AGENTS.md` auto-commit rules.
7. Do not proceed to the next checkpoint until the exit criteria pass or the remaining gap is documented.

Every checkpoint should leave the project in a working state.

Do not treat this as a loose idea list. Treat it as the canonical implementation backlog unless a newer doc explicitly replaces it.

## 3. Source Documents

Use these docs as the product and architecture source of truth:

- `docs/01-prd.md` for product positioning and MVP scope.
- `docs/02-technical-architecture.md` for system shape.
- `docs/03-functional-specification.md` for expected behavior.
- `docs/04-user-flows.md` for local and VPS flows.
- `docs/05-cli-spec.md` for CLI commands.
- `docs/06-api-spec.md` for HTTP API shape.
- `docs/07-config-spec.md` for `routely.yml` schema.
- `docs/08-data-model.md` for SQLite schema direction.
- `docs/09-security-model.md` for auth, secrets, and trust boundaries.
- `docs/10-mvp-roadmap.md` for high-level sequence.
- `docs/11-risks-and-tradeoffs.md` for scope risks.
- `docs/13-current-setup-status.md` for current local setup notes.
- `docs/feature-specs/*` for feature-level acceptance criteria.
- `docs/adr/*` for architecture decisions.
- `DESIGN.md` for visual taste, palette, density, component geometry, and responsive design rules.

If code and docs disagree, prefer the docs for intent, but update docs if implementation needs to intentionally change the plan.

## 4. Product Guardrails

Keep these constraints throughout implementation:

- `routely` is the primary command and should feel useful immediately.
- The local runner is the first public differentiator.
- Production support is single-server-first before multi-server UX is exposed.
- Docker is the production runtime boundary.
- Presets generate editable config; they must not hide commands from the user.
- SQLite stores runtime state/history; `routely.yml` remains the portable desired config.
- Production apps should continue running even if Routely dashboard/daemon restarts.
- Databases are internal-only by default in production.
- Secrets must not be exported to config or leaked in logs.
- Dashboard browser code must call same-origin `/api/*`; it must not call the daemon directly.
- The daemon should bind to `127.0.0.1` in local mode.
- Production mode requires authentication before infrastructure actions are exposed.
- Frontend work should make the whole Routely app experience feel 9Router-inspired: local-first, dense, fast, app-runner oriented, and command/control focused. This applies to the full shell, navigation, local app controls, logs, forms, settings, and future production views, not just the dashboard home screen.
- Visual execution must still respect `DESIGN.md`: near-black surfaces, compact typography, functional green accent, pill/circle controls, dense app layout, heavy dark elevation, and responsive sidebar/bottom-nav behavior. Do not introduce a generic SaaS marketing look.

## 5. Current Baseline

Implemented foundation at the time this plan was written:

- npm workspace monorepo.
- CLI package with `routely`, `init`, `sync`, `add`, `ps`, and `up` behavior.
- Daemon HTTP server with health and basic app registry endpoints.
- Next.js dashboard that polls daemon state through same-origin route handlers.
- SQLite tables: `servers`, `apps`, `runtime_instances`, `settings`.
- Minimal command driver for local processes.
- `routely.yml` loader and normalizer.

Known gaps before alpha:

- CLI root resolution is optimized for developing Routely itself, not arbitrary user workspaces.
- Dashboard is read-only.
- No explicit `down`, `logs`, `restart`, `doctor`, or `server` commands yet.
- No port conflict detection.
- No log persistence or streaming API.
- No Compose driver implementation.
- `packages/github`, `packages/proxy`, and `packages/presets` are placeholders.
- No production auth, deploy pipeline, domain/HTTPS, metrics, or backups yet.

## 6. Target Architecture

The implementation should converge on this structure:

```text
CLI (`routely`)
  -> Workspace resolver
  -> Daemon client / local process supervisor
  -> SQLite state
  -> Runtime manager
     -> command driver
     -> compose driver
     -> dockerfile driver
     -> buildpack/static driver
  -> Proxy manager
  -> Dashboard API routes
  -> Next.js dashboard
```

Production mode adds:

```text
GitHub App / webhook
  -> deployment job
  -> build container or Docker build
  -> runtime container / Compose stack
  -> Traefik-compatible route
  -> healthcheck
  -> deployment history and logs
```

## 7. Checkpoint 0: Stabilize Foundations

Goal: make the current repository safe to build on and make the CLI behave like a real product CLI.

### Implementation

- Split root resolution into two concepts:
  - Routely install/development root.
  - User workspace root.
- Make `routely` default to the current working directory when used as a product CLI.
- Keep `ROUTELY_REPO_ROOT` only as an internal development override.
- Standardize daemon URL environment variables:
  - Use `ROUTELY_DAEMON_URL` for server-side dashboard route handlers.
  - Avoid `NEXT_PUBLIC_ROUTELY_DAEMON_URL` unless the browser truly needs it.
- Add a reusable daemon client in the CLI.
- Add consistent CLI error formatting.
- Make `routely init` safe to run repeatedly.
- Update README and `docs/13-current-setup-status.md` to match actual behavior.

### Exit Criteria

- `routely init` in a separate temp workspace creates `.routely/routely.db` and `routely.yml` there.
- `routely` in that workspace starts the daemon, dashboard, and registered apps for that workspace.
- Dashboard connects to the configured daemon port when the default port is changed.
- Existing monorepo development flow still works.

### Required Tests

- Unit test workspace root resolution.
- CLI integration test using a temporary directory.
- Manual smoke test with `examples/hello-command`.
- `npm run lint`.
- `npm run build --workspaces --if-present`.

## 8. Checkpoint 1: Local Runner v1

Goal: deliver the 9Router-like core: one command starts local apps and gives useful control.

### Implementation

- Implement `routely down`.
- Implement `routely restart <app>`.
- Implement `routely logs [app] --follow`.
- Implement `routely doctor` for local checks:
  - Node version.
  - npm availability.
  - Docker availability when Compose apps exist.
  - daemon port availability.
  - dashboard port availability.
  - app port conflicts.
- Add port conflict detection before starting apps.
- Add dependency ordering through `depends_on` from `routely.yml`.
- Persist logs per app under `.routely/logs/<app>.log`.
- Store runtime PID and status consistently.
- Reconcile stale PIDs on daemon boot.
- Add app URLs to CLI output and dashboard rows.
- Support disabled apps cleanly.

### Exit Criteria

- `routely` starts three command apps from one workspace.
- Ctrl+C stops child processes.
- `routely down` stops managed apps when the supervisor is active.
- `routely restart api` restarts only the target app.
- `routely logs api --follow` streams persisted logs.
- If a port is busy, Routely shows the app and port before starting anything.
- Dashboard reflects `running`, `stopped`, and `crashed` states within one polling interval.

### Required Tests

- Unit test port detection.
- Unit test dependency sort and cycle error.
- Unit test log path generation and secret redaction helper.
- Integration test start/stop of example apps using temporary ports.
- CLI smoke test for `init`, `add`, `sync`, `ps`, `up`, `restart`, `logs`, `down`.

## 9. Checkpoint 2: Dashboard Local Controls

Goal: make the dashboard an actual local control surface, not only a status page.

### Implementation

- Add daemon endpoints:
  - `POST /apps/:id/start`
  - `POST /apps/:id/stop`
  - `POST /apps/:id/restart`
  - `GET /apps/:id/logs`
- Add matching Next.js API route handlers.
- Add dashboard actions:
  - start
  - stop
  - restart
  - open URL
  - view logs
- Add app detail page or side panel.
- Add add/edit app form using the app registry schema.
- Add loading, disabled, error, and refresh states.
- Keep local daemon bound to `127.0.0.1`.

### Exit Criteria

- User can start, stop, and restart a local app from dashboard.
- User can view recent logs without opening terminal.
- Failed actions show actionable error messages.
- Browser only calls same-origin `/api/*` routes.
- Dashboard remains usable on mobile and desktop widths.

### Required Tests

- Route handler tests for happy path and daemon-unreachable path.
- Dashboard component tests if a React test runner is added.
- Playwright smoke test for dashboard load, app row render, and one lifecycle action.
- Manual responsive check.

## 9.5. Checkpoint 2.5: 9Router-Inspired Frontend Product Shell

Goal: make the whole Routely frontend feel like a polished 9Router-inspired local app runner while preserving Routely's own `DESIGN.md` taste and preparing the shell for Dokploy-like production workflows later.

This checkpoint exists because the frontend should not be treated as only a dashboard table. The entire browser app should feel like one cohesive local-to-production control surface: local workspaces first, production infrastructure second, automation third.

### Design Direction

- Use 9Router as the primary product-experience reference:
  - local-first app runner mental model
  - fast app switching
  - visible app/service status
  - prominent run/control actions
  - logs close to the app row/detail
  - minimal friction between terminal workflow and dashboard workflow
- Use `DESIGN.md` as the visual taste source:
  - near-black immersive background and surfaces
  - compact, dense layout rather than marketing whitespace
  - functional green accent only for active/primary controls
  - pill and circular controls where appropriate
  - heavy dark shadows/elevation
  - app-like responsive behavior with sidebar on desktop and mobile-friendly navigation
- Keep Dokploy-like backend concepts in the information architecture, but do not expose production/VPS actions before their checkpoints are implemented.
- Do not make a landing page. The first screen should be the actual product surface.

### Implementation

- Build a cohesive application shell, not only a single dashboard view:
  - desktop sidebar/navigation
  - mobile navigation pattern
  - top workspace/status area
  - main content region
  - detail/log panel region
  - empty/loading/error states that match the shell
- Refine the local apps view into a 9Router-like control surface:
  - app/service rows or tiles optimized for scanning
  - status, port, URL, driver, command, and dependency information
  - start/stop/restart/open/log controls with clear enabled/disabled states
  - selected app detail panel or route
  - recent logs panel that feels native to the shell
- Add app add/edit UI using the app registry schema:
  - name
  - type
  - preset
  - driver
  - path
  - command/dev command
  - port
  - enabled
  - depends_on where practical
  - validation and actionable errors
- Establish reusable UI primitives aligned with `DESIGN.md`:
  - app shell layout
  - sidebar/nav item
  - pill/circular button variants
  - status badge
  - app/service row or card
  - dense form controls
  - log viewer panel
  - empty/error/loading states
- Make future production sections visible only as inert navigation placeholders if helpful for information architecture; do not implement production actions yet.
- Keep all browser data mutations behind same-origin `/api/*` route handlers.
- Fix or document the existing web production build issue before marking this checkpoint complete.

### Exit Criteria

- The browser app looks and behaves like a cohesive 9Router-inspired product shell, not a generic dashboard page.
- Local app control is usable from desktop and mobile widths.
- A user can add or edit a local command app from the UI without using the terminal.
- A user can inspect an app, its command, URL, status, and recent logs from the UI.
- The shell has a clear place for future Dokploy-like production features without exposing nonfunctional production controls.
- The UI follows `DESIGN.md` for palette, density, typography, component shape, and responsive behavior.
- Browser code only calls same-origin `/api/*` routes.

### Required Tests

- Route-handler tests for add/edit behavior and daemon-unreachable failures.
- Component or integration tests for form validation if a React test setup is available.
- Playwright smoke test for:
  - app shell load
  - app list render
  - add/edit form open and validation
  - one lifecycle action
  - logs panel
- Manual responsive check at mobile, tablet, and desktop widths.
- `npm run lint`.
- `npm run test --workspace apps/web`.
- Web TypeScript check.
- Web production build when the existing build issue is resolved; otherwise document the exact blocker and confirm the failure also happens on the clean baseline.

## 10. Checkpoint 3: Config, Presets, and Compose Services

Goal: support realistic local workspaces with databases and common app stacks.

### Implementation

- Expand `packages/presets` with editable defaults for:
  - Next.js
  - Vite/React
  - Laravel
  - Express
  - NestJS
  - Django
  - FastAPI
  - Go
  - static HTML/CSS
  - PHP custom
- Add preset detection for `routely add <path>`.
- Add config fields from `docs/07-config-spec.md`:
  - `install`
  - `dev`
  - `build`
  - `start`
  - `env`
  - `depends_on`
  - `healthcheck`
  - `domains`
  - `source`
- Implement Compose driver for local services.
- Support database service templates for local Compose:
  - PostgreSQL
  - MySQL/MariaDB
  - Redis
  - MongoDB
- Add `routely db add <type>` for local service registration.
- Add safe import/export behavior between dashboard changes and `routely.yml`.
- Do not export secrets by default.

### Exit Criteria

- `routely add ./apps/web` can detect a Next.js app and suggest commands.
- `routely db add postgres` adds a Compose-backed service to config/state.
- `routely` starts database services before dependent apps.
- User can override any preset-generated command.
- Dashboard clearly distinguishes apps and services.

### Required Tests

- Unit tests for preset detection.
- Unit tests for config normalization.
- Unit tests for Compose config generation.
- Integration test with one app depending on PostgreSQL.
- Manual test with at least two real sample stacks.

## 11. Checkpoint 4: Production Server Foundation

Goal: install Routely on one VPS and prepare it to manage production apps safely.

### Implementation

- Implement `routely server init`.
- Implement `routely server doctor`.
- Add production mode config and environment detection.
- Add admin login or first-run admin token.
- Add production session/API-token authentication.
- Add Docker availability checks.
- Add required port checks for `80`, `443`, and dashboard port.
- Add persistent production data directory strategy.
- Add systemd service or Docker Compose install path for Routely itself.
- Add upgrade strategy notes, even if first implementation is manual.

### Exit Criteria

- A fresh Linux VPS can run `routely server init` and produce a reachable authenticated dashboard.
- `routely server doctor` reports Docker, disk, memory, ports, and data directory status.
- Production dashboard is not accessible without authentication.
- Local mode still works without production login friction.

### Required Tests

- Unit tests for server checks.
- Integration test in a Linux container where practical.
- Manual VPS test on a small Ubuntu server.
- Security smoke test for unauthenticated production API access.

## 12. Checkpoint 5: Production Deploy Vertical Slice

Goal: prove the Dokploy-like path with the smallest complete production deployment flow.

This checkpoint intentionally comes before the full production feature set. It should be narrow but end to end.

### Implementation

- Add deployment tables:
  - `deployments`
  - `deployment_logs`
  - `app_sources`
  - `healthchecks`
- Implement deployment lifecycle:
  - queued
  - preparing
  - building
  - starting
  - healthchecking
  - succeeded
  - failed
- Implement Dockerfile driver first.
- Implement static driver second if Dockerfile flow is stable.
- Add `routely deploy <app>`.
- Add `routely deploy <app> --watch`.
- Store deployment logs incrementally.
- Add dashboard deploy action and deploy log viewer.
- Keep previous running app live if the new deploy fails where possible.
- Add basic rollback metadata for last successful image/container.

### Exit Criteria

- A Dockerfile app deploys and runs as a container on the VPS.
- A failed build is marked failed and does not become live.
- Dashboard shows current deployment phase and logs.
- CLI `deploy --watch` streams deployment progress.
- The app can be reached through a temporary port before domain/proxy support exists.

### Required Tests

- Unit tests for deployment state transitions.
- Unit tests for Docker command builder/helpers.
- Integration test using a sample Dockerfile app.
- Manual deploy test on VPS.
- Failure test with intentionally broken Dockerfile.

## 13. Checkpoint 6: Proxy, Domains, and HTTPS

Goal: make deployed apps reachable through production domains with automatic HTTPS.

### Implementation

- Implement `packages/proxy` around a Traefik-compatible model.
- Generate labels or dynamic config for app routes.
- Add domain tables and API endpoints.
- Add CLI commands:
  - `routely domain root <domain>`
  - `routely domain add <app> <hostname>`
  - `routely domain verify <hostname>`
  - `routely domain ls`
- Verify DNS A records against server public IP.
- Support wildcard domain instructions.
- Enable HTTP to HTTPS redirect.
- Track certificate/TLS status.
- Ensure databases are not exposed through public proxy by default.

### Exit Criteria

- User can add `web.example.com` to an app.
- Routely verifies DNS before marking domain ready.
- App is reachable over HTTPS.
- Removing a domain removes the proxy route.
- Proxy survives Routely dashboard restart where possible.

### Required Tests

- Unit tests for route config generation.
- Unit tests for DNS verification with mocked resolver.
- Integration test with local Traefik if practical.
- Manual VPS test using a real domain or subdomain.

## 14. Checkpoint 7: GitHub Integration and Auto Deploy

Goal: connect private/public GitHub repositories and redeploy on push.

### Implementation

- Implement GitHub App configuration in `packages/github`.
- Add tables:
  - `github_installations`
  - `github_repositories`
- Add dashboard connect flow.
- List installed repositories and branches.
- Store repo/branch source metadata per app.
- Add webhook endpoint and signature validation.
- Deduplicate GitHub delivery IDs.
- Trigger deploy on configured branch push.
- Add GitHub deploy status updates if feasible.

### Exit Criteria

- User can connect GitHub App from dashboard.
- User can select a private repo and branch.
- Push to `main` or `master` triggers deployment.
- Invalid webhook signatures are rejected.
- Duplicate webhook delivery does not run duplicate deploys.

### Required Tests

- Unit tests for signature validation.
- Unit tests for webhook event filtering.
- Integration test with mocked GitHub API.
- Manual end-to-end test with a real test repo.

## 15. Checkpoint 8: Environment, Secrets, and App Settings

Goal: support operational settings needed for real apps.

### Implementation

- Add `app_env_vars` table.
- Add env API endpoints.
- Add CLI commands:
  - `routely env <app> list`
  - `routely env <app> set KEY=value`
  - `routely env <app> unset KEY`
- Add dashboard env editor.
- Hide secret values after creation.
- Redact known secret values from logs.
- Inject env vars into local command apps and production containers.
- Mark apps as needing restart/redeploy after env changes.

### Exit Criteria

- User can set env vars from CLI and dashboard.
- Secret values are hidden in dashboard after save.
- Logs redact configured secret values.
- Production deploy uses stored env vars.

### Required Tests

- Unit tests for secret redaction.
- Unit tests for env merge precedence.
- API tests for env CRUD.
- Manual deploy test using env vars.

## 16. Checkpoint 9: Logs, Metrics, and Health

Goal: make failures understandable without shelling into the VPS first.

### Implementation

- Add `metrics_samples` table.
- Add full `healthchecks` behavior.
- Collect app/container status.
- Collect CPU, memory, disk, and basic network metrics where available.
- Add HTTP response time healthcheck for web apps.
- Add SSE or WebSocket streaming for logs.
- Add dashboard logs and metrics views.
- Add failure summaries for build, start, proxy, and healthcheck phases.

### Exit Criteria

- Dashboard shows app health and latest deploy status.
- User can inspect build logs and runtime logs separately.
- Failed deploy shows the failing phase and last relevant log lines.
- Metrics view shows CPU/RAM/disk for supported resources.

### Required Tests

- Unit tests for healthcheck evaluation.
- Unit tests for log stream framing.
- Integration test for deployment log capture.
- Manual test with a crashing app.

## 17. Checkpoint 10: Database Services and Backups

Goal: support common database services and safe backup workflows.

### Implementation

- Add database records separate from generic app records if needed.
- Add production database templates:
  - PostgreSQL
  - MySQL/MariaDB
  - Redis
  - MongoDB
- Add `backup_jobs` and `backup_runs` behavior.
- Add manual backup.
- Add scheduled backup.
- Add retention policy.
- Support local file backup first.
- Add external storage only after local backup is reliable.
- Add dashboard backup status and logs.

### Exit Criteria

- User can create a PostgreSQL service for an app.
- Database is internal-only by default.
- User can run a manual backup and see its status.
- Scheduled backup runs according to configured schedule.
- Retention removes old backups safely.

### Required Tests

- Unit tests for backup schedule parsing.
- Unit tests for retention selection.
- Integration test for PostgreSQL backup where practical.
- Manual VPS backup test.

## 18. Checkpoint 11: Notifications and Release Polish

Goal: close the loop for solo developers running production apps.

### Implementation

- Add notification settings.
- Support generic webhook.
- Support Discord webhook.
- Support Telegram bot token/chat ID.
- Trigger notifications for deploy succeeded, deploy failed, and backup failed.
- Improve public README and install docs.
- Add example projects.
- Add screenshots or demo GIF after UI is stable.
- Add issue templates and contributing guide for open source release.

### Exit Criteria

- Failed deploy can notify Discord or generic webhook.
- Public README guides a new user through local runner and one VPS deploy.
- Example app deploys from docs without hidden steps.
- Repository is ready for public alpha users to try.

### Required Tests

- Unit tests for notification payloads.
- Mock integration tests for webhook delivery.
- Manual notification tests.

## 19. Cross-Cutting Testing Strategy

Testing should scale with risk and blast radius.

### Unit Tests

Use unit tests for deterministic logic:

- config parsing and normalization
- preset detection
- workspace root resolution
- port conflict detection
- dependency ordering
- secret redaction
- deployment state transitions
- proxy config generation
- webhook signature validation
- backup retention selection

### Integration Tests

Use integration tests for behavior across packages:

- CLI creates and syncs a temp workspace
- daemon reads SQLite state
- dashboard route handlers proxy daemon responses
- command driver starts and stops sample apps
- Compose driver starts and stops local database services
- Dockerfile deployment builds and runs a sample app

### End-to-End Tests

Use Playwright for dashboard workflows once dashboard controls exist:

- dashboard connected/disconnected state
- app list rendering
- start/stop/restart actions
- app logs view
- deploy log view
- env var editor
- domain setup form

### Manual Release Checks

Before any public alpha:

```bash
npm install
npm run lint
npm run build --workspaces --if-present
routely init
routely add ./examples/hello-command --name hello --command "npm run dev" --port 4173
routely
routely ps
routely logs hello
routely down
```

For VPS alpha:

```text
fresh VPS
install Routely
server doctor passes
connect GitHub test repo
deploy Dockerfile app
add domain
verify HTTPS
push to main triggers redeploy
break build and verify failure logs
```

## 20. Documentation Strategy

Docs must be updated with each checkpoint, not only at the end.

Required docs updates:

- README quick start after every user-visible CLI change.
- `docs/13-current-setup-status.md` after each milestone.
- CLI examples in `docs/05-cli-spec.md` when commands are implemented or changed.
- API examples in `docs/06-api-spec.md` when endpoints are implemented.
- Config examples in `docs/07-config-spec.md` when schema changes.
- Security notes in `docs/09-security-model.md` before production auth and webhooks ship.
- This file when checkpoints change.

## 21. Release Milestones

### Internal Alpha

Scope:

- Local runner v1.
- Dashboard lifecycle controls.
- Logs.
- Presets for common local apps.
- Compose database service locally.

Release gate:

- A user can run three local apps and one database with one command.
- CLI and dashboard can stop/restart apps.
- Logs are inspectable.

### Public Alpha

Scope:

- Single-server VPS install.
- Dockerfile/static deploy.
- Domain and HTTPS.
- GitHub manual deploy.
- Deployment logs.

Release gate:

- A user can deploy one GitHub app to a VPS domain with HTTPS.
- Failed deploys show actionable logs.
- Auth protects production dashboard.

### Beta

Scope:

- GitHub auto deploy.
- Env manager.
- Metrics and health.
- Database templates.
- Backups.
- Notifications.

Release gate:

- Push to main redeploys app.
- Backups can be scheduled and inspected.
- Metrics and health are visible from dashboard.

## 22. Immediate Next Batch

When implementation starts, execute this first batch:

1. Fix workspace root resolution for real user workspaces.
2. Standardize daemon URL environment variables.
3. Implement `routely down`.
4. Add log persistence for command apps.
5. Implement `routely logs [app] --follow`.
6. Add port conflict detection before app startup.
7. Add dashboard start/stop/restart endpoints and buttons.
8. Add tests around CLI workspace behavior and command app lifecycle.

This batch produces the first clear Routely experience before production features begin.

## 23. Non-Negotiable Quality Bar

Do not mark a checkpoint complete unless:

- The feature works through the CLI or dashboard path users will actually use.
- The state model is updated consistently.
- Logs or errors explain failures clearly.
- Tests cover the risky logic.
- Docs match the implemented behavior.
- Existing user changes in the worktree are preserved.

If a checkpoint cannot be completed fully, document the exact remaining gap in `docs/13-current-setup-status.md` before moving on.

## 24. End-to-End User Journeys

These journeys define what "end to end" means for Routely. Implementation is complete only when these flows work without hidden manual steps beyond documented prerequisites.

### Journey A: First Local Workspace

```text
Install Routely
  -> create or open a workspace
  -> run routely init
  -> add one app manually or through preset detection
  -> run routely
  -> app starts on its configured port
  -> dashboard opens or URL is printed
  -> dashboard shows daemon and app status
  -> user views logs
  -> user stops Routely
  -> app process stops
```

Required capabilities:

- `routely init`
- `routely add`
- `routely up` / default `routely`
- `routely ps`
- `routely logs`
- `routely down`
- dashboard status and logs

### Journey B: Local Multi-App Workspace

```text
User has web, api, worker, and postgres
  -> add apps and database service
  -> configure api depends_on postgres
  -> run routely doctor
  -> run routely
  -> postgres starts first
  -> api starts after postgres
  -> web and worker start
  -> dashboard shows all resources
  -> user restarts api from dashboard
  -> logs remain available
```

Required capabilities:

- preset detection
- Compose database service
- dependency ordering
- port conflict detection
- lifecycle controls from CLI and dashboard
- persisted logs

### Journey C: First VPS Install

```text
User provisions a fresh VPS
  -> installs Routely
  -> runs routely server init
  -> server doctor checks Docker, ports, disk, memory
  -> admin auth is created
  -> Routely services start
  -> dashboard is accessible securely
```

Required capabilities:

- `routely server init`
- `routely server doctor`
- production data directory
- production auth
- daemon/dashboard service management

### Journey D: Manual Production Deploy

```text
User has a Dockerfile app
  -> registers source/app
  -> configures env vars
  -> runs routely deploy web --watch
  -> build logs stream
  -> container starts
  -> healthcheck passes
  -> app is reachable on temporary port or route
  -> dashboard shows deployment succeeded
```

Required capabilities:

- Dockerfile deploy driver
- deployment records and logs
- healthchecks
- deployment dashboard
- failure handling

### Journey E: Domain and HTTPS Production App

```text
User has a deployed app
  -> adds web.example.com
  -> Routely shows DNS instructions
  -> user points DNS to VPS
  -> Routely verifies DNS
  -> proxy route is created
  -> HTTPS certificate is issued
  -> app is live at https://web.example.com
```

Required capabilities:

- domain CRUD
- DNS verification
- Traefik-compatible proxy config
- TLS status tracking
- HTTP to HTTPS redirect

### Journey F: GitHub Auto Deploy

```text
User connects GitHub
  -> installs Routely GitHub App
  -> selects repo and branch
  -> maps repo to app
  -> pushes to main
  -> GitHub webhook is validated
  -> deployment starts
  -> logs stream
  -> app is updated if healthcheck passes
```

Required capabilities:

- GitHub App connection
- repository and branch selection
- webhook signature validation
- duplicate delivery protection
- auto deploy on configured branch

### Journey G: Operational Recovery

```text
Deploy fails or app crashes
  -> dashboard shows failing phase
  -> user reads logs
  -> previous app remains live where possible
  -> user rolls back or redeploys
  -> notification is sent if configured
```

Required capabilities:

- clear deployment phases
- build/runtime/proxy/health logs
- last successful deployment metadata
- rollback or redeploy path
- notifications

## 25. Final Definition Of Done

Routely is ready for a serious public alpha when all of these are true:

- A new user can complete Journey A from the README.
- A local multi-app workspace with one database can complete Journey B.
- A fresh VPS can complete Journey C.
- A Dockerfile app can complete Journey D.
- A real domain can complete Journey E.
- A GitHub repo can complete Journey F.
- A failed deploy can complete Journey G.
- `npm run lint` passes.
- Workspace/package builds pass or documented exceptions exist.
- Core logic has unit tests.
- CLI and daemon have integration tests for critical flows.
- Dashboard has at least smoke E2E coverage for the main flows.
- Security-sensitive behavior is covered: auth, webhook signatures, secret redaction.
- Docs match current behavior.

## 26. Package Ownership Map

Use this map to keep features in the correct package boundaries.

### `apps/cli`

Owns:

- command parsing
- workspace resolution entrypoint
- local UX for `routely`, `init`, `add`, `ps`, `logs`, `down`, `restart`, `doctor`
- production UX for `server`, `deploy`, `domain`, `env`, `db`, `backup`
- CLI output formatting
- daemon API client usage

Should not own:

- SQLite schema definitions
- framework preset logic
- Docker/proxy generation internals
- GitHub webhook validation internals

### `apps/daemon`

Owns:

- long-running local/server API
- app lifecycle endpoints
- deployment job coordination
- log and metrics streaming endpoints
- reconciliation between SQLite state and running processes/containers

Should not own:

- browser UI
- product docs
- framework-specific preset detection unless delegated through packages

### `apps/web`

Owns:

- dashboard UI
- same-origin API route handlers that proxy to daemon
- authenticated production dashboard experience
- forms and views for apps, deployments, domains, env, logs, metrics, databases, backups, settings

Should not own:

- direct browser calls to daemon
- process/container execution
- direct database writes unless intentionally moved into web API architecture later

### `packages/core`

Owns:

- shared types and constants
- config normalization
- DTO helpers
- shared validation rules
- cross-package pure utilities

### `packages/db`

Owns:

- SQLite open/migration logic
- schema evolution
- repository functions for apps, deployments, logs, domains, env, GitHub, metrics, backups, settings
- transaction boundaries for state changes

### `packages/drivers`

Owns:

- command driver
- compose driver
- Dockerfile driver
- buildpack/static driver helpers
- runtime start/stop/build abstractions

### `packages/presets`

Owns:

- framework detection
- editable default commands
- database service templates
- generated config fragments

### `packages/proxy`

Owns:

- Traefik-compatible labels/config
- route generation
- TLS/proxy status helpers
- DNS verification helpers if not split later

### `packages/github`

Owns:

- GitHub App helpers
- installation/repository API calls
- webhook signature validation
- webhook event normalization
- GitHub deployment/status API helpers

## 27. CLI Command Completion Map

Track CLI progress against `docs/05-cli-spec.md`.

### Local Commands

- [ ] `routely`
- [ ] `routely init`
- [ ] `routely add`
- [ ] `routely up`
- [ ] `routely down`
- [ ] `routely ps`
- [ ] `routely logs [app]`
- [ ] `routely logs [app] --follow`
- [ ] `routely restart [app]`
- [ ] `routely doctor`

### App and Config Commands

- [ ] `routely env <app> list`
- [ ] `routely env <app> set KEY=value`
- [ ] `routely env <app> unset KEY`
- [ ] config import from `routely.yml`
- [ ] safe config export to `routely.yml`

### Production Commands

- [ ] `routely server init`
- [ ] `routely server status`
- [ ] `routely server doctor`
- [ ] `routely server upgrade`
- [ ] `routely deploy <app>`
- [ ] `routely deploy <app> --branch <branch>`
- [ ] `routely deploy <app> --watch`

### Domain Commands

- [ ] `routely domain root <domain>`
- [ ] `routely domain add <app> <hostname>`
- [ ] `routely domain verify <hostname>`
- [ ] `routely domain ls`

### Database and Backup Commands

- [ ] `routely db add postgres`
- [ ] `routely db add mysql`
- [ ] `routely db add redis`
- [ ] `routely db add mongodb`
- [ ] `routely db ls`
- [ ] `routely backup enable <database>`
- [ ] `routely backup disable <database>`
- [ ] `routely backup run <database>`
- [ ] `routely backup ls`

## 28. API Endpoint Completion Map

Track daemon and dashboard API progress against `docs/06-api-spec.md`.

### Core App API

- [ ] `GET /health`
- [ ] `GET /apps`
- [ ] `POST /apps`
- [ ] `GET /apps/:id`
- [ ] `PATCH /apps/:id`
- [ ] `DELETE /apps/:id`
- [ ] `POST /apps/:id/start`
- [ ] `POST /apps/:id/stop`
- [ ] `POST /apps/:id/restart`
- [ ] `GET /apps/:id/logs`
- [ ] `GET /apps/:id/metrics`

### Deployment API

- [ ] `GET /deployments`
- [ ] `POST /apps/:id/deployments`
- [ ] `GET /deployments/:id`
- [ ] `GET /deployments/:id/logs`
- [ ] `POST /deployments/:id/cancel`
- [ ] `POST /deployments/:id/rollback`

### GitHub API

- [ ] `GET /github/installations`
- [ ] `GET /github/repos`
- [ ] `POST /github/connect`
- [ ] `POST /github/webhook`

### Domain API

- [ ] `GET /domains`
- [ ] `POST /domains`
- [ ] `POST /domains/:id/verify`
- [ ] `DELETE /domains/:id`

### Environment API

- [ ] `GET /apps/:id/env`
- [ ] `POST /apps/:id/env`
- [ ] `PATCH /apps/:id/env/:key`
- [ ] `DELETE /apps/:id/env/:key`

### Database and Backup API

- [ ] `GET /databases`
- [ ] `POST /databases`
- [ ] `POST /databases/:id/start`
- [ ] `POST /databases/:id/stop`
- [ ] `GET /backups`
- [ ] `POST /backups`
- [ ] `POST /backups/:id/run`
- [ ] `PATCH /backups/:id`

## 29. Data Schema Completion Map

Track SQLite schema progress against `docs/08-data-model.md`.

### Core State

- [ ] `servers`
- [ ] `apps`
- [ ] `app_sources`
- [ ] `app_env_vars`
- [ ] `runtime_instances`
- [ ] `settings`

### Production and Deployments

- [ ] `domains`
- [ ] `deployments`
- [ ] `deployment_logs`
- [ ] `healthchecks`
- [ ] `audit_events`

### GitHub

- [ ] `github_installations`
- [ ] `github_repositories`
- [ ] webhook delivery dedupe storage

### Observability

- [ ] `metrics_samples`
- [ ] log metadata if logs are file-backed

### Databases and Backups

- [ ] `databases`
- [ ] `backup_jobs`
- [ ] `backup_runs`

Schema rules:

- Migrations must be idempotent.
- Existing local databases should migrate in place.
- New state changes should be wrapped in transactions where consistency matters.
- Secrets should be encrypted where practical and never exported by default.

## 30. Dashboard View Completion Map

Track dashboard progress against `docs/feature-specs/dashboard.md`.

### Local Dashboard

- [ ] daemon connected/disconnected state
- [ ] app list
- [ ] service/database list
- [ ] app detail
- [ ] start/stop/restart controls
- [ ] log viewer
- [ ] add/edit app form
- [ ] settings page

### Production Dashboard

- [ ] login/auth screen
- [ ] overview
- [ ] apps list
- [ ] app detail
- [ ] deployments
- [ ] deployment logs
- [ ] domains
- [ ] environment variables
- [ ] databases
- [ ] backups
- [ ] metrics
- [ ] notifications/settings

Dashboard quality rules:

- Dense operational layout, not marketing layout.
- Status and failures should be scannable.
- Actions that affect running infrastructure need clear loading/error states.
- Avoid exposing secrets after creation.
- Mobile should remain usable for monitoring and urgent actions.

## 31. Runtime Driver Completion Map

Track runtime support against `docs/feature-specs/runtime-and-build-system.md`.

- [ ] command driver for local processes
- [ ] compose driver for local services and production Compose apps
- [ ] Dockerfile driver for production builds
- [ ] static driver for static sites
- [ ] buildpack/Nixpacks/Railpack-compatible driver
- [ ] healthcheck runner
- [ ] rollback metadata support
- [ ] stale runtime reconciliation

Driver rules:

- Local command apps stop when Routely stops.
- Production containers should use restart policies.
- Production builds should run isolated from the dashboard process where possible.
- Driver output must feed deployment/runtime logs.

## 32. Security Completion Map

Track security progress against `docs/09-security-model.md`.

- [ ] local dashboard token or equivalent local trust mechanism
- [ ] production admin auth
- [ ] production API token/session handling
- [ ] secret storage strategy
- [ ] secret redaction in logs
- [ ] GitHub webhook signature validation
- [ ] webhook delivery dedupe
- [ ] public database exposure requires explicit confirmation
- [ ] production app containers bind internally by default
- [ ] audit events for sensitive production actions
- [ ] backup files are not publicly served

Security rules:

- Treat GitHub webhook payloads as untrusted until validated.
- Treat repo code as powerful and admin-approved.
- Never log raw tokens, passwords, or private keys.
- Default to private/internal networking for databases.

## 33. Open Source Release Checklist

Before public release, verify:

- [ ] README has local quick start.
- [ ] README has VPS quick start.
- [ ] README clearly states current alpha limitations.
- [ ] `.env.example` covers required env vars.
- [ ] example local app works.
- [ ] example Dockerfile app works.
- [ ] install instructions work on a fresh machine.
- [ ] contribution guide exists.
- [ ] issue templates exist.
- [ ] license is present and intentional.
- [ ] security disclosure instructions exist.
- [ ] screenshots or demo video are current.
- [ ] public ports and reserved ports are documented.
- [ ] destructive operations require confirmation.
- [ ] release notes include known limitations.
