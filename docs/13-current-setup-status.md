# Routely Current Setup Status

Version: 0.1  
Status: Active setup note  
Last updated: 2026-06-18
Environment: Fedora Linux, npm, Node.js via NVM

## English

Routely has been scaffolded locally and is ready for feature development.

The project location is:

```text
/home/ruddypp/Documents/work/routely
```

The documentation location is:

```text
/home/ruddypp/Documents/work/docs/routely
```

## Bahasa Indonesia

Routely sudah selesai di-setup secara lokal dan siap untuk mulai development fitur.

Lokasi project:

```text
/home/ruddypp/Documents/work/routely
```

Lokasi dokumentasi:

```text
/home/ruddypp/Documents/work/docs/routely
```

## What Has Been Set Up

Product references for future work:

- Routely is inspired by 9Router's local-first runner/control-plane workflow and Dokploy's dense single-VPS deployment operations.
- Future implementation agents should read `https://github.com/decolua/9router`, `https://github.com/Dokploy/dokploy`, and `https://docs.dokploy.com/` before major product/backend/frontend changes.
- Frontend improvements should make the production panel more Dokploy-like: readable, operational, dense, status-rich, comfortable for daily VPS operations, and responsive.
- Frontend work must not be frontend-only. New panels and controls should be backed by daemon/API/storage data where practical, with backend/schema/API/CLI/tests/docs progress leading each checkpoint.

