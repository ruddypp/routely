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
- Domains, HTTPS automation, GitHub automation, backups, static deploys, rollback actions, and broader VPS operations remain deferred.

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
routely
```

The dashboard app surface can start, stop, and restart local command-driver apps through the daemon. The app inspector reads recent content from `.routely/logs/<app>.log` through `GET /api/apps/:id/logs`. Add/edit forms write registry entries through same-origin `/api/apps` and `/api/apps/:id` route handlers. Browser code does not call the daemon directly.

Command apps declared in `routely.yml` can use `depends_on` to control local startup order. Routely rejects dependency cycles before starting apps. CLI commands and daemon boot reconcile stale runtime PIDs so apps are not left marked `running` after an old managed process exits outside Routely.

Local Compose services declared in `services:` use `driver: compose`. Generated Compose files are written under `.routely/compose` unless `compose_file` is supplied. Database templates are local-development defaults and are internal by default where practical.

Production server foundation now supports the first Dockerfile deployment slice. `routely server init` switches the workspace/server state to production mode, records the production data directory strategy, and prints a one-time admin token. Keep that token secret and provide it to server-side dashboard/API and CLI processes as `ROUTELY_ADMIN_TOKEN` until a full login UI lands. Dockerfile deployments are available through `routely deploy <app> [--watch]` and the dashboard deploy panel. Domains, HTTPS automation, GitHub automation, backups, static deploys, rollback actions, and broad VPS operations remain deferred to later checkpoints.

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

Recommended next implementation step after Checkpoint 5:

```text
Checkpoint 6: Proxy, Domains, and HTTPS
  - Reuse Checkpoint 5 deployment metadata/logging and container status.
  - Add domain/proxy/HTTPS behavior only in that checkpoint.
  - Keep GitHub automation, backups, and broader production operations deferred.
  - Keep browser calls routed through same-origin /api/* handlers.
```
