# Routely Context

This file is the domain glossary for agents working on Routely. Keep it free of implementation details; specs and decisions belong in `docs/` and ADRs.

## Glossary

**Routely** — A lightweight app server and control plane for solo developers that starts, stops, observes, deploys, and manages many apps from one dashboard. The same Routely runtime can be placed on a local machine or a VPS.
_Avoid_: Dokploy clone, VPS-only PaaS.

**Placement-neutral control plane** — Routely's product position: the machine running Routely is the server, whether that machine is local or a VPS.
_Avoid_: Treating local and VPS as different products.

**Runtime host** — The machine currently running Routely-managed apps. If Routely runs on the user's PC, the PC is the server; if Routely runs on a VPS, the VPS is the server.
_Avoid_: Assuming “server” always means VPS.

**Routely server session** — The full server session started by running `routely` on any runtime host; it brings up the daemon/API, dashboard, proxy, app runner, logs, and monitoring surfaces together.
_Avoid_: Requiring separate dashboard, daemon, proxy, and app-runner commands for normal use.

**Solo operator** — The intended Routely user: one developer who owns the runtime host and manages their own apps without shared administration workflows.

**App registry** — The primary source of truth for apps and services Routely manages. It connects app source, recipe, services, domains, env, databases, readiness, enablement, and lifecycle state.
_Avoid_: Treating `routely.yml` as the only source of truth.

**Portable app configuration** — A shareable import/export representation of app registry state for moving configuration between hosts or repositories.
_Avoid_: Manual YAML editing as the default setup path.

**Managed app** — The top-level product unit Routely presents in the dashboard. A managed app can contain one or more managed services while still behaving like one app for common start, stop, deploy, status, and proxy workflows.
_Avoid_: Treating every process as a separate app by default.

**Managed service** — A runtime unit inside a managed app, such as a frontend, API, worker, database, cron, or supporting container.
_Avoid_: Hiding multi-service structure entirely, forcing every service into the top-level app list.

**App enablement** — The user-controlled state that decides whether a ready managed app participates in auto-start while keeping the app registered for later use.

**Auto-start on run** — The default Routely behavior where running `routely` starts every enabled ready app.
_Avoid_: Making the operator manually start each app after launching Routely.

**Session-scoped app runtime** — The current Routely lifecycle rule: apps started by a Routely server session are stopped when that session stops.
_Avoid_: Background app persistence as the default MVP behavior.

**Docker-required runtime** — Routely's MVP constraint that Docker and Docker Compose must be available on the runtime host before apps can be managed through the primary path.
_Avoid_: Treating Docker as optional for the primary MVP path.

**Compose-backed app** — A managed app whose runtime is represented as a Compose project so Routely can use one operational model on any runtime host.

**Primary runtime model** — Routely's internal preference for representing managed apps and services as Compose-backed runtime definitions, even when setup begins from GitHub, a local folder, Dockerfile, Node project, or manual recipe.
_Avoid_: Separate local and VPS runtime models.

**App source** — Where Routely gets an app from, such as a local folder on the runtime host or a connected GitHub repository.
_Avoid_: Treating GitHub as the only app source.

**Runtime recipe** — A supported setup path for turning an app source into managed services, such as Compose, Dockerfile, Node package project, or manual fallback.
_Avoid_: Claiming universal stack support without an explicit recipe or fallback.

**Executable recipe** — A runtime recipe that Routely can validate by preparing, starting, and health-checking the app on the runtime host.
_Avoid_: Concept-only stack detection that marks an app as ready without proving it can run.

**Guided app setup** — The beginner-friendly app onboarding flow where Routely detects common project shapes, proposes safe defaults, and lets the operator click through setup with minimal manual configuration.
_Avoid_: Blank advanced forms as the primary onboarding experience.

**Setup verification** — The onboarding checkpoint that proves a managed app can build or start, exposes the expected port or health endpoint, and can be controlled by Routely before it is treated as ready.
_Avoid_: Saving broken apps as if they are production-ready.

