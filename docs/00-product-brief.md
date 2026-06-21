# Routely Product Brief

Status: Canonical PM source of truth
Owner: PM
Last updated: 2026-06-21

## Product Vision

Routely is an open source, self-hosted app runner and single-VPS deployment platform for solo developers.

The product promise is:

```text
One command local.
One VPS always-on.
One dashboard to deploy and operate every app.
```

Routely's product arc is deliberately narrow:

1. Local first: `routely` starts every registered local app and service with one command.
2. VPS second: the same app/service registry can run always-on on one Linux VPS.
3. Deploy third: Dockerfile deploys, domains, HTTPS, GitHub webhooks, env/secrets, logs, health, metrics, databases, backups, and notifications automate production operations.
4. Templates later: curated templates may generate editable registry entries after the local and VPS loops are trustworthy.

## Target User

The primary user is a solo developer who runs many personal, client, experimental, or small production apps.

They are comfortable with a terminal, GitHub, Docker, and a VPS, but they do not want every app to require a separate pile of shell scripts, reverse proxy files, env handling, deploy commands, log locations, backup jobs, and monitoring setup.

Secondary users can come later: small teams, agencies, and open source maintainers. The public alpha should stay optimized for one operator managing one VPS.

## Problem

Solo developers often manage local and production app lifecycles as separate worlds:

- Local apps run in many terminals with remembered ports.
- Local databases and services are started separately.
- Production apps require repeated VPS setup for Docker, domains, HTTPS, env, logs, health checks, backups, notifications, and GitHub deploy hooks.
- Failure diagnosis spans terminal output, Docker logs, GitHub deliveries, proxy config, DNS state, and the VPS shell.

The core problem is not only deployment. The user needs one registry and one control surface from local development through one small production VPS.

## Positioning

Routely is a local-first app runner that becomes a one-VPS deployment dashboard.

Positioning against references:

| Reference | What Routely uses | What Routely must not copy |
| --- | --- | --- |
| 9Router | One memorable command, local daemon/server, predictable dashboard, fast local status loop. | 9Router's AI-router domain or product surface. Routely is not an AI routing tool. |
| Dokploy | Single-VPS production operations: Docker deploys, domains, HTTPS, GitHub integration, env, logs, metrics, databases, backups, and notifications. | Dokploy's full breadth or marketplace-first shape. Routely alpha is not a broad PaaS clone. |

Routely's differentiator is one portable app/service registry that spans local development and one-VPS production.

## What Routely Is

- An open source, self-hosted tool for solo developers.
- A local app/service runner centered on `routely.yml`.
- A single-VPS production control plane.
- A dashboard and CLI for app lifecycle, deploys, domains, HTTPS/proxy state, GitHub webhook deploys, env/secrets, logs, health, metrics, databases, backups, and notifications.
- A registry-centered system: `routely.yml` stores portable desired config; SQLite stores runtime state, deployment history, generated metadata, metrics, backup history, GitHub IDs, and secret-aware values where implemented.

## What Routely Is Not

- Not a public PaaS or managed cloud service.
- Not Kubernetes.
- Not a multi-tenant enterprise platform.
- Not a public multi-server control plane for MVP.
- Not a marketplace-first template product.
- Not a replacement for understanding that connected repos and local commands can execute code.
- Not a broad VPS administration tool for patching the OS, configuring firewalls, or managing every server concern.

## MVP Promise

The MVP is accepted through three demos:

1. Local demo: register three local apps and one database, then run them all with `routely`.
2. VPS demo: deploy one Dockerfile app to one VPS with a domain and HTTPS.
3. GitHub demo: push to the configured branch, auto-redeploy, and inspect failure logs when a deploy breaks.

Everything in the alpha should make these demos clearer, safer, more repeatable, or easier to diagnose.

## Implementation Facts To Preserve

These facts were checked against the current docs and repo structure during the docs reset:

- The repo is an npm workspace with `apps/cli`, `apps/daemon`, `apps/web`, and packages for core config, SQLite DB, drivers, GitHub, proxy, and presets.
- The CLI package exposes the `routely` binary.
- The dashboard is a Next.js app. Browser code must call same-origin `/api/*` route handlers, not the daemon directly.
- The daemon has endpoints for apps, deployments, domains/proxy, GitHub, env, health, metrics, databases, backups, notifications, and server status.
- Local mode uses SQLite state under `<workspace>/.routely/routely.db` and logs under `<workspace>/.routely/logs`.
- Production mode uses admin token auth for private daemon actions.
- Current alpha foundations include command apps, Compose-backed local services/databases, Dockerfile deploys, Traefik-compatible route generation, signed GitHub webhooks, env/secrets redaction, health/metrics/logs, local-file backups, and webhook/Discord/Telegram notifications.

Treat these as implementation facts to verify before changing behavior, not as a claim that every surface is public-alpha hardened.

## Non-Goals

Public alpha non-goals:

- Public marketplace and user-submitted templates.
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
