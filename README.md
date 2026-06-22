# Routely

Routely is a lightweight app server and control plane for solo developers. Run `routely` on any machine and that machine becomes the server for your managed apps: laptop, desktop, homelab, or VPS.

The product goal is simple:

```text
Run one command. Open one dashboard. Start every enabled app. Control each app independently. Monitor the host and every app. Add domains, databases, logs, env, and deployment flows without leaving Routely.
```

Routely follows a placement-neutral model:

- If `routely` runs on your PC, your PC is the runtime host.
- If `routely` runs on a VPS, the VPS is the runtime host.
- The same dashboard and app registry model applies in both placements.
- Apps started by the current Routely server session stop when that session stops.

## Current Product Direction

Routely is being reset around a new MVP blueprint:

- Docker and Docker Compose are required for the primary MVP runtime.
- Compose is the primary internal runtime model for apps, services, databases, proxy routes, logs, and monitoring.
- The UI is a lightweight operations dashboard inspired by 9Router's simplicity and Dokploy's practical app-management model.
- The first usable product must actually run apps, not only describe concepts.

Read the canonical blueprint first:

1. `docs/README.md`
2. `docs/blueprint.md`
3. `docs/architecture.md`
4. `docs/frontend.md`
5. `docs/backend.md`
6. `docs/implementation-slices.md`
7. `docs/verification.md`

## MVP Promise

A solo developer can install Routely, run `routely`, add apps from a local folder or connected GitHub repository, verify the setup, auto-start every enabled app, control each app, attach databases, route domains, inspect logs, and monitor host/app health from one dashboard.

## MVP Non-Goals

- No Kubernetes.
- No multi-node cluster orchestration.
- No teams, RBAC, billing, or enterprise audit workflows.
- No backup/restore UI until backup and restore can be implemented safely.
- No full APM, tracing, alerting, or analytics in the first usable slice.
- No claim of universal stack support without an executable recipe and setup verification.

## Development

Install dependencies:

```bash
npm install
```

Common checks:

```bash
npm run lint --workspaces --if-present
npm run test --workspaces --if-present
npm run build --workspaces --if-present
```

Before editing `apps/web`, read the relevant Next.js guide under `node_modules/next/dist/docs/` because this repository intentionally uses a Next.js version whose conventions may differ from memory.

## Agent Workflow

For every implementation checkpoint:

- Work from the blueprint docs.
- Keep changes small and module-scoped.
- Verify with the narrowest relevant check first.
- Commit only owned files.
- Push after committing when the user has requested push-on-change.
