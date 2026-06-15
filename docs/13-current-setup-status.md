# Routely Current Setup Status

Version: 0.1  
Status: Active setup note  
Last updated: 2026-06-16
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
- Local runner v1 has started: logs, down, restart, doctor, and port preflight checks are implemented for command apps.

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
routely ps
routely logs web --follow
routely restart web
routely down
routely doctor
routely
```

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
- CLI tests now cover path resolution and port conflict helpers.
- `npm run lint` completed successfully.
- `npm i -g .` from `apps/cli` completed successfully.
- `which routely` resolves to the NVM global binary path.
- `readlink -f $(which routely)` resolves to `apps/cli/dist/index.js`.
- `apps/cli/dist/dev-root.json` points to `/home/ruddypp/Documents/work/routely`.
- Earlier dashboard and daemon checks returned HTTP 200 when run outside the restricted tool session.
- A temp workspace smoke test created `routely.yml` and `.routely/routely.db` outside the Routely repo.
- A daemon smoke test with `ROUTELY_WORKSPACE_ROOT` returned the temp workspace and database path from `/health`.
- A timed `routely up` smoke test started daemon, dashboard, and `hello-command`, then shut them down without leaving listening ports behind.

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

Recommended next implementation step after skeleton v1:

```text
Routely local runner v1
  - Add explicit routely down/stop behavior.
  - Add logs command and log persistence/streaming.
  - Add port conflict detection before command apps start.
  - Add dashboard start/stop controls for local command apps.
  - Add config import/export between routely.yml and SQLite.
```
