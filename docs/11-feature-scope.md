# Routely Feature Scope

Status: Canonical feature-scope reference
Owner: PM
Last updated: 2026-06-21

## Purpose

This replaces the old scattered `docs/feature-specs/*` drafts. It describes what each feature area means for public alpha and what is deferred.

## Local Runner

Alpha scope:

- initialize workspace config/state
- register command apps
- register Compose-backed database services
- start all enabled local workloads with `routely`
- start dependencies before dependent apps
- detect port conflicts where practical
- show status and logs through CLI and dashboard
- stop managed local workloads with `routely down` or process exit where practical

Deferred:

- broad cross-platform guarantees beyond tested Linux/macOS paths
- sophisticated process supervisor behavior

## Dashboard

Alpha scope:

- overview with readiness/status/next action
- apps/services with lifecycle controls and URLs
- deployments with phases and logs
- domains with DNS/proxy/HTTPS state
- GitHub connection/delivery/deploy state
- env/secrets metadata with redaction
- logs, health, metrics, databases, backups, notifications/settings where backed by real data

Rules:

- browser code uses same-origin `/api/*`
- no mock-only controls should appear implemented
- future actions must be disabled, hidden, or marked deferred

## Production Deploy

Alpha scope:

- Dockerfile deploy path first
- deployment phases and logs
- env injection
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

## Logs, Health, Metrics

Alpha scope:

- local app logs under `.routely/logs`
- deployment logs
- app health state and healthcheck records
- narrow metric samples for demo diagnosis

Deferred:

- full observability stack
- long-retention metrics product

## Databases And Backups

Alpha scope:

- common database presets for local Compose-backed services
- production database records/foundations
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

## Templates

Deferred from public alpha.

Future template behavior must generate editable registry config and route through normal deploy, env, domain, health, logs, backups, and notification systems.
