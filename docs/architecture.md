# Routely Architecture Blueprint

## Architecture Goal

Routely needs deep modules: small interfaces with real behavior behind them. The current code already proves useful alpha foundations, but several files have grown too large and mix concerns that should be separated before the MVP grows.

Observed large files during the reset:

- `apps/web/src/app/dashboard-client.tsx` — dashboard UI, state, operations, and rendering are too coupled.
- `apps/daemon/src/server.js` — daemon routes, orchestration, persistence, GitHub, proxy, deployments, backups, notifications, and metrics are too coupled.
- `apps/cli/src/index.ts` — CLI parsing, bootstrap, runtime lifecycle, config, database commands, and process management are too coupled.
- `packages/db/src/index.js` — schema, migrations, queries, and domain-specific storage operations are too coupled.

The MVP reset should make the change easy first: split by module seams, then implement features vertically.

## Runtime Shape

```text
routely command
  └─ RoutelyServerSession
       ├─ Daemon/API
       ├─ Dashboard server
       ├─ Proxy manager
       ├─ Runtime orchestrator
       ├─ Observability collector
       ├─ Logs gateway
       └─ Terminal gateway

App registry
  ├─ Managed apps
  ├─ Managed services
  ├─ Runtime recipes
  ├─ Sources
  ├─ Domains
  ├─ Env/secrets
  ├─ Databases
  ├─ Health/metrics/log references
  └─ Readiness state

Docker/Compose runtime
  ├─ Generated/adopted Compose projects
  ├─ App services
  ├─ Database services
  ├─ Proxy labels/config
  ├─ Volumes
  └─ Networks
```

## Primary Module Seams

### RoutelyServerSession

Purpose: Start and stop the full server session on the current runtime host.

Interface responsibilities:

- Check host prerequisites.
- Start daemon/API.
- Start dashboard server.
- Start proxy layer.
- Start observability collection.
- Auto-start enabled ready apps.
- Stop session-scoped apps during shutdown.
- Return session status for CLI and dashboard.

This module hides process orchestration from CLI callers. The CLI should not know how daemon, dashboard, proxy, and apps are individually started.

### AppRegistry

Purpose: Own app registry state and lifecycle-safe mutations.

Interface responsibilities:

- Create/update/delete managed apps.
- Create/update/delete managed services.
- Store source metadata.
- Store runtime recipe metadata.
- Store enablement and readiness state.
- Store domain/env/database relationships.
- Enforce state transitions.

Important states:

- `draft`
- `detecting`
- `needs-configuration`
- `verifying`
- `ready`
- `running`
- `stopped`
- `failed`
- `disabled`

The registry should prevent an app from becoming `ready` unless setup verification passes.

### SourceProvider

Purpose: Fetch or locate app source for recipe detection.

Adapters:

- `LocalFolderSourceProvider`
- `GitHubSourceProvider`

Interface responsibilities:

- Validate source access.
- Resolve source location on the runtime host.
- Fetch or update source when needed.
- Return metadata for display and deployment history.

### RecipeEngine

Purpose: Convert app source into an executable recipe.

Detection order:

1. Existing Compose file.
2. Dockerfile.
3. Node/package project.
4. Manual recipe fallback.

Interface responsibilities:

- Scan source.
- Produce recipe candidates with confidence and required fields.
- Generate or adopt Compose-backed service definitions.
- Explain missing configuration.
- Run setup verification through RuntimeOrchestrator.

A recipe is not ready because it was detected; it is ready only after verification.

### RuntimeOrchestrator

Purpose: Control Compose-backed app and database services.

Interface responsibilities:

- Write or adopt Compose projects.
- Build images.
- Start services.
- Stop services.
- Restart services.
- Inspect service status.
- Read health and container state.
- Stream logs.
- Enforce session-scoped runtime behavior.

This module owns Docker/Compose command details. Dashboard routes and CLI commands should call this module, not shell out directly.

### ProxyManager

Purpose: Manage domains, DNS verification, proxy route generation, HTTPS state, and traffic signals.

Interface responsibilities:

- Validate hostnames.
- Explain required DNS records.
- Verify DNS when public host IP is configured.
- Generate Traefik-compatible labels or dynamic config.
- Track route and certificate state.
- Record lightweight traffic signals.

### DatabaseManager

Purpose: Create and attach database services from supported recipes.

Interface responsibilities:

- Create database recipes for Postgres, MySQL, MariaDB, Redis, and MongoDB.
- Generate credentials and connection env values.
- Attach database service to app network.
- Start/stop database services.
- Stream logs and health.
- Hide backup/restore until implemented safely.

### EnvSecretStore

Purpose: Manage app environment values and stored secrets.

Interface responsibilities:

- Store plain env values.
- Store secret values with masked display after save.
- Generate env values for attached databases.
- Redact secrets in logs where possible.
- Prevent raw secret exposure in public DTOs.

### ObservabilityCollector

Purpose: Collect lightweight host/app signals for the operations dashboard.

Interface responsibilities:

- Host disk, CPU, memory, uptime.
- App/service status.
- Health samples.
- Basic Docker stats where reliable.
- Basic traffic samples from proxy routes.
- Bounded retention.

