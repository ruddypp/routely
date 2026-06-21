# Routely Interfaces Reference

Status: Canonical interface reference
Owner: PM, Backend, Frontend
Last updated: 2026-06-21

## Purpose

This document replaces the old separate CLI, API, config, and data-model draft docs. It records the public alpha interface shape that implementation teams should verify against code before changing user-facing docs.

## CLI Surface

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

Release docs must use only commands verified by Backend or QA. If a command exists but is not alpha-ready, mark it as alpha foundation or deferred.

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

The exact example app paths must be replaced with verified examples before release.

## Production Demo Command Shape

The public alpha VPS demo must have one verified path equivalent to:

```bash
routely server init --data-dir /var/lib/routely
routely server doctor
routely add /path/to/dockerfile-app --name web --driver dockerfile --port 3000 --health-path /health
routely deploy web --watch
routely domain root example.com
routely domain add web web.example.com
routely domain verify web.example.com
```

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
```

Minimal production extension:

```yaml
version: 1
name: production-server

apps:
  - name: web
    driver: dockerfile
    path: /srv/apps/web
    port: 3000
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

## Data Model Areas

SQLite state should cover these areas for public alpha:

- servers/settings
- apps and runtime instances
- app env vars and secret metadata
- deployments and deployment logs
- domains and proxy routes
- GitHub installations, repositories, app mappings, and deliveries
- healthchecks and metric samples
- databases, backup jobs, and backup runs
- notification channels and delivery attempts

Backend owns exact schema details. PM docs should describe behavior and data ownership without inventing column names unless verified in code.
