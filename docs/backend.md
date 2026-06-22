# Backend Blueprint

## Backend Goal

The backend makes Routely real: it must actually run apps, verify setup, control lifecycle, attach databases, route domains, collect logs/metrics, and expose safe dashboard APIs. The backend should hide Docker/Compose details behind small module interfaces.

## Runtime Dependency

Docker and Docker Compose are required for the primary MVP path. Startup must check these dependencies before presenting apps as manageable.

## Server Session Flow

When `routely` runs:

1. Resolve runtime host workspace/data directory.
2. Run prerequisite checks: Docker, Compose, ports, permissions, data directory.
3. Start daemon/API.
4. Start dashboard server.
5. Start proxy manager.
6. Start observability collector.
7. Load app registry.
8. Auto-start enabled ready apps.
9. Register signal handlers.
10. On shutdown, stop apps started by the current session.

The CLI should delegate this flow to a server-session module instead of manually coordinating every process.

## App Registry

The registry is the backend source of truth.

Minimum app fields:

- ID.
- Name.
- Description.
- Source reference.
- Selected runtime recipe.
- Enablement state.
- Readiness state.
- Lifecycle state.
- Primary domain.
- Created/updated timestamps.

Minimum service fields:

- ID.
- App ID.
- Name.
- Kind: web, api, worker, database, cron, support.
- Compose service name.
- Container name.
- Internal port.
- Exposed route metadata.
- Status.

## Readiness State Machine

```text
draft
  -> detecting
  -> needs-configuration
  -> verifying
  -> ready
  -> running
  -> stopped

Any setup/runtime failure -> failed
ready/running/stopped -> disabled
failed/disabled -> verifying when user fixes and re-tests
```

Rules:

- `ready` requires a passed setup verification.
- `running` requires runtime inspection, not only a start command return code.
- `disabled` excludes from auto-start but keeps registry state.
- `failed` must preserve logs and next-step message.

## Source Providers

### Local Folder

Responsibilities:

- Validate path exists on runtime host.
- Ensure path is readable.
- Scan source files.
- Store source metadata.
- Avoid copying unless needed for generated runtime artifacts.

### GitHub

Responsibilities:

- List installations/repositories.
- Clone/fetch selected branch into managed storage.
- Store source metadata and commit SHA.
- Validate webhook signatures before dedupe/state mutation.
- Trigger recipe verification/redeploy from webhook events.

## Recipe Engine

Detection order:

1. Compose file.
2. Dockerfile.
3. Node/package project.
4. Manual fallback.

### Compose Recipe

- Adopt existing Compose file where possible.
- Validate services and ports.
- Ensure labels/networks can be added safely.
- Run `docker compose config` or equivalent validation.

### Dockerfile Recipe

- Build image from Dockerfile.
- Generate Compose service.
- Ask for or infer container port.
- Add health expectation when known.

### Node Recipe

- Detect package manager and scripts.
- Prefer Dockerfile generation or Compose service using a Node base image.
- Ask for start command and port when ambiguous.
- Do not assume dev command is production-safe without user confirmation.

### Manual Recipe

- Explicit fallback for unsupported stacks.
- User supplies image/build/command/port.
- Still generates Compose and must pass setup verification.

## Setup Verification

Verification steps:

1. Prepare source.
2. Generate or adopt Compose definition.
3. Validate Compose syntax.
4. Build image if needed.
5. Start service.
6. Inspect container/service state.
7. Probe expected port or health endpoint.
8. Capture logs.
9. Stop temporary verification service if appropriate.
10. Mark app ready only when checks pass.

Failure result must include:

- Phase.
- Human-readable message.
- Log excerpt.
- Suggested next action.
- Raw diagnostic reference for advanced users.

## Runtime Orchestration

The runtime orchestrator should own:

- Compose project naming.
- Compose file locations.
- Network names.
- Volume names.
- Build/start/stop/restart commands.
- Docker inspection.
- Service health.
- Logs.
- Session ownership.

Callers should not construct Docker commands directly.

## Proxy And Domains

Proxy backend responsibilities:

- Validate hostname.
- Provide DNS instructions.
- Verify DNS A record against runtime host public IP when configured.
- Generate Traefik-compatible labels/dynamic config.
- Track DNS, proxy, and TLS status separately.
- Record lightweight traffic signals where proxy access logs or middleware allow it.

Domain statuses:

- `not configured`
- `pending dns`
- `dns verified`
- `route generated`
- `tls issuing`
- `active`
- `failed`

## Databases

Database recipes for MVP:

- Postgres.
- MySQL.
- MariaDB.
- Redis.
- MongoDB.

Responsibilities:

- Generate Compose service.
- Generate credentials.
- Create persistent volume.
- Attach to app network.
- Generate env values for app.
- Provide status, health, and logs.
- Keep database internal-only by default.

Backup/restore is deferred and must not be exposed as enabled UI.

## Observability

Collect:

- Disk usage.
- CPU.
- Memory.
- Uptime.
- Docker/container status.
- App/service health.
- Log references.
- Basic traffic signals.

Retention:

- Keep samples bounded.
- Prefer aggregated or recent windows for dashboard display.
- Do not grow SQLite indefinitely.

## Logs

Log requirements:

- Tail per app/service.
- Stream where feasible.
- Associate logs with setup verification and deploy runs.
- Bound read size.
- Redact known saved secrets.
- Preserve enough failure logs for diagnosis.

## Terminal

Terminal requirements:

- Explicit user action only.
- Scoped to runtime host or app/service.
- Clear warning that terminal can mutate the server.
- Auth required on exposed/public runtime hosts.
- Not a replacement for guided setup.

## Dashboard API Facade

Browser code must call same-origin dashboard routes. The dashboard facade should:

- Authenticate browser requests where required.
- Proxy/adapt daemon behavior.
- Hide raw daemon secrets and file paths.
- Return stable DTOs for frontend states.
- Preserve actionable error messages.

## GitHub Webhook Flow

1. Receive webhook on dashboard/daemon endpoint.
2. Validate signature before dedupe mutation.
3. Match repo/branch to registered app.
4. Fetch latest source.
5. Run recipe verification or deployment flow.
6. Update run history and app state.
7. Show logs/failure in app detail.

## Backend Execution Rules

- Prefer extracting modules before adding large feature branches.
- Keep route handlers thin.
- Keep Docker/Compose command construction inside runtime modules.
- Keep storage access inside registry/store modules.
- Add tests at module seams.
- Never mark unsupported stacks ready without setup verification.
- Never expose raw secrets after save.
- Do not add backup/restore UI endpoints until the feature is safe.
