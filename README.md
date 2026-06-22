# Routely

Routely is an open source, self-hosted, dashboard-first control plane for solo developers running apps locally and on one VPS.

The product direction is deliberately simple:

```text
Dashboard first: normal setup and operation should happen through the dashboard.
Start All: one action starts every enabled app/service while individual apps can be stopped or disabled.
Compose first: the same registry should map local and one-VPS operation to a Compose-backed model.
Operations included: domains/proxy, env/secrets, databases/backups, logs, deploy history, and health.
```

In one sentence: **one dashboard to register and operate apps, one Start action for enabled apps, and one Compose-backed model from laptop to VPS**.

Routely uses 9Router as the local UX/server-lifecycle reference: a memorable command, local daemon/server, lightweight dashboard, and fast status loop. It uses Dokploy as the production-operations reference: Docker/Compose deploys, domains/proxy, HTTPS, GitHub, env/secrets, logs, deploy history, health, databases, backups, and notifications on a single VPS.

Current status: public-alpha preparation. Routely is not published to npm yet, so install from this repository for now.

## MVP Demos

The MVP is defined by three demos:

1. Local demo: register three apps and one database, start every enabled app, then stop or disable one app individually.
2. VPS demo: operate one app on a single VPS with domain/proxy, env/secrets, database/backups, logs, deploy history, and health state.
3. GitHub demo: push to the configured branch, auto-redeploy, and inspect failure logs when a deploy breaks.

## What Works Today

- Local command apps with `init`, `add`, `sync`, `up`, `ps`, `down`, `restart`, `logs`, and `doctor`.
- App enablement exists in config/state; the local `routely` path starts enabled `command` and `compose` apps.
- Local Compose-backed database services through `routely db add <postgres|mysql|mariadb|redis|mongodb>`.
- A dashboard at `http://localhost:3030` that talks to same-origin `/api/*` routes, not directly to the daemon from browser code.
- A daemon at `http://127.0.0.1:9977` in local mode.
- SQLite state under `<workspace>/.routely/routely.db` and logs under `<workspace>/.routely/logs`.
- Production vertical slices for Dockerfile deploys, a narrow one-service Compose-backed deploy path, domains/proxy state, signed GitHub webhooks, env/secrets, health/metrics, production database records, local-file backups, and webhook/Discord/Telegram notifications.

These production slices are alpha foundations, not a finished Dokploy replacement or broad production Compose parity. Dashboard-first app setup, Start All/per-app stop/disable controls, multi-service Compose orchestration beyond one registered app/service, full production service installation/upgrade automation, login UI, rollback, external backup storage, public app catalogs, and broad VPS operations remain deferred until verified.

## Requirements

- Node.js 20 or newer. Current development has been verified with Node.js 24.
- npm 10 or newer.
- Docker and Docker Compose for Compose services and production deploys.
- A Linux VPS for always-on production mode.

## Install From Source

```bash
git clone <your-routely-repo-url> routely
cd routely
npm install
npm run build --workspace apps/cli
cd apps/cli
npm install -g .
routely --help
```

During Routely development, the CLI records the repository path in `apps/cli/dist/dev-root.json`. User workspace files are still created where you run `routely`, unless `ROUTELY_WORKSPACE_ROOT` is set.

## Local Quick Start

From a clean app workspace:

```bash
export ROUTELY_REPO=/path/to/routely
mkdir routely-demo
cd routely-demo
routely init
routely add "$ROUTELY_REPO/examples/hello-command" --name web --command "PORT=3101 ROUTELY_EXAMPLE_NAME=web ROUTELY_EXAMPLE_ROLE=frontend npm run dev" --port 3101 --health-path /health
routely add "$ROUTELY_REPO/examples/hello-command" --name api --command "PORT=3102 ROUTELY_EXAMPLE_NAME=api ROUTELY_EXAMPLE_ROLE=api npm run dev" --port 3102 --health-path /health
routely add "$ROUTELY_REPO/examples/hello-command" --name worker --command "PORT=3103 ROUTELY_EXAMPLE_NAME=worker ROUTELY_EXAMPLE_ROLE=worker npm run dev" --port 3103 --health-path /health
routely db add postgres --name postgres --port 5432
routely doctor
routely
```

Open:

- Dashboard: `http://localhost:3030`
- Web app: `http://127.0.0.1:3101`
- API app: `http://127.0.0.1:3102`
- Worker app: `http://127.0.0.1:3103`

Useful local commands:

```bash
routely ps
routely logs web
routely logs web --follow
routely restart web
routely down
```

Do not use port `20128`; that port is reserved for 9Router in the local development environment.

## Example Config

