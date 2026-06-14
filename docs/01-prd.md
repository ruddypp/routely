# Routely Product Requirements Document

Version: 0.1  
Status: Draft  
Owner: TBD  
Target timeline: 3-month public alpha

## 1. English Summary

Routely is an open source, self-hosted local-to-production app manager for solo developers with many applications. It combines a 9Router-like single command experience with a Dokploy-like VPS deployment platform.

The user should be able to run:

```bash
routely
```

Then Routely starts the local daemon, dashboard, proxy, and all registered apps. On a VPS, Routely becomes an all-in-one app manager for GitHub deployments, Docker Compose services, domains, HTTPS, logs, metrics, environment variables, backups, and database templates.

## 1. Ringkasan Indonesia

Routely adalah app manager open source dan self-hosted untuk solo developer yang punya banyak aplikasi. Routely menggabungkan pengalaman single command seperti 9Router dengan deployment platform VPS seperti Dokploy.

User cukup menjalankan:

```bash
routely
```

Lalu daemon, dashboard, proxy, dan semua app yang sudah didaftarkan akan menyala. Di VPS, Routely menjadi pusat kendali untuk deploy dari GitHub, Docker Compose, domain, HTTPS, log, metric, env, backup, dan database template.

## 2. Problem

Solo developers commonly manage many apps manually:

- Run local apps in separate terminals.
- Remember ports such as `3000`, `5173`, `8000`, and `5432`.
- Start databases separately.
- Deploy each production app manually.
- Configure reverse proxy, HTTPS, env vars, logs, and monitoring repeatedly.
- Debug deployment failures across VPS shell, Docker logs, GitHub, and proxy config.

Routely solves this by giving developers a single app registry, one command locally, and one production control plane on a VPS.

## 3. Target Users

Primary target:

- Solo developers with many personal, client, or experimental apps.
- Indie hackers deploying multiple small products on one VPS.
- Developers who want a simpler self-hosted alternative to manual VPS setup.

Secondary target after MVP:

- Small teams.
- Agencies.
- Open source maintainers who want easy self-hosted deployment docs.

Explicitly out of MVP:

- Team/member/role management.
- Marketplace templates.
- Mobile app.
- Billing.

## 4. Product Positioning

Routely is:

```text
One command to run every project locally.
One VPS to host every app in production.
One dashboard to manage apps, deploys, domains, logs, metrics, env, and backups.
```

Positioning statements:

- 9Router-like daemon experience for apps.
- Dokploy-like self-hosted deployment, but local-first.
- Developer-friendly local-to-production workflow.
- Open source and self-hosted by default.

## 5. Product Goals

- `routely` starts all registered local apps and stops them when Routely stops.
- Support local development and production deployment from the first version.
- Provide dashboard and CLI parity for core app management.
- Connect GitHub, select repository/branch, and deploy.
- Auto-deploy when pushing to `main` or `master`.
- Support private repositories through authenticated GitHub integration.
- Support domains, wildcard domains, HTTPS, and reverse proxy in production.
- Support Docker Compose, databases, and common framework presets.
- Provide build logs, app logs, proxy logs, deployment logs, metrics, health status, and build failure visibility.
- Provide optional automatic backups for supported databases.

## 6. Non-Goals For MVP

- Kubernetes.
- Multi-region infrastructure.
- Billing/SaaS control plane.
- App marketplace.
- Mobile application.
- Enterprise RBAC.
- Preview deployments per PR unless trivial after the core deploy system is stable.
- Full custom runtime implementations for every framework.

## 7. MVP Feature Scope

Required:

- Local app runner.
- Dashboard.
- GitHub connect.
- Deploy from GitHub.
- Auto deploy on push to `main` or `master`.
- Domain and HTTPS management.
- Docker Compose support.
- Database templates: PostgreSQL, MySQL/MariaDB, Redis, MongoDB.
- Logs.
- Monitoring metrics.
- Environment manager.
- App presets for popular stacks.
- Optional automatic backups.
- Multi-server groundwork, but single-server-first UX.

Supported MVP app stacks:

- Next.js.
- Vite/React.
- Laravel.
- Express/NestJS.
- Django/FastAPI.
- Go.
- Static HTML/CSS.
- PHP custom apps.

## 8. UX Principles

- Default command is `routely`.
- Running `routely` starts everything in the current workspace or configured server context.
- Local mode uses original ports by default and avoids conflicts.
- Local apps stop when Routely stops.
- Production uses domains instead of public random ports.
- Production HTTPS is automatic.
- If build/deploy fails, the dashboard must show the exact failing step and logs.
- Users can choose presets, but every generated command must be editable.

## 9. Success Metrics

MVP success:

- A user can register 3 local apps and 1 database, then run all of them with `routely`.
- A user can install Routely on a VPS and deploy a GitHub repo to a domain with HTTPS.
- A push to `main` redeploys the app automatically.
- A failed deploy shows actionable logs in the dashboard.
- A user can view app health, CPU/RAM/disk, and logs from the dashboard.
- A user can enable/disable automatic database backups.

## 10. Open Questions

- Final public package name availability on npm.
- Whether the production proxy should be embedded, sidecar-managed, or external-only.
- Whether multi-server should be included as a visible beta feature in v0.1 or hidden as internal architecture.
- How far Windows support should go for local process supervision in v0.1.

