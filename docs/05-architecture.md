# Routely Architecture Reference

Status: Canonical technical reference
Owner: PM, Backend
Last updated: 2026-06-21

## Purpose

This document defines the stable architecture shape for Routely. It replaces the old draft PRD, functional spec, user-flow, roadmap, and checkpoint architecture docs.

Routely is registry-centered:

```text
routely.yml desired app/service registry
  -> normalized app spec
  -> SQLite runtime state/history
  -> runtime driver
  -> local process, Compose service, or production Docker workload
  -> CLI and dashboard operations
```

## Product Runtime Shape

Local mode:

```text
user runs `routely`
  -> active workspace is resolved
  -> routely.yml is loaded and synced
  -> local daemon starts on localhost
  -> dashboard starts
  -> services start before dependent apps
  -> command apps and Compose services run
  -> logs/status flow to CLI and dashboard
```

Production mode:

```text
CLI, GitHub webhook, or dashboard action
  -> same-origin web API or daemon API
  -> authenticated daemon operation
  -> SQLite state/job record
  -> Dockerfile deploy, proxy/domain update, env, logs, health, backup, or notification operation
```

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
| `apps/cli` | Command UX, workspace resolution entrypoints, daemon client calls, human-readable output. |
| `apps/daemon` | Long-running API, lifecycle orchestration, deploy jobs, log/metric access, state reconciliation. |
| `apps/web` | Next.js dashboard, same-origin `/api/*` route handlers, operational UI state. |
| `packages/core` | Config loading/normalization, app specs, DTO helpers, validation, shared pure logic. |
| `packages/db` | SQLite schema, migrations, repositories, transactions, persistence DTOs. |
| `packages/drivers` | Command, Compose, Dockerfile, and future runtime/build driver behavior. |
| `packages/proxy` | Traefik-compatible route config, DNS/hostname helpers, TLS/proxy state helpers. |
| `packages/github` | GitHub App helpers, webhook signature validation, event normalization. |
| `packages/presets` | Framework detection, editable defaults, database service presets, future curated templates. |

## State Model

`routely.yml` owns portable desired config:

- app/service names
- drivers
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
- backup jobs/runs
- notification delivery attempts

Secrets must not be exported to `routely.yml` by default.

## Runtime Drivers

Implemented or alpha-foundation drivers:

- `command`: local app processes.
- `compose`: local services and databases.
- `dockerfile`: first production deploy path.

Deferred drivers unless code proves otherwise:

- static deploys
- buildpack/Nixpacks/Railpack deploys
- public template marketplace deploys

## Production Operations Model

Production is one-VPS-first. The production boundary is Docker, with Traefik-compatible routing where configured.

Production operations include:

- server init/status/doctor
- authenticated daemon/API mutation paths
- Dockerfile deploys with phases and logs
- env/secrets injection and redaction
- domain/DNS/proxy/HTTPS state
- signed GitHub webhook deploy triggers
- health, metrics, and logs
- database records and local-file backups
- webhook, Discord, and Telegram notifications

## Reliability Rules

- Healthchecks gate deploy success where configured.
- Failed deploys should expose phase and logs.
- A failed deploy should not silently replace the last successful deployment where practical.
- Daemon startup should reconcile stored state with processes or containers where possible.
- Future features must remain inert or be clearly marked deferred.
