# Routely Feature Scope

Status: Canonical feature-scope reference
Owner: PM
Last updated: 2026-06-22

## Purpose

This describes what each feature area means for public alpha and what is deferred. The alpha is Compose-first, dashboard-first, one-VPS, and solo-operator focused.

## App Registry And Enablement

Alpha scope:

- initialize workspace config/state
- register and edit managed apps/services
- preserve `enabled` state in config, DB, API DTOs, CLI output, and dashboard state where implemented
- keep disabled apps registered and editable
- skip disabled apps during bulk start
- distinguish stop-now from disable-for-future-starts

Deferred:

- shared approval workflows
- organization-level administration

## Local Runner

Alpha scope:

- register command apps
- register Compose-backed database services
- start all enabled local workloads with `routely`
- start dependencies before dependent apps
- detect port conflicts where practical
- show status, enablement, and logs through CLI and dashboard
- stop managed local workloads with `routely down`, per-app stop, or process exit where practical

Deferred:

- broad cross-platform guarantees beyond tested Linux/macOS paths
- sophisticated process supervisor behavior

## Dashboard

Alpha scope:

- overview with readiness/status/next action
- app/service creation and editing where implemented
- Start All and per-app stop/disable controls where API support is verified
- deployments with phases, deploy history, and logs
- domains with DNS/proxy/HTTPS state
- GitHub connection/delivery/deploy state
- env/secrets metadata with redaction
- logs, health, metrics, databases, backups, notifications/settings where backed by real data

Rules:

- browser code uses same-origin `/api/*`
- no mock-only controls should appear implemented
- generated, pending, failed, disabled, deferred, and active states must be visually and textually distinct
- future actions must be disabled, hidden, or marked deferred

## Production Deploy And One-VPS Operations

Alpha scope:

- one verified app deploy/operation path on one VPS
- Compose-backed production parity as the target model
- Dockerfile deploy path as a current bridge where verified
- deployment phases, deploy history, and logs
- env injection and redaction
- healthcheck/container-running checks where configured
- failed deploy phase and logs
- latest successful deployment remains identifiable where practical

Deferred:

- full rollback/cancel orchestration
- static/buildpack/Nixpacks/Railpack deploy drivers unless verified
- preview deployments

## Domain And HTTPS

Alpha scope:

- root domain and app hostname records
- DNS verification against server public IP where possible
- Traefik-compatible proxy route generation
- conservative TLS state

Rules:

- generated config is not certificate success
- generated config is not proof that DNS points at the VPS
- internal services/databases are not publicly exposed by default

## GitHub Integration

Alpha scope:

- server-side GitHub App configuration status
- installation/repo/branch metadata
- app-to-repo connection
- signed push webhook validation
- delivery dedupe where practical
- auto-deploy only for configured repo/branch
- failure logs shared with manual deploy path

Deferred:

- OAuth install callback
- live repo/branch fetching
- commit status updates
- preview deployments

## Env And Secrets

Alpha scope:

- create/list/update/delete app env metadata where implemented
- mark secrets
- hide raw secret values after save
- inject production env into deploys where implemented
- mark restart/redeploy-needed state where implemented
- redact known secret values from logs where practical

## Logs, Deploy History, Health, Metrics

Alpha scope:

- local app logs under `.routely/logs`
- deployment logs
- deploy phases and latest status
- app health state and healthcheck records
- narrow metric samples for demo diagnosis

Deferred:

- full observability stack
- long-retention metrics product

## Databases And Backups

Alpha scope:

- common database presets for local Compose-backed services
- production database records/foundations
- internal-only database posture by default
- local-file backup jobs and runs where implemented
- retention for known successful backup files where implemented

Deferred:

- external backup storage
- destructive restore automation
- cross-server backup orchestration

## Notifications

Alpha scope:

- generic webhook
- Discord webhook
- Telegram bot/chat target
- delivery attempts
- deploy/backup event triggers where implemented
- public target redaction
- outbound safety validation where implemented

Deferred:

- email notifications
- complex alert routing/escalation

## App Catalog

Deferred from public alpha.

Any future app catalog behavior must generate editable registry config and route through normal deploy, env, domain, health, logs, backups, and notification systems.
