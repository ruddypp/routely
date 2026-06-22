# Routely MVP Blueprint

## Product Thesis

Routely is a placement-neutral app server and control plane. Running `routely` on a machine makes that machine the runtime host for managed apps. The same product must feel useful on a local PC and on a VPS; the difference is placement and network exposure, not a separate product mode.

Routely should feel like this for the operator:

1. Install Routely and Docker.
2. Run `routely`.
3. Open the dashboard.
4. Add apps from local folders or GitHub.
5. Let Routely detect a runtime recipe and verify the app can actually run.
6. Start every enabled app automatically on the next `routely` run.
7. Control each app independently.
8. Add domains, databases, env, logs, terminal, and monitoring from the app workspace.

The experience borrows 9Router's low-ceremony command-and-dashboard feel and Dokploy's practical app-management surface. Routely must not copy Dokploy internals or become a clone; Dokploy is the operational reference model for what a solo developer expects after adding an app.

## Non-Negotiables

- `routely` starts the full server session: daemon/API, dashboard, proxy, app runner, logs, and monitoring.
- The runtime host is whichever machine is running `routely`.
- Docker and Docker Compose are required for the primary MVP path.
- Compose is the primary internal runtime model.
- App setup must be guided and beginner-friendly.
- App setup must be executable: Routely verifies build/start/health before marking an app ready.
- Enabled apps auto-start when the Routely server session starts.
- Apps started by the Routely server session stop when the session stops for the current MVP.
- A managed app is the top-level UI unit and can contain multiple managed services.
- The dashboard must monitor host and app health, not just list resources.
- Backup/restore is deferred until safe and production-grade.

## MVP Definition

The MVP is complete when a solo operator can do the following on one runtime host:

1. Start Routely with `routely`.
2. See a dashboard with host disk, CPU, memory, uptime, app counts, app status, recent logs, and basic traffic signals.
3. Add an app from a local folder.
4. Add an app from a connected GitHub repository.
5. Let Routely detect Compose, Dockerfile, or Node/package project shapes and generate a Compose-backed recipe.
6. Run setup verification before an app becomes ready.
7. Start, stop, restart, disable, and enable each app.
8. Auto-start every enabled ready app on server session startup.
9. View per-app overview, services, logs, health, metrics, domains, env, terminal, and settings.
10. Create database services from guided recipes and attach them to apps through internal networking and generated env values.
11. Add a public domain on a public runtime host and route it through the Traefik-compatible proxy model with HTTPS when DNS is valid.
12. Receive clear failure states and logs when build, start, health, domain, or runtime verification fails.

## Core Concepts

### Runtime Host

The runtime host is the machine currently running `routely`. In local use, the user's PC is the server. In VPS use, the VPS is the server. The dashboard must not imply that local and VPS are separate products.

### Routely Server Session

A server session is the running instance started by `routely`. It owns the daemon/API, dashboard, proxy, app lifecycle, log streaming, terminal access, and monitoring collection.

### App Registry

The app registry is the source of truth for managed apps, services, recipes, domains, env, databases, readiness, lifecycle state, and source metadata. Portable config can import/export this state, but normal setup is dashboard-first.

### Managed App

A managed app is the top-level product unit. One app can contain services such as frontend, API, worker, cron, database, or supporting containers. The app card and app detail workspace remain the primary UI surfaces.

### Runtime Recipe

A runtime recipe turns an app source into executable Compose-backed services. Recipes can be detected, generated, edited through guided UI, and verified. Routely must not mark an app ready from detection alone.

### Readiness Gate

The readiness gate prevents broken apps from entering auto-start. It passes only when Routely can prepare the app, produce or adopt Compose, start the service, detect the expected port/health, and control the service afterward.

## End-To-End User Flows

### 1. First Run

1. User installs Docker and Routely.
2. User runs `routely`.
3. Routely checks Docker availability, Compose availability, ports, data directory, and permissions.
4. Routely starts the daemon/API, proxy, dashboard, and monitoring collector.
5. Routely opens or prints the dashboard URL.
6. Dashboard shows an empty state: “Add your first app”.

Failure behavior:

- If Docker is missing, show a blocking setup screen with install guidance.
- If ports are occupied, show exact port conflicts and suggested fixes.
- If permissions are insufficient, show the command or action needed.

### 2. Add App From Local Folder

1. User clicks `Add app`.
2. User chooses `Local folder`.
3. Routely lets the user pick or type a path on the runtime host.
4. Routely scans the folder for Compose files, Dockerfile, package manager files, env examples, ports, and health hints.
5. Routely proposes a recipe with confidence level and editable fields.
6. User confirms app name, service name, port, env, and domain placeholder.
7. User clicks `Test run`.
8. Routely builds/starts the Compose-backed service and performs readiness checks.
9. If verification passes, the app becomes ready and enabled.
10. If verification fails, the app is saved as draft/needs fix with logs and clear next steps.

### 3. Add App From GitHub

