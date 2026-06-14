# Routely MVP Roadmap

Version: 0.1  
Status: Draft  
Timeline: 3 months

## English

The MVP should prove the local-to-production workflow before expanding into team features or marketplace features.

## Indonesia

MVP harus membuktikan workflow local-to-production sebelum masuk ke fitur team atau marketplace.

## Month 1: Local Foundation

- CLI package with `routely` command.
- Workspace config: `routely.yml`.
- SQLite state.
- Command driver.
- Compose driver for databases.
- Presets: Next.js, Vite/React, Laravel, Express, FastAPI, Go, static.
- Port conflict detection.
- Local dashboard with app list, status, logs.
- `routely`, `routely add`, `routely ps`, `routely logs`, `routely down`.

Exit criteria:

- 3 apps + 1 database can start with one command and stop together.

## Month 2: Production Foundation

- VPS/server init flow.
- Docker production runtime.
- Dockerfile/buildpack driver.
- Traefik-compatible proxy routing.
- Domain add/verify.
- Automatic HTTPS.
- Production dashboard auth.
- Env manager.
- Deployment logs and healthchecks.

Exit criteria:

- One GitHub app can be deployed to a VPS domain with HTTPS and visible logs.

## Month 3: GitHub, Monitoring, Backups, Polish

- GitHub App integration.
- Repo/branch selection.
- Private repository deploy.
- Auto deploy on push to `main`/`master`.
- Metrics dashboard: CPU, RAM, disk, response time, health.
- Backup toggle and scheduled backups for PostgreSQL/MySQL/MongoDB where feasible.
- Alert webhooks: Discord/Telegram/generic webhook.
- Documentation and examples.

Exit criteria:

- Push to main triggers deploy.
- Failed builds show useful logs.
- Metrics and backup status are visible.
- Public alpha docs are usable.