`routely init` creates a starter `routely.yml`. A minimal local workspace can look like this:

```yaml
version: 1
name: routely-demo

apps:
  - name: web
    path: ./apps/web
    driver: command
    command: npm run dev -- --port 3000
    port: 3000
    healthcheck:
      path: /health
    depends_on:
      - postgres

services:
  - name: postgres
    preset: postgres
    driver: compose
    image: postgres:16
    port: 5432
    internal: true
```

The same registry is the bridge to production. The product direction is Compose-backed local-to-VPS parity; current command apps and Dockerfile deploys are alpha foundations where verified.

## One VPS Always-On Path

This is the alpha direction for a single Linux VPS. Keep the dashboard behind private ingress or your own secure access layer while the login UI remains incomplete.

1. Install Routely from source on the server.
2. Copy `.env.example` to `.env` and set production values:

```bash
ROUTELY_ENV=production
ROUTELY_SERVER_MODE=production
ROUTELY_DATA_DIR=/var/lib/routely
ROUTELY_DAEMON_HOST=127.0.0.1
ROUTELY_DAEMON_PORT=9977
ROUTELY_DASHBOARD_PORT=3030
ROUTELY_SERVER_PUBLIC_IP=<server-ip>
```

`ROUTELY_SERVER_MODE=production` is the canonical daemon production-mode switch. The daemon exposes the lightweight production/auth contract at `/auth/status` as `production` and `requiresAuth`, plus `auth.required`/`configured`, without returning the admin token. Keep `ROUTELY_ENV=production` set for the dashboard process as well, and configure `ROUTELY_ADMIN_TOKEN` anywhere server-side code proxies production daemon requests.

3. Initialize production state and save the printed admin token somewhere private:

```bash
routely server init --data-dir /var/lib/routely
export ROUTELY_ADMIN_TOKEN=<token-from-server-init>
routely server doctor
```

4. Register and deploy through the verified alpha path.

The product direction is Compose-backed one-VPS operation. Until that path is fully verified, the current alpha bridge is a Dockerfile deploy:

```bash
routely add /path/to/dockerfile-app --name web --driver dockerfile --port 3000 --health-path /health
routely deploy web --watch
```

5. Add a domain after DNS points to the VPS:

```bash
routely domain root example.com
routely domain add web web.example.com
routely domain verify web.example.com
```

Domain routes are generated for the latest successful deployment. TLS status is conservative: `issuing` means Routely generated the HTTPS route for Traefik/ACME; Routely does not fake certificate success.

## GitHub Auto Deploy

Set GitHub App configuration on the server side only:

```bash
ROUTELY_GITHUB_APP_ID=
ROUTELY_GITHUB_PRIVATE_KEY=
ROUTELY_GITHUB_WEBHOOK_SECRET=
ROUTELY_GITHUB_CLIENT_ID=
ROUTELY_GITHUB_CLIENT_SECRET=
```

Then register metadata and connect an app:

```bash
routely github status
routely github installation add 123456 --account your-github-login
routely github repo add owner/repo --branch main --installation-id 123456
routely github connect web owner/repo --branch main
```

`POST /github/webhook` validates `X-Hub-Signature-256`, deduplicates delivery IDs, and triggers redeploys for connected repo/branch pushes through the verified deploy path.

## Development

Use npm from the repository root:

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm run test --workspace apps/cli
npm run test --workspace apps/web
npx tsc --noEmit --project apps/web/tsconfig.json
node --check apps/daemon/src/server.js
```

After changing the CLI, rebuild and reinstall the local global command:

```bash
npm run build --workspace apps/cli
cd apps/cli
npm install -g .
```

## Current Limitations

- Routely is not published to npm yet.
- Full production service installation/upgrade automation is not finished.
- The dashboard login UI is not complete; production daemon APIs require `ROUTELY_ADMIN_TOKEN`.
- Static deploys, buildpack/Nixpacks/Railpack deploys, cancel/rollback actions, external backup storage, destructive restore automation, public app catalogs, shared administration/RBAC, Kubernetes, distributed-server UX, hosted cloud products, enterprise features, email notifications, and broad VPS operations are deferred.
- GitHub App OAuth install callback, live GitHub repo/branch fetching, and commit status updates are deferred.
- Backup files are local to the configured production data directory.
- SQLite is the single-node state store; this is intentional for the MVP and constrains clustering or distributed-control-plane behavior.

## API Shape

The dashboard proxies daemon operations through same-origin `/api/*` routes. The daemon exposes endpoints for apps, deployments, domains, GitHub, env, health, metrics, databases, backups, notifications, and server status. See `docs/06-interfaces.md` and `docs/10-implementation-backlog.md` for the current map.
