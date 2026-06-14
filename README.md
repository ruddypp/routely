# Routely

Routely is an open source, self-hosted app orchestrator for solo developers. It combines a 9Router-style single command with a Dokploy-style path toward VPS app management.

Current skeleton behavior:

- `routely` starts the daemon and dashboard.
- Dashboard runs at `http://localhost:3030`.
- Daemon runs at `http://127.0.0.1:9977`.
- SQLite state is created at `.routely/routely.db`.
- `routely init`, `routely add`, and `routely ps` manage the local app registry.
- Command-driver apps can be registered and started locally.

## Development

Use npm from the repository root:

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run build --workspace apps/cli
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
routely ps
routely
```

Do not use port `20128`; that port is reserved for 9Router in the local development environment.
