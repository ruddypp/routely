# Routely

Routely is an open source, self-hosted app orchestrator for solo developers. It combines a 9Router-style single command with a Dokploy-style path toward VPS app management.

Current skeleton behavior:

- `routely` syncs `routely.yml`, then starts the daemon, dashboard, and command apps.
- Dashboard runs at `http://localhost:3030` (dark theme, live daemon status polling).
- Daemon runs at `http://127.0.0.1:9977`.
- SQLite state is created at `.routely/routely.db` inside the active workspace.
- `routely init`, `routely sync`, `routely add`, and `routely ps` manage the local app registry.
- `routely.yml` apps/services are loaded into the registry on `init`, `sync`, `up`, and daemon boot.
- Command-driver apps can be registered and started locally.
- Command-driver apps start in `depends_on` order from `routely.yml`; dependency cycles are rejected before startup.
- Command app logs are persisted under `.routely/logs/<app>.log`.
- `routely down`, `routely logs`, `routely restart`, and `routely doctor` provide local lifecycle controls.
- CLI commands and daemon boot reconcile stale runtime PIDs so old state does not leave apps marked running.
- The global CLI uses the current working directory as the workspace by default. `ROUTELY_WORKSPACE_ROOT` can override it for tests or scripted runs.

## Architecture

```text
routely.yml ──► CLI / daemon ──► SQLite (.routely/routely.db)
                                   ▲
Dashboard (Next.js, :3030) ──► /api/* route handlers ──► daemon HTTP (:9977)
```

The browser only ever calls the dashboard's own same-origin `/api/*` routes, which
proxy to the daemon. The daemon stays bound to `127.0.0.1`.

The CLI keeps the Routely installation root separate from the user workspace root:

- `ROUTELY_REPO_ROOT` points to the Routely monorepo/install root during local development.
- `ROUTELY_WORKSPACE_ROOT` points to the app workspace whose `routely.yml` and `.routely` state should be used.
- Without `ROUTELY_WORKSPACE_ROOT`, the workspace root is the directory where `routely` is invoked.

## Development

Use npm from the repository root:

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run build --workspace apps/cli
npm run test --workspace apps/cli
npm run lint
```

After changing the CLI, rebuild and reinstall the local global command:

```bash
cd apps/cli
npm run build
npm i -g .
```

## CLI

```bash
routely init
routely add /path/to/app --name web --command "npm run dev" --port 3000
routely sync   # load routely.yml into the registry
routely ps
routely logs web --follow
routely restart web
routely down
routely doctor
routely
```

### Daemon HTTP endpoints

```text
GET    /health        daemon status + app list
GET    /apps          list registered apps
POST   /apps          upsert an app
GET    /apps/:id      fetch one app
DELETE /apps/:id      remove an app
```

The dashboard mirrors these under `/api/health` and `/api/apps[/:id]`.

Do not use port `20128`; that port is reserved for 9Router in the local development environment.