- Next.js dashboard/API scaffold exists in `apps/web`.
- CLI package exists in `apps/cli`.
- Daemon package exists in `apps/daemon`.
- Shared packages exist in `packages/*`.
- Dashboard reads daemon `/health` and `/apps` and shows connected/disconnected status.
- SQLite state is initialized at `.routely/routely.db`.
- `packages/core` contains the initial app/config types and DTO helpers.
- `packages/db` contains the initial SQLite schema and app registry helpers.
- `packages/drivers` contains a minimal command driver for local command apps.
- npm workspaces are configured at the root.
- Dashboard default port is `3030` to avoid conflict with 9Router on `20128`.
- Daemon default port is `9977`.
- Docker is installed and available from the user's normal terminal session.
- CLI is buildable with TypeScript.
- CLI global command is installed locally through npm global install.
- CLI workspace resolution now separates the Routely install root from the active user workspace root.
- `ROUTELY_WORKSPACE_ROOT` can override the active workspace for tests and scripted runs.
- Local runner v1 has started: logs, down, restart, doctor, port preflight checks, dependency ordering, and stale PID reconciliation are implemented for command apps.
- Dashboard local controls have started: browser calls same-origin `/api/*` handlers for app start, stop, restart, open URL, recent log access, and app registry create/edit.
- The browser UI now uses a 9Router-inspired local runner shell: desktop sidebar, mobile bottom navigation, workspace/status header, dense app rows, app inspector, recent logs, and add/edit registry forms.
- The latest frontend design pass refined the existing shell with tighter app row rhythm, safer desktop action wrapping, clearer inspector/log contrast, improved loading/empty states, and better add/edit form focus, disabled, and validation affordances.
- Checkpoint 3 has expanded local resource support: `routely.yml` apps/services now carry install/dev/build/start commands, env, dependencies, healthchecks, domains, source metadata, Compose image/service/file metadata, internal service flags, and volumes.
- `packages/presets` now detects common local stacks including Next.js, Vite/React, Laravel, Express, NestJS, Django, FastAPI, Go, static HTML/CSS, and PHP custom projects.
- `routely add <path>` now detects a preset where possible, writes editable generated commands to `routely.yml`, and keeps the registry synced into SQLite.
- `routely db add <postgres|mysql|mariadb|redis|mongodb>` registers a local Compose-backed database service and writes it to the `services:` section of `routely.yml`.
- The local Compose driver generates per-service Compose files under `.routely/compose` and uses `docker compose` for service start/stop.
- The dashboard now distinguishes apps from services/databases and exposes denser config metadata in rows, inspector sections, and add/edit forms while still routing browser mutations through same-origin `/api/*`.
- Checkpoint 4 has added the production server foundation without enabling deploy/domain/HTTPS/GitHub/backup actions.
- `routely server init` prepares production mode state, creates/checks a persistent data directory, generates a first-run admin token, stores only its salted hash in SQLite settings, and runs the production doctor checks.
- `routely server doctor` reports Docker, Docker Compose, Node/npm, production data directory, disk, memory, and required production ports `80`, `443`, and the dashboard port.
- The daemon exposes server foundation status at `/server/status`, auth status at `/auth/status`, and protected doctor checks at `/server/doctor`. In production mode, private daemon API paths require an admin bearer token.
- Next.js route handlers continue to proxy browser access through same-origin `/api/*`; `/api/server/status` backs the dashboard server foundation panel, and server-side proxy calls can forward `ROUTELY_ADMIN_TOKEN` without exposing it to browser code.
- The dashboard now has clearer operational zones for local resources, server foundation readiness, and disabled future production capabilities.
- Checkpoint 5 has added a Dockerfile-first production deploy vertical slice.
- SQLite now stores deployment history and incremental deployment logs in `deployments` and `deployment_logs`, with `app_sources` and `healthchecks` tables created for later production features.
- The daemon exposes authenticated deployment endpoints at `/deployments`, `/apps/:id/deployments`, `/deployments/:id`, and `/deployments/:id/logs`.
- `routely deploy <app>` queues a Dockerfile deployment through the daemon, and `routely deploy <app> --watch` streams incremental deployment logs until success or failure.
- Dockerfile deploys currently build a local source path containing `Dockerfile`, start a container on a temporary `127.0.0.1:32xxx` host port, run either the configured HTTP healthcheck or a container-running check, and store image/container/port metadata for future rollback work.
- The dashboard now includes a Dokploy-inspired production deploy panel and an inspector with Overview, Deployments, Logs, and Config tabs backed by daemon/API/storage data.
- Checkpoint 6 has added the first domain/proxy/HTTPS vertical slice for Dockerfile-deployed apps.
- SQLite now stores `domains` and `proxy_routes` state, including DNS status, TLS status, target port, verification messages, and generated route metadata.
- `packages/proxy` now generates Traefik-compatible dynamic config, HTTPS redirect middleware, secure headers, route/service names, Docker labels, wildcard DNS instructions, hostname validation, and DNS A-record verification helpers.
- The daemon exposes authenticated domain/proxy endpoints at `/domains`, `/domains/root`, `/domains/:hostname/verify`, `/domains/:hostname`, `/apps/:id/domains`, `/proxy/routes`, and `/proxy/config`.
- `routely domain root <domain>`, `routely domain add <app> <hostname>`, `routely domain verify <hostname>`, and `routely domain ls` call the daemon and pass `ROUTELY_ADMIN_TOKEN` when configured.
- Domain routes are tied to the latest successful Dockerfile deployment host port from Checkpoint 5. Internal/database apps are rejected for public proxy exposure.
- Verified domains with a successful deployment materialize proxy route records and generated Traefik config. TLS state is conservative: `issuing` means Routely generated the HTTPS route for Traefik/ACME; Routely does not fake certificate success.
- The dashboard production panel now includes real domain, DNS, proxy, and HTTPS state, root-domain DNS instructions, app hostname add, DNS verify/remove actions, proxy target visibility, and future GitHub/backups/metrics/rollback placeholders kept inert.
- Checkpoint 7 has added the first GitHub integration and auto-deploy vertical slice.
- `packages/github` validates signed GitHub webhooks with `X-Hub-Signature-256`, filters deployable push events, detects GitHub App configured state from env, and avoids exposing secrets in API responses.
- SQLite now stores GitHub installations, repositories, app source links, and webhook delivery deduplication/status in `github_installations`, `github_repositories`, `app_sources`, and `github_webhook_deliveries`.
- The daemon exposes authenticated GitHub management endpoints at `/github/status`, `/github/installations`, `/github/repos`, `/apps/:id/github`, and `/github/deliveries`.
- The daemon exposes public `POST /github/webhook`; it validates the GitHub signature, deduplicates delivery IDs, ignores unsupported events, and queues the existing Dockerfile deployment flow for connected app repo/branch pushes.
- CLI GitHub commands now exist: `routely github status`, `routely github installation add`, `routely github repo add`, and `routely github connect`.
- Next.js same-origin route handlers proxy GitHub management endpoints under `/api/*`, and `/api/github/webhook` forwards the raw signed body to the daemon.
- The dashboard production panel and app inspector now show GitHub configured/unconfigured state, repository/branch connection, auto-deploy state, recent webhook delivery status, and GitHub inspector data from real daemon/API/storage state.
- GitHub App OAuth install callback, live GitHub API repo/branch fetching, commit status updates, backups, static deploys, production database templates, full rollback, metrics collection, notifications, and broader VPS operations remain deferred.
- Checkpoint 8 has added the first environment, secrets, and app settings slice.
- SQLite now stores secret-aware runtime env in `app_env_vars`, plus app-level `needs_restart` and `needs_redeploy` flags so pending state survives env deletion and settings edits.
- Shared helpers validate env keys, infer likely secret keys, merge portable `routely.yml` env with stored env by scope, hide secret values in API DTOs, and redact configured secret values from returned app/deployment logs where practical.
- The daemon exposes authenticated env endpoints at `/apps/:id/env` and `/apps/:id/env/:key`, injects merged env into local command starts and Dockerfile production containers, clears restart-needed after successful local starts, and clears redeploy-needed after successful Dockerfile deploys.
- CLI env commands now exist: `routely env <app> list`, `routely env <app> set KEY=value [--secret] [--scope all|local|production]`, and `routely env <app> unset KEY`.
- Next.js same-origin route handlers proxy env endpoints under `/api/*`; browser code still does not call the daemon directly.
- The dashboard inspector now has an Env tab backed by real daemon/API/storage data, including masked secrets, scope, restart/redeploy-needed state, set/unset controls, and row/overview pending indicators.
- Checkpoint 9 has added the first logs, metrics, and health slice.
- SQLite now stores app/container health state in `healthchecks` and narrow host/container metric samples in `metrics_samples`.
- Shared helpers evaluate HTTP response-time healthchecks, runtime/container health, public health/metric DTOs, and server-sent event framing for deployment logs.
- The daemon exposes authenticated operational endpoints at `/apps/:id/health`, `/apps/:id/metrics`, `/metrics`, and `/deployments/:id/logs/stream` while preserving existing `/apps/:id/logs` and `/deployments/:id/logs` behavior.
- App health refreshes use configured HTTP healthchecks where available, otherwise container-running state for successful Dockerfile deployments, otherwise local runtime/Compose state. Deployment failures persist unhealthy state with the failing phase summary.
- Runtime and deployment logs returned by daemon/API continue to redact stored app secret values where practical.
- CLI now includes `routely health <app>` to show app health, latest deploy state, and recent metric samples from real daemon/storage data.
- Next.js same-origin route handlers proxy health, metrics, and deployment log stream endpoints under `/api/*`; browser code still does not call the daemon directly.
- The dashboard inspector now has a Health tab with health checks, HTTP timing, latest host/container metric samples, and overview health/CPU/RAM cards backed by daemon data.
- Backups, notifications, production database templates, full rollback, alerts, and broad VPS operations remain deferred.

