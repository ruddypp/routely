# Routely Interfaces Reference

Status: Canonical interface reference
Owner: PM, Backend, Frontend
Last updated: 2026-06-22

## Purpose

This document records the public alpha interface shape that implementation teams should verify against code before changing user-facing docs. It is the contract for dashboard-first, Compose-first planning, not a claim that every listed surface is complete.

## CLI Surface

The CLI remains the bootstrap, scripting, and diagnostics path. The dashboard should become the normal setup and day-two operation surface as implementation catches up.

Local runner commands:

```bash
routely
routely init
routely add
routely sync
routely up
routely down
routely ps
routely logs [app]
routely restart [app]
routely doctor
routely db add <postgres|mysql|mariadb|redis|mongodb>
```

Production and operations commands:

```bash
routely server init
routely server status
routely server doctor
routely deploy [app]
routely env [app]
routely domain
routely github
routely health [app]
routely backup
routely notify
```

Release docs must use only commands verified by Backend or QA. If a command exists but is not alpha-ready, mark it as an alpha foundation or deferred.

## Local Demo Command Shape

The public alpha local demo must have one verified copy-paste path equivalent to:

```bash
routely init
routely add ./apps/web --name web --command "npm run dev" --port 3000
routely add ./apps/api --name api --command "npm run dev" --port 8000
routely add ./apps/worker --name worker --command "npm run dev" --port 3100
routely db add postgres --name postgres --port 5432
routely doctor
routely
routely ps
routely logs web
routely down
```

The exact example app paths and any app enable/disable workflow must be replaced with verified behavior before release. Current code already represents app enablement in config/DB/API surfaces; Backend and Frontend must verify which CLI or dashboard controls are ready before public docs instruct users to toggle it.

## Production Demo Command Shape

The public alpha one-VPS demo must have one verified path equivalent to:

```bash
routely server init --data-dir /var/lib/routely
routely server doctor
routely add /path/to/app --name web --driver <verified-driver> --port 3000 --health-path /health
routely deploy web --watch
routely domain root example.com
routely domain add web web.example.com
routely domain verify web.example.com
```

The target production driver model is Compose-backed operation. If the verified alpha path still uses `dockerfile`, docs and UI copy must call it a current bridge rather than the final model.

The GitHub demo must have one verified path equivalent to:

```bash
routely github status
routely github installation add 123456 --account your-github-login
routely github repo add owner/repo --branch main --installation-id 123456
routely github connect web owner/repo --branch main
```

## Dashboard API Rule

Browser code calls same-origin `/api/*` route handlers only. Same-origin route handlers may call the daemon.

Current route families in `apps/web/src/app/api` include:

- `/api/health`
- `/api/server/status`
- `/api/apps/*`
- `/api/deployments/*`
- `/api/domains/*`
- `/api/proxy/routes`
- `/api/github/*`
- `/api/metrics`
- `/api/apps/:id/health`
- `/api/apps/:id/metrics`
- `/api/apps/:id/env`
- `/api/databases/*`
- `/api/backups/*`
- `/api/notifications/*`

The daemon route families include the corresponding app, deployment, domain, proxy, GitHub, env, health, metrics, database, backup, notification, server, and auth endpoints.

Canonical backend production/auth contract:

- `ROUTELY_SERVER_MODE=production` is the explicit daemon production-mode env contract for one-VPS processes.
- Persisted `routely server init` foundation state also makes a restarted daemon report production mode.
- `/auth/status` exposes the frontend-safe auth signal as top-level `production`, `mode`, `requiresAuth`, and `auth.required`/`configured` without returning the admin token, token hash, or token salt.
- `/server/status` mirrors the same production/auth state under `server.production`, `server.mode`, and `server.auth.required`/`configured` for diagnostic server status views.
- Frontend route handlers should treat `requiresAuth === true`, `production === true`, or `server.auth.required === true` as a production-protected backend state and preserve caller admin-token auth before proxying private daemon operations.

Dashboard implementation rules:

- app setup/editing should use the same normalized app DTOs as CLI/config sync;
- bulk start should start enabled resources only and report skipped disabled resources where implemented;
- per-app stop should not disable the app;
- disabled/deferred controls must explain why the action cannot run;
- production mutation routes must preserve admin auth boundaries;
- browser responses must not expose raw secret values.

## Config Shape

Preferred config file:

```text
routely.yml
```

Accepted alias:

```text
routely.yaml
```

Minimal local shape:

```yaml
version: 1
name: routely-demo

apps:
  - name: web
    path: ./apps/web
    driver: command
    command: npm run dev -- --port 3000
    port: 3000
    enabled: true
    healthcheck:
      path: /health
    depends_on:
      - postgres

services:
  - name: postgres
    preset: postgres
    driver: compose
    image: postgres:16
    port: 5432
    internal: true
    enabled: true
```

Compose-backed app metadata may include:

```yaml
apps:
  - name: api
    driver: compose
    compose_file: ./compose.yml
    compose_service: api
    port: 8000
    enabled: true
```

Minimal production intent shape:

```yaml
version: 1
name: production-server

apps:
  - name: web
    driver: <verified-driver>
    path: /srv/apps/web
    port: 3000
    enabled: true
    source:
      type: github
      repo: owner/web
      branch: main
    domains:
      - web.example.com
    auto_deploy:
      enabled: true
      branches:
        - main
    healthcheck:
      path: /health
      expected_status: 200
```

Use `driver: dockerfile` in public examples only if Backend/QA verify that this is still the honest alpha path. Use Compose fields in public examples only after production Compose behavior is implemented and verified.

## Data Model Areas

SQLite state should cover these areas for public alpha:

- servers/settings
- apps, enablement, runtime instances, and app status
- app env vars and secret metadata
- deployments, deployment logs, and deploy history
- domains and proxy routes
- GitHub installations, repositories, app mappings, and deliveries
- healthchecks and metric samples
- databases, backup jobs, and backup runs
- notification channels and delivery attempts

Backend owns exact schema details. PM docs should describe behavior and data ownership without inventing column names unless verified in code.
