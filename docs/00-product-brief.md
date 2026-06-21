# Routely Product Brief

Status: Canonical PM source of truth
Owner: PM
Last updated: 2026-06-22

## Product Vision

Routely is an open source, self-hosted, dashboard-first control plane for solo developers who want the same app operations model locally and on one VPS.

The product promise is:

```text
One dashboard to register and operate apps.
One Start action for every enabled app.
One Compose-backed model from laptop to VPS.
```

Routely's product arc is deliberately narrow:

1. Local and one-VPS first: the same app registry should make sense on a laptop and on one Linux VPS.
2. Compose-first runtime: managed apps should converge on a Compose-backed model, with command apps and Dockerfile deploys treated as alpha foundations or bridges where implementation already exists.
3. Dashboard-first operation: normal setup, app editing, Start All, per-app stop/disable, deploy setup, and diagnosis should be possible from the dashboard; the CLI remains a bootstrap and power-user path.
4. Dokploy-inspired production surfaces: domain/proxy, env/secrets, databases/backups, logs, deploy history, and health checks are part of the core operational plan.
5. Solo-operator scope: the alpha optimizes for one developer managing their own apps, not shared administration workflows.

## Target User

The primary and only public-alpha user is a solo developer who runs many personal, client, experimental, or small production apps.

They are comfortable with a terminal, GitHub, Docker, Compose, DNS, and a VPS, but they do not want every app to require a separate pile of shell scripts, reverse proxy files, env handling, deploy commands, log locations, backup jobs, and health checks.

The public alpha should not optimize for organizations, shared workspaces, approval flows, or enterprise administration. Those audiences can be reconsidered only after the solo local-to-VPS loop is trustworthy.

## Problem

Solo developers often manage local and production app lifecycles as separate worlds:

- Local apps run in many terminals with remembered ports.
- Local databases and services are started separately.
- Production apps require repeated VPS setup for Docker/Compose, domains, HTTPS, env, logs, health checks, backups, and GitHub deploy hooks.
- Failure diagnosis spans terminal output, container logs, GitHub deliveries, proxy config, DNS state, and the VPS shell.

The core problem is not only deployment. The user needs one registry and one dashboard-first control surface from local development through one small production VPS.

## Positioning

Routely is a Compose-first app runner that becomes a one-VPS deployment and operations dashboard.

Positioning against references:

| Reference | What Routely uses | What Routely must not copy |
| --- | --- | --- |
| 9Router | One memorable command, local daemon/server, predictable dashboard, fast local status loop, and a lightweight feel. | 9Router's AI-router domain or product surface. Routely is not an AI routing tool. |
| Dokploy | Single-VPS operations: Docker/Compose deploys, domains, HTTPS, GitHub integration, env, logs, health, metrics, databases, backups, and notifications. | Dokploy's full breadth or app-catalog shape. Routely alpha is not a broad PaaS clone. |

Routely should feel like Dokploy's useful operational surfaces reduced to a lighter 9Router-style loop for one operator.

## What Routely Is

- An open source, self-hosted tool for solo developers.
- A dashboard-first app/service registry centered on `routely.yml` plus runtime state.
- A local runner and one-VPS control plane that should use a Compose-backed mental model wherever practical.
- A Start All workflow for enabled apps, with per-app stop and disable controls so one app can be excluded without deleting it from the registry.
- A dashboard and CLI for app lifecycle, deploys, domain/proxy/HTTPS state, GitHub webhook deploys, env/secrets, logs, deploy history, health, metrics, databases, backups, and notifications where implemented.
- A system that must keep unsupported controls hidden, disabled, or explicitly marked deferred rather than showing mock success.

## What Routely Is Not

- Not a public PaaS or managed cloud service.
- Not Kubernetes.
- Not a multi-tenant enterprise platform.
- Not a public multi-server control plane for MVP.
- Not an app-catalog-first product.
- Not a replacement for understanding that connected repos, local commands, and containers can execute code.
- Not a broad VPS administration tool for patching the OS, configuring firewalls, or managing every server concern.

## MVP Promise

The MVP is accepted through three demos:

1. Local demo: register three apps and one database, use Start All to run every enabled app, then stop or disable one app individually without removing it from the registry.
2. One-VPS demo: deploy and operate one Compose-backed app on one VPS with domain/proxy, env/secrets, logs, deploy history, health, database, and backup state represented honestly.
3. GitHub demo: push to the configured branch, trigger redeploy for the intended app, and inspect failure phase/logs when a deploy breaks.

Everything in the alpha should make these demos clearer, safer, more repeatable, or easier to diagnose.

## Implementation Facts To Preserve

These facts were checked against the current docs and repo structure during the Compose-first replan:

- The repo is an npm workspace with `apps/cli`, `apps/daemon`, `apps/web`, and packages for core config, SQLite DB, drivers, GitHub, proxy, and presets.
- The CLI package exposes the `routely` binary.
- The dashboard is a Next.js app. Browser code must call same-origin `/api/*` route handlers, not the daemon directly.
- The daemon has endpoints for apps, deployments, domains/proxy, GitHub, env, health, metrics, databases, backups, notifications, and server status.
- Local mode uses SQLite state under `<workspace>/.routely/routely.db` and logs under `<workspace>/.routely/logs`.
- Production mode uses admin token auth for private daemon actions.
- The config and DB already represent app enablement; the local `routely` path starts enabled `command` and `compose` apps.
- Current alpha foundations include command apps, Compose-backed local services/databases, Dockerfile deploys, Traefik-compatible route generation, signed GitHub webhooks, env/secrets redaction, health/metrics/logs, local-file backups, and webhook/Discord/Telegram notifications.

Treat these as implementation facts to verify before changing behavior, not as a claim that every surface is public-alpha hardened or fully dashboard-first.

## Non-Goals

Public alpha non-goals:

- Public app catalog or user-submitted app catalog.
- Teams, RBAC, organizations, billing, or enterprise audit workflows.
- Kubernetes.
- Public multi-server UX.
- Multi-region infrastructure.
- Enterprise SSO.
- Advanced external backup storage and destructive restore automation.
- Preview deployments per PR.
- Full custom runtime implementations for every framework.
- Email notifications as a default channel.
- Broad VPS operations outside Routely-managed apps/services.
- Full rollback/cancel orchestration unless already implemented and verified for the demo path.