1. User clicks `Add app`.
2. User chooses `GitHub repo`.
3. Routely shows connected installations/repositories.
4. User selects repository and branch.
5. Routely clones or fetches the source into managed storage on the runtime host.
6. Routely runs the same recipe detection and setup verification as local folder setup.
7. User can enable webhook redeploy after the first verified run.

Failure behavior:

- GitHub auth errors show provider setup fixes.
- Clone/fetch errors show repository and branch details.
- Build/start errors remain app setup failures, not provider failures.

### 4. Start Server And Auto-Start Apps

1. User runs `routely`.
2. Routely loads the app registry.
3. Routely auto-starts every enabled app that passed readiness.
4. Apps with `needs setup`, `failed verification`, or `disabled` do not auto-start.
5. Dashboard shows startup progress and final state.

### 5. Control Apps

From app card and app detail:

- `Start` starts a stopped ready app.
- `Stop` stops one app without stopping the server session.
- `Restart` restarts one app.
- `Disable` keeps the app registered but excludes it from auto-start.
- `Enable` re-includes a ready app in auto-start.
- `Delete` requires destructive confirmation.

### 6. App Operations Workspace

Every app detail page has these tabs:

- `Overview` — status, domain, health, recipe, source, uptime, traffic, resource signals.
- `Services` — Compose services, container/process status, ports, restart controls.
- `Logs` — live and recent logs per app/service.
- `Deployments` — setup test runs, GitHub deploys, redeploy history, failures.
- `Domains` — public domains, DNS verification, proxy route, HTTPS state.
- `Environment` — env vars and secrets, masked after save.
- `Databases` — attach/create database services and show connection metadata.
- `Terminal` — scoped troubleshooting shell.
- `Settings` — source, recipe, enablement, danger zone.

### 7. Domains And Proxy

1. User opens app `Domains`.
2. User enters a real public domain when the runtime host is public.
3. Routely validates hostname format.
4. Routely checks DNS A record against the runtime host public IP when configured.
5. Routely generates Traefik-compatible routing labels/config.
6. HTTPS is requested when public DNS is valid.
7. Route status is visible: pending, verified, generated, active, failed.

Local-only hostname support can exist as a convenience, but public domain support is the real production path.

### 8. Databases

1. User opens app `Databases` or global `Databases`.
2. User chooses a recipe: Postgres, MySQL, MariaDB, Redis, or MongoDB.
3. Routely creates a Compose-backed database service with volume, credentials, health checks, internal network, and logs.
4. Routely attaches the database to an app by creating env values and network access.
5. Database is not exposed publicly by default.
6. Backup/restore controls are hidden until implemented safely.

### 9. Monitoring

Dashboard monitoring covers:

- Runtime host disk, CPU, memory, uptime.
- App and service status.
- Health checks.
- Recent logs and failures.
- Basic traffic signals per app/domain.
- Resource signals per app where Docker exposes them reliably.

Full APM, tracing, alerting, and analytics are out of scope for the first usable slice.

### 10. Shutdown

When the current Routely server session stops:

1. Routely stops apps it started in the session.
2. Routely stops or releases proxy/session resources.
3. Dashboard becomes unavailable because the server session is down.
4. Registry state and logs remain on disk.

## Frontend Information Architecture

Primary navigation:

- `Dashboard`
- `Apps`
- `Databases`
- `Activity`
- `Server`
- `Settings`

App detail tabs:

- `Overview`
- `Services`
- `Logs`
- `Deployments`
- `Domains`
- `Environment`
- `Databases`
- `Terminal`
- `Settings`

Global actions:

- `Add app`
- `Start all`
- `Stop all`
- `Open dashboard`
- `Run doctor`

## Backend Capability Map

Backend modules must provide these capabilities through small interfaces:

- Server session bootstrap and shutdown.
- App registry read/write and readiness state.
- Source providers for local folder and GitHub.
- Recipe detection, generation, and setup verification.
- Compose runtime orchestration.
- Traefik-compatible proxy route management.
- Database recipe management.
- Env/secrets management.
- Logs gateway.
- Observability collection.
- Terminal gateway.
- Dashboard same-origin API facade.

## Out Of Scope For MVP

- Backup/restore UI and automation.
- Full APM/tracing/alerting.
- Multi-server cluster management.
- Kubernetes.
- Teams/RBAC/organizations/billing.
- Public app marketplace.
- Automatic support for every framework without a recipe.
- Keeping apps alive after the Routely server session stops.

## MVP Done Definition

The MVP is done only when the product can be demonstrated from a clean machine with Docker installed:

1. `routely` starts the server session.
2. Dashboard loads without manual daemon/proxy commands.
3. At least one local-folder app and one GitHub app can be added, verified, and controlled.
4. Enabled ready apps auto-start on the next server session.
5. A database can be created and attached to an app.
6. A public domain can be configured on a public host with proxy route status and HTTPS state visible.
7. Logs, health, host metrics, app status, and basic traffic signals are visible.
8. Failed setup produces actionable logs and does not mark the app ready.
9. Frontend and backend tests cover the vertical slices that define the MVP.
10. Docs and UI do not expose half-built backup/restore or unsupported stack claims.