## Current Structure

```text
routely/
  apps/
    web/
      package.json
      src/
      public/
    cli/
      package.json
      src/index.ts
      scripts/write-dev-root.js
      dist/index.js
      dist/dev-root.json
    daemon/
      package.json
      src/server.js
  packages/
    core/
    db/
    drivers/
    github/
    proxy/
    presets/
  package.json
  package-lock.json
  tsconfig.base.json
  .env.example
```

## Global CLI Status

The `routely` command is available globally on this machine.

Current global binary path:

```text
/home/ruddypp/.nvm/versions/node/v24.12.0/bin/routely
```

It points to the local build output:

```text
/home/ruddypp/Documents/work/routely/apps/cli/dist/index.js
```

The CLI stores the local development root in:

```text
apps/cli/dist/dev-root.json
```

Current dev root:

```text
/home/ruddypp/Documents/work/routely
```

This means `routely` can be run from any directory while still knowing where the local Routely monorepo is installed.

The active app workspace is now resolved separately:

```text
default workspace: current working directory
override:          ROUTELY_WORKSPACE_ROOT
```

Workspace files are created and read from the active workspace:

```text
<workspace>/routely.yml
<workspace>/.routely/routely.db
```

## Daily Development Commands

From the Routely root:

```bash
cd /home/ruddypp/Documents/work/routely
npm run dev
```

This runs the CLI in development mode, which starts:

```text
Dashboard: http://localhost:3030
Daemon:    http://127.0.0.1:9977
```

The global command can also be used from any directory:

```bash
routely
```

Initial skeleton commands:

```bash
routely init
routely add /path/to/app --name web --command "npm run dev" --port 3000
routely add ./apps/web --name web
routely db add postgres
routely ps
routely logs web --follow
routely restart web
routely down
routely doctor
routely server init --data-dir /var/lib/routely
routely server doctor
routely deploy web --watch
routely env web list
routely env web set DATABASE_URL=postgres://user:pass@db/app --secret --scope production
routely env web unset DATABASE_URL
routely health web
routely domain root example.com
routely domain add web web.example.com
routely domain verify web.example.com
routely domain ls
routely github status
routely github installation add 123456 --account your-github-login
routely github repo add owner/repo --branch main --installation-id 123456
routely github connect web owner/repo --branch main
routely
```