This is not an APM module.

### LogsGateway

Purpose: Provide safe log access.

Interface responsibilities:

- Tail logs per app/service.
- Stream logs where possible.
- Associate logs with setup runs, deployments, and app lifecycle events.
- Redact known secret values.
- Bound log reads.

### TerminalGateway

Purpose: Provide scoped terminal sessions for troubleshooting.

Interface responsibilities:

- Start terminal sessions scoped to runtime host or app/service.
- Require explicit user action.
- Respect auth/security boundaries.
- Avoid using terminal as the primary happy-path workflow.

### DashboardBFF

Purpose: Same-origin route facade between browser and daemon.

Interface responsibilities:

- Browser code calls only dashboard same-origin routes.
- Routes validate auth/session expectations.
- Routes adapt daemon responses into UI-friendly DTOs.
- Browser code never calls the private daemon directly.

## Data Model Areas

The implementation can use SQLite for single-runtime-host MVP state. Group storage by domain area even if the physical database is one file.

Required areas:

- `server_state` — initialized state, public host IP, auth requirements, first-run metadata.
- `apps` — app identity, status, enablement, readiness, source reference.
- `services` — service identity, app relationship, runtime type, status, ports.
- `sources` — local folder or GitHub source metadata.
- `recipes` — selected recipe, generated Compose references, verification status.
- `domains` — hostname, DNS status, proxy status, TLS status.
- `env_values` — plain and secret env values, masked metadata.
- `databases` — database recipe, credentials metadata, volume/network references.
- `runs` — setup verification and deployment runs.
- `logs` — log file references and run associations.
- `health_samples` — app/service health samples with bounded retention.
- `metric_samples` — host/app/proxy samples with bounded retention.
- `github` — installations, repositories, webhooks, delivery dedupe.

## API Shape

Dashboard API routes should be grouped around user tasks, not storage tables.

Recommended route groups:

- `/api/server/status`
- `/api/server/doctor`
- `/api/server/metrics`
- `/api/apps`
- `/api/apps/:appId`
- `/api/apps/:appId/actions/start`
- `/api/apps/:appId/actions/stop`
- `/api/apps/:appId/actions/restart`
- `/api/apps/:appId/actions/enable`
- `/api/apps/:appId/actions/disable`
- `/api/apps/:appId/services`
- `/api/apps/:appId/logs`
- `/api/apps/:appId/health`
- `/api/apps/:appId/domains`
- `/api/apps/:appId/env`
- `/api/apps/:appId/databases`
- `/api/apps/:appId/terminal`
- `/api/setup/sources/local`
- `/api/setup/sources/github`
- `/api/setup/recipes/detect`
- `/api/setup/recipes/verify`
- `/api/databases`
- `/api/domains/verify`
- `/api/github/installations`
- `/api/github/repositories`
- `/api/github/webhook`

Route handlers can map to existing daemon routes during migration, but the UI contract should stabilize around task routes.

## Refactor Strategy

### Rule 1: Prefactor before feature work

Before adding UI-heavy features, extract current behavior into modules with stable interfaces. Avoid rewriting everything at once.

### Rule 2: Vertical slices after seams exist

Each implementation slice should cut through schema, daemon/API, dashboard route, UI, and verification when applicable.

### Rule 3: No fake readiness

Mock UI can exist only as a temporary frontend fixture. Product UI must never show an app as ready/running unless backend state proves it.

### Rule 4: Keep caller interfaces small

For example, UI should call `startApp(appId)`, not know Compose command arguments. Daemon routes should call `RuntimeOrchestrator.startApp`, not know Docker CLI details.

### Rule 5: Preserve current working behavior while moving it

Existing CLI and daemon behavior should be moved behind modules before being replaced. Avoid breaking all flows for a clean architecture rewrite.

## Security Boundaries

- Browser code calls dashboard same-origin routes only.
- Private daemon must not be directly exposed to browsers or public networks without auth.
- Local folder paths and terminal access are privileged operations.
- GitHub webhook validation must happen before dedupe or state mutation.
- Env/secrets must not be returned raw after save.
- Logs must avoid exposing known secret values where possible.
- Database services are internal-only by default.
- Domain/proxy generation must validate hostnames and avoid config injection.
- Destructive actions require explicit confirmation.

## Placement-Neutral Runtime Rules

- Do not branch product concepts into “local product” and “VPS product”.
- Branch only where the runtime host capabilities differ: public IP, DNS, HTTPS, permissions, firewall, or package installation.
- The dashboard should say “runtime host” or “server” instead of implying VPS-only operation.
- Public domain flows require a public host; local-only hostnames are optional convenience.

## Module Ownership For Specialists

Frontend specialists own UI modules, route consumption, visual state, accessibility, and copy. They must not invent backend states.

Backend specialists own registry, runtime, recipe, proxy, database, observability, logs, terminal, GitHub, and route contracts. They must preserve UI-facing states and failure messages.

QA specialists verify the flows in `verification.md` and report findings without committing reports unless acting as lead.

Security specialists verify trust boundaries and report findings without committing reports unless acting as lead.
