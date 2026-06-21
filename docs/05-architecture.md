# Routely Architecture Reference

Status: Canonical technical reference
Owner: PM, Backend
Last updated: 2026-06-22

## Purpose

This document defines Routely's stable architecture shape for public alpha planning. It describes the intended Compose-first, dashboard-first model while staying honest about current implementation bridges that Backend must verify before public docs claim them.

Routely is registry-centered:

```text
routely.yml desired app/service registry
  -> normalized app spec with enablement and runtime metadata
  -> SQLite runtime state/history
  -> runtime driver
  -> local process, Compose service, or production Docker/Compose workload
  -> dashboard-first and CLI operations
```

## Product Runtime Shape

Local mode:

```text
solo operator opens dashboard or runs `routely`
  -> active workspace is resolved
  -> routely.yml is loaded and synced
  -> local daemon starts on localhost
  -> dashboard starts
  -> bulk start selects enabled apps/services
  -> dependencies start before dependent apps
  -> command apps and Compose services run where implemented
  -> logs/status/health flow to CLI and dashboard
```

One-VPS mode:

```text
dashboard action, CLI action, or GitHub webhook
  -> same-origin web API or authenticated daemon API
  -> SQLite state/job record
  -> Compose/Docker workload, proxy/domain update, env, logs, health, backup, or notification operation
  -> dashboard diagnosis through real state, logs, deploy history, and health
```

The target production model is Compose-backed app operation on one VPS. Existing Dockerfile deployment foundations are implementation bridges until Backend verifies production Compose parity.

## Browser Boundary

Browser code must not call the daemon directly.

Allowed path:

```text
browser -> apps/web /api/* route handler -> daemon -> packages/*
```

This boundary matters for auth, token handling, same-origin behavior, and production safety.

## Package Ownership

| Area | Ownership |
| --- | --- |
| `apps/cli` | Bootstrap commands, workspace resolution entrypoints, daemon client calls, human-readable diagnostics, and scriptable fallback paths. |
| `apps/daemon` | Long-running API, lifecycle orchestration, deploy jobs, log/metric access, state reconciliation, and production trust boundaries. |
| `apps/web` | Next.js dashboard, same-origin `/api/*` route handlers, app setup/editing, operational UI state, and honest disabled/deferred states. |
| `packages/core` | Config loading/normalization, app specs, enablement, DTO helpers, validation, and shared pure logic. |
| `packages/db` | SQLite schema, migrations, repositories, transactions, persistence DTOs, and bounded operational history. |
| `packages/drivers` | Command, Compose, Dockerfile bridge, and future runtime/build driver behavior. |
| `packages/proxy` | Traefik-compatible route config, DNS/hostname helpers, TLS/proxy state helpers. |
| `packages/github` | GitHub App helpers, webhook signature validation, event normalization. |
| `packages/presets` | Framework detection, editable defaults, and database service presets. Public app catalogs are deferred. |

## State Model

`routely.yml` owns portable desired config:

- app/service names
- enablement state
- drivers and Compose metadata
- local paths and commands
- ports
- dependencies
- non-secret env defaults
- healthcheck declarations
- domains and source intent

SQLite owns runtime and generated state:

- app/runtime status
- deployment history and logs
- generated container IDs, ports, routes, and proxy state
- GitHub installation/repo/delivery metadata
- env secret values and secret metadata where implemented
- health and metric samples
- database records plus backup jobs/runs
- notification delivery attempts

Secrets must not be exported to `routely.yml` by default. Raw stored secrets must not be returned to the dashboard after save.

## Runtime Drivers

Implemented or alpha-foundation drivers:

- `command`: local app processes and current local demo bridge.
- `compose`: local services/databases and the target common model for local-to-VPS operation.
- `dockerfile`: current production deploy foundation and bridge while production Compose parity is hardened.

Deferred drivers unless code proves otherwise:

- static deploys
- buildpack/Nixpacks/Railpack deploys
- public app catalog deploys

## Production Operations Model

Production is one-VPS-first. The production boundary is Docker/Compose, with Traefik-compatible routing where configured.

Production operations include:

- server init/status/doctor
- authenticated daemon/API mutation paths
- deploys with phases, deploy history, and logs
- env/secrets injection and redaction
- domain/DNS/proxy/HTTPS state
- signed GitHub webhook redeploy triggers
- health, metrics, and logs
- database records and local-file backups
- webhook, Discord, and Telegram notifications

The dashboard should expose these as simple operational surfaces inspired by Dokploy but keep the experience light and solo-operator focused.

## Reliability Rules

- Bulk start starts enabled resources and skips disabled resources without deleting them.
- Per-app stop changes the current runtime state, not app enablement.
- Healthchecks gate deploy success where configured.
- Failed deploys should expose phase and logs.
- A failed deploy should not silently replace the last successful deployment where practical.
- Daemon startup should reconcile stored state with processes or containers where possible.
- Generated proxy config must not be presented as verified DNS, active routing, or certificate success.
- Future features must remain inert or be clearly marked deferred.