The dashboard app surface can start, stop, and restart local command-driver apps through the daemon. The app inspector reads recent content from `.routely/logs/<app>.log` through `GET /api/apps/:id/logs`. Add/edit forms write registry entries through same-origin `/api/apps` and `/api/apps/:id` route handlers. Browser code does not call the daemon directly.

Command apps declared in `routely.yml` can use `depends_on` to control local startup order. Routely rejects dependency cycles before starting apps. CLI commands and daemon boot reconcile stale runtime PIDs so apps are not left marked `running` after an old managed process exits outside Routely.

Local Compose services declared in `services:` use `driver: compose`. Generated Compose files are written under `.routely/compose` unless `compose_file` is supplied. Database templates are local-development defaults and are internal by default where practical.

Production server foundation now supports Dockerfile deployments, domain/proxy/HTTPS state, signed GitHub push-to-deploy for apps connected to a GitHub repository/branch, stored env/secrets injection, app health state, runtime/deployment log inspection, and narrow host/container metric sampling. `routely server init` switches the workspace/server state to production mode, records the production data directory strategy, and prints a one-time admin token. Keep that token secret and provide it to server-side dashboard/API and CLI processes as `ROUTELY_ADMIN_TOKEN` until a full login UI lands. Dockerfile deployments are available through `routely deploy <app> [--watch]` and the dashboard deploy panel. Domain commands and the dashboard can add hostnames, verify DNS against `ROUTELY_SERVER_PUBLIC_IP`, and generate Traefik-compatible HTTPS routes for the latest successful deployment. Env commands and the dashboard Env inspector store secret values in SQLite, hide them after save, and mark apps as needing restart/redeploy after env/settings changes. GitHub App env can be configured with `ROUTELY_GITHUB_APP_ID`, `ROUTELY_GITHUB_WEBHOOK_SECRET`, `ROUTELY_GITHUB_PRIVATE_KEY`, `ROUTELY_GITHUB_CLIENT_ID`, and `ROUTELY_GITHUB_CLIENT_SECRET`. Backups, static deploys, full rollback, alerts, notifications, production database templates, and broad VPS operations remain deferred to later checkpoints.

## CLI Build And Global Reinstall Flow

After changing CLI code:

```bash
cd /home/ruddypp/Documents/work/routely/apps/cli
npm run build
npm i -g .
routely
```

This matches the preferred 9Router-style workflow:

```text
edit CLI
build CLI
install globally from local package
run command
```

## Verification Already Done