**Readiness gate** — A hard status boundary that prevents an app from auto-starting or being presented as ready until its executable recipe and required checks pass on the runtime host.
_Avoid_: Optimistic ready states.

**Dashboard** — The Next.js web UI for Routely operations. Browser code calls same-origin `/api/*` route handlers, not the private daemon directly.

**Operations dashboard** — The dashboard home surface for understanding the runtime host and managed apps at a glance, including app status, traffic, disk, CPU, memory, uptime, and recent incidents.
_Avoid_: A static landing page that only lists apps without operational signals.

**App operations workspace** — The per-app dashboard area for managing domains, databases, environment values, terminal access, logs, metrics, deployments, and service controls.
_Avoid_: Forcing operators to leave Routely for routine app operations.

**Per-app observability** — App-specific status, logs, metrics, health, deployment history, and resource signals shown inside the app operations workspace.
_Avoid_: Only showing host-level monitoring.

**Host observability** — Lightweight visibility into the runtime host, including disk, memory, CPU, uptime, Docker status, and service health signals.
_Avoid_: Full APM platform, enterprise infrastructure monitoring.

**Traffic signal** — A lightweight request or route measurement for a managed app or proxy route, used to show whether an app is receiving traffic and how that traffic is behaving.
_Avoid_: Full analytics or APM as the MVP expectation.

**Monitoring MVP** — Routely's first observability scope: runtime host disk, CPU, memory, uptime, app/service status, health, logs, and basic traffic signals per app or domain.
_Avoid_: Full APM, tracing, alerting, or product analytics in the first usable app slice.

**App domain** — A stable hostname or domain that routes to a managed app through Routely. Locally this may be a development hostname; on a public host this is a public domain.
_Avoid_: Treating domains as production-only.

**Production app domain** — A real public domain that points to a public runtime host and routes to a managed app through Routely's proxy model.
_Avoid_: Presenting local-only hostnames as production domains.

**Traefik-compatible proxy model** — Routely's proxy approach for routing domains to managed services through Compose-compatible labels or dynamic config, including HTTPS certificate automation on public hosts.
_Avoid_: Requiring users to hand-write Nginx, Caddy, or Traefik config for normal app domains.

**Database service** — A managed database service represented through Routely's Compose-backed runtime model. Database services are created from guided recipes, attached to apps through internal networking and environment values, and are not exposed publicly by default.

**Database recipe** — A supported guided setup path for a database type such as Postgres, Redis, MySQL, MariaDB, or MongoDB, including image, volume, credentials, health checks, logs, and attachment behavior.
_Avoid_: Treating every database image as production-ready without a recipe.

**Deferred backup/restore** — Backup and restore are future operational capabilities and must not appear as enabled product features until Routely can implement them safely and honestly.
_Avoid_: Half-built backup or restore controls in the MVP app experience.

**Stored secret** — A sensitive app value saved for runtime use. After save, Routely should expose only metadata such as key/name/status, never the raw value.

**Embedded terminal** — A Routely-provided terminal surface scoped to the runtime host or a managed app/service for operational troubleshooting.
_Avoid_: Treating terminal access as a replacement for guided workflows.

**Dashboard API route** — A same-origin Next.js route handler that proxies or adapts daemon behavior for the dashboard.

**Deployment run** — A setup, build, verification, or GitHub-triggered attempt to turn an app source into running managed services.
_Avoid_: Calling a saved config a deployment when nothing was executed.

**Dokploy reference model** — The product reference Routely uses for practical app operations: source providers, app/compose setup, runtime recipes, environment values, domains, deployments, logs, monitoring, databases, volumes, and terminal access.
_Avoid_: Copying Dokploy's exact architecture or treating Dokploy compatibility as the goal.

**9router-light experience** — The interaction style Routely should preserve: one memorable command, lightweight dashboard, fast status loop, and low ceremony.
