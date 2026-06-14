# Routely Technical Architecture

Version: 0.1  
Status: Draft

## 1. English Summary

Routely is a fullstack TypeScript application built around a Next.js dashboard/API, a Node.js CLI/daemon, SQLite state, Docker-based production runtime, and a Traefik-compatible reverse proxy model.

Routely should not become a runtime for every language. It should normalize apps into an app specification, then delegate execution to drivers.

## 1. Ringkasan Indonesia

Routely dibangun dengan fullstack TypeScript: Next.js untuk dashboard/API, Node.js untuk CLI/daemon, SQLite untuk state, Docker untuk production runtime, dan reverse proxy model yang mengikuti konsep Traefik/Dokploy.

Routely tidak menjadi runtime untuk semua bahasa. Routely menormalisasi app menjadi app spec, lalu menjalankannya melalui driver.

## 2. High-Level Architecture

```text
CLI (`routely`)
  ↓
Local/Server Daemon
  ↓
Next.js Dashboard + API
  ↓
SQLite App Registry
  ↓
Runtime Manager
  ├─ command driver
  ├─ compose driver
  ├─ dockerfile driver
  ├─ buildpack/railpack/nixpacks driver
  └─ static driver
  ↓
Processes / Docker containers
  ↓
Proxy Manager
  ↓
localhost ports or production domains
```

## 3. Components

### CLI

- npm-distributed command: `routely`.
- Starts daemon and all apps by default.
- Provides direct commands for init, add, up, down, ps, logs, deploy, domain, backup, and server install helpers.

### Daemon

- Long-running Node.js process.
- Owns local app lifecycle.
- Coordinates production runtime state.
- Streams logs and metrics.
- Stops child processes on local shutdown.

### Dashboard/API

- Built with Next.js.
- Provides dashboard and API routes.
- Local mode can use local token or first-run auth.
- Production mode requires authentication.

### SQLite State Store

- Stores app registry, env metadata, deployment history, domains, health, metrics samples, backup jobs, GitHub installations, and audit events.
- Single-node-first.
- Export/import support recommended for portability.

### Runtime Manager

- Converts app specs into driver actions.
- Handles dependency ordering.
- Starts, stops, restarts, rebuilds, redeploys, and checks health.

### Drivers

- `command`: local process runner.
- `compose`: Docker Compose for multi-service apps and databases.
- `dockerfile`: build and run Dockerfile apps.
- `buildpack`: Nixpacks/Railpack/buildpack-compatible detection and build.
- `static`: build static output and serve through optimized static container/proxy.

### Proxy Manager

- Uses a Traefik-compatible production model following Dokploy's direction.
- Generates labels or dynamic config for routes.
- Supports wildcard and per-app domains.
- Handles HTTP to HTTPS redirects and TLS certificate issuance.

### GitHub Integration

- Use GitHub App as primary integration.
- OAuth may be used for login later.
- Supports repo selection, branch selection, webhooks, private repositories, and deploy status.

## 4. Local Mode

Local defaults:

- `routely` equals `routely up`.
- Start dashboard, daemon, proxy if enabled, and all registered apps.
- Preserve original app ports such as `3000`, `5173`, and `8000`.
- Detect port conflicts and suggest alternatives before start.
- Stop child processes when Routely stops.
- Support Docker Compose for local databases and multi-service apps.

Local routing:

```text
http://localhost:3000 -> Next.js app
http://localhost:5173 -> Vite app
http://localhost:8000 -> Laravel/FastAPI/Django app
http://localhost:<dashboard_port> -> Routely dashboard
```

Optional local domains may be added later:

```text
web.localhost -> 127.0.0.1:3000
api.localhost -> 127.0.0.1:8000
```

## 5. Production Mode

Production defaults:

- Docker is the primary runtime.
- GitHub deployment clones/pulls source on the VPS or in a builder container.
- Build produces an image or static artifact.
- App runs as a container or Compose stack.
- Domains route through reverse proxy.
- HTTPS is automatic.
- Containers should survive Routely dashboard/API restarts where possible, following Dokploy's operational model.

Production routing:

```text
https://web.example.com -> web container
https://api.example.com -> api container
https://n8n.example.com -> compose service
```

## 6. Multi-Server Strategy

MVP should remain single-server-first. Multi-server should be represented in the data model as a `servers` table and a future `agent` concept, but the public UX can mark it beta or hidden.

Future multi-server model:

```text
Primary dashboard/control plane
  ↓
Server agents
  ├─ VPS A
  ├─ VPS B
  └─ VPS C
```

## 7. Recommended Repository Structure

```text
routely/
  apps/
    web/                 # Next.js dashboard/API
    cli/                 # Node.js CLI
    daemon/              # Runtime daemon
  packages/
    core/                # app spec, driver interfaces, shared logic
    db/                  # SQLite schema and migrations
    drivers/             # command, compose, dockerfile, buildpack, static
    github/              # GitHub App integration
    proxy/               # Traefik config/labels helpers
    presets/             # framework/database presets
  docs/
  examples/
```

For implementation simplicity, `apps/web`, `apps/cli`, and `apps/daemon` may start in one Next.js/Node workspace and split later.

## 8. Reliability Defaults

- Production apps should have restart policies.
- Healthchecks should gate deploy success.
- Deploy failures should not destroy the last known working version when rollback metadata exists.
- Local process failures should show as crashed and preserve logs.
- Daemon restart should reload state from SQLite and Docker.