- `npm run build --workspace apps/cli` completed successfully.
- `npm run test --workspace apps/cli` completed successfully for CLI path resolution tests.
- CLI tests now cover path resolution, port conflict helpers, dependency ordering, and stale PID reconciliation.
- `npm run lint` completed successfully.
- `npm i -g .` from `apps/cli` completed successfully.
- `which routely` resolves to the NVM global binary path.
- `readlink -f $(which routely)` resolves to `apps/cli/dist/index.js`.
- `apps/cli/dist/dev-root.json` points to `/home/ruddypp/Documents/work/routely`.
- Earlier dashboard and daemon checks returned HTTP 200 when run outside the restricted tool session.
- A temp workspace smoke test created `routely.yml` and `.routely/routely.db` outside the Routely repo.
- A daemon smoke test with `ROUTELY_WORKSPACE_ROOT` returned the temp workspace and database path from `/health`.
- A timed `routely up` smoke test started daemon, dashboard, and `hello-command`, then shut them down without leaving listening ports behind.
- Current dashboard shell verification passed with `npm run lint`, `npm run test --workspace apps/web`, web TypeScript, `node --check apps/daemon/src/server.js`, `npm run build --workspace apps/cli`, and `npm run test --workspace apps/cli`.
- Checkpoint 3 verification added preset/config/Compose/database-template tests to the CLI suite and a temp workspace smoke for `init`, `db add postgres`, Next.js preset detection via `add`, config export, and `sync`.
- Browser smoke was run against local daemon/web dev servers with desktop, tablet, and mobile headless Chrome screenshots. `/api/apps` and `/api/apps/3/logs` returned through the same-origin web API.
- The latest frontend design pass passed `npm run lint`, `npm run test --workspace apps/web`, `npx tsc --noEmit --project apps/web/tsconfig.json`, same-origin `/api/apps` smoke, and desktop/tablet/mobile headless Chrome screenshots. A desktop app-row overlap found in the first screenshot pass was fixed and rechecked.
- Checkpoint 4 verification passed `npm run lint`, `npm run test --workspace apps/cli`, `npm run build --workspace apps/cli`, `npm run test --workspace apps/web`, `npx tsc --noEmit --project apps/web/tsconfig.json`, and `node --check apps/daemon/src/server.js`.
- Checkpoint 4 browser/API smoke passed with daemon and web dev servers running locally: `/api/server/status` returned server foundation readiness through same-origin Next.js, `/api/apps` returned the local registry, and desktop/tablet/mobile headless Chrome screenshots showed the production readiness panel and local resource surface without obvious overlap. The restricted tool session required elevated port binding for the daemon/web smoke.
- Checkpoint 4 security smoke passed with a temporary production-mode daemon on port `9988`: unauthenticated `GET /apps` returned `401 Unauthorized` with `Routely production API requires an admin token.`
- Checkpoint 5 verification passed `npm run lint`, `npm run test --workspace apps/cli`, `npm run build --workspace apps/cli`, `npm run test --workspace apps/web`, `npx tsc --noEmit --project apps/web/tsconfig.json`, and `node --check apps/daemon/src/server.js`.
- Checkpoint 5 tests cover deployment state/log persistence, Dockerfile command builders, and same-origin Next.js deployment route proxying.
- Checkpoint 5 smoke used a temporary local workspace with a Dockerfile app. `/api/apps` and `/api/deployments` returned through same-origin Next.js routes, desktop/tablet/mobile headless Chrome screenshots rendered the deploy panel without obvious overlap or horizontal overflow, and `routely deploy web --watch` built `routely/web:2`, started `routely_web_2` on `127.0.0.1:32002`, passed the HTTP healthcheck, streamed deployment logs, and was cleaned up afterward.
- Checkpoint 6 verification passed `npm run lint`, `npm run test`, `npm run build --workspace apps/cli`, `npm run test --workspace apps/web`, `npx tsc -p apps/web/tsconfig.json --noEmit`, and `node --check apps/daemon/src/server.js`.
- Checkpoint 6 tests cover proxy config generation, Docker labels, wildcard instructions, mocked DNS verification, persisted domain/proxy route state, and same-origin Next.js domain/proxy route handlers.
- Checkpoint 7 verification passed `npm run lint`, `npm run test --workspace apps/cli`, `npm run build --workspace apps/cli`, `npm run test --workspace apps/web`, `npx tsc --noEmit --project apps/web/tsconfig.json`, and `node --check apps/daemon/src/server.js`.
- Checkpoint 7 tests cover GitHub signature validation, webhook event filtering, delivery deduplication, GitHub installation/repository/source metadata persistence, and same-origin Next.js GitHub route handlers.
- Checkpoint 8 verification passed `npm run lint`, `npm run test --workspace apps/cli`, `npm run build --workspace apps/cli`, `npm run test --workspace apps/web`, `npx tsc --noEmit --project apps/web/tsconfig.json`, and `node --check apps/daemon/src/server.js`.
- Checkpoint 8 tests cover secret redaction, env merge precedence, env CRUD visibility, restart/redeploy-needed state for env and app settings edits, and same-origin Next.js env route handlers.
- `npm run build --workspace apps/web` was attempted for Checkpoint 7 and emitted only a Turbopack two-error summary without actionable diagnostics; lint and TypeScript passed. This remains documented as the existing web build/reporting caveat.
- `npm run build --workspace apps/web` still returns only the partial `Finished TypeScript...` progress line with no final exit marker and no remaining build process, matching the existing web build caveat.

## Environment Check

Current verified local tool versions:

```text
Node.js:        v24.12.0
npm:            11.6.2
Git:            2.54.0
Docker:         29.5.3
Docker Compose: v5.1.4
```

Ports checked as free during the latest setup audit:

```text
3030  dashboard
9977  daemon
4173  hello-command example
```

## Known Notes

- 9Router is currently using port `20128`; Routely intentionally uses dashboard port `3030`.
- The Codex tool session may fail to bind local ports with `EPERM` because of sandbox restrictions. The user's normal terminal should be used for final runtime checks.
- Routely is not published to npm registry yet. The current global command is a local npm global install from `apps/cli`.

## Next Development Target

Recommended next implementation step after Checkpoint 9:

```text
Checkpoint 10: Database Services and Backups
  - Add production database service templates only where they can be backed by real daemon/storage/runtime data.
  - Add safe backup job/run state and manual backup workflow.
  - Keep restore/destructive operations explicit and conservative.
  - Keep browser calls routed through same-origin /api/* handlers.
```
