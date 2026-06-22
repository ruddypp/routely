# Frontend Blueprint

## Frontend Goal

The Routely dashboard is an operations dashboard: it tells the operator what is running, what is broken, what is receiving traffic, and what action is safe to take next. It must be lighter than an enterprise observability suite and more practical than a static app list.

## Design Direction

### Subject

Routely is a small control room for solo developers running many apps from one machine. The UI should feel like a calm server console: precise, fast, low-ceremony, and readable under pressure.

### Palette

- `Host Ink` — `#172033` for primary text and navigation.
- `Panel Mist` — `#F6F8FB` for page background.
- `Rack Line` — `#DCE3EE` for borders and dividers.
- `Route Blue` — `#2563EB` for primary actions and active routes.
- `Running Green` — `#18A058` for healthy/running states.
- `Warning Amber` — `#D97706` for pending/needs setup states.
- `Failure Red` — `#DC2626` for failed/error states.

### Typography

- Display/UI: system sans, with restrained weight and tight labels.
- Data/terminal/logs: monospace stack for metrics, ports, IDs, and log lines.
- Copy style: direct verbs, no marketing language inside operational surfaces.

### Signature Element

Use a persistent `Server Rail`: a compact top/status strip that shows runtime host identity, Docker status, CPU/RAM/disk, uptime, and server session state. This makes the dashboard feel placement-neutral: the server is the machine currently running Routely.

```text
┌────────────────────────────────────────────────────────────┐
│ Server Rail: host • Docker ok • CPU • RAM • Disk • Uptime  │
├───────────────┬────────────────────────────────────────────┤
│ Sidebar       │ Page content                               │
│ Dashboard     │                                            │
│ Apps          │                                            │
│ Databases     │                                            │
│ Activity      │                                            │
│ Server        │                                            │
│ Settings      │                                            │
└───────────────┴────────────────────────────────────────────┘
```

## Information Architecture

Primary pages:

1. `Dashboard`
2. `Apps`
3. `Add App Wizard`
4. `App Detail`
5. `Databases`
6. `Activity`
7. `Server`
8. `Settings`

Global actions:

- `Add app`
- `Start all`
- `Stop all`
- `Run doctor`

## Page Specs

### Dashboard

Purpose: show runtime host and app fleet health at a glance.

Must show:

- Server Rail.
- App counts by state: running, stopped, needs setup, failed, disabled.
- Host cards: disk, CPU, memory, uptime.
- Traffic summary: requests or route hits by app/domain when available.
- Recent incidents: failed setup, failed health, failed domain verification.
- Recently active logs.
- Quick actions: Add app, Start all, Stop all.

Empty state:

- “No apps yet. Add your first app to make this machine a Routely server.”

### Apps

Purpose: list every managed app and make common actions obvious.

Each app card/row must show:

- Name.
- Status and readiness.
- Source type: local folder or GitHub.
- Enabled/disabled state.
- Primary domain or local URL.
- Services count.
- Last run/deploy state.
- Quick actions: Start, Stop, Restart, Enable/Disable, Open.

Rules:

- Do not show `Start` as enabled for apps that failed readiness.
- `Disable` means exclude from auto-start, not delete.
- Failed apps must show the next fix step.

### Add App Wizard

Purpose: beginner-friendly setup that still verifies real execution.

Steps:

1. Source — local folder or GitHub repo.
2. Detect — show recipe candidates and confidence.
3. Configure — app name, services, ports, env, build/start settings.
4. Verify — build/start/health test run with live logs.
5. Finish — ready/enabled or saved as needs-fix.

State rules:

- `Next` is disabled until required fields are valid.
- Verification logs are visible by default.
- Passing verification can enable `Add and start`.
- Failing verification can save draft but cannot mark ready.

### App Detail

Tabs:

- `Overview` — status, source, recipe, uptime, health, traffic, resource usage.
- `Services` — Compose services, container status, ports, restart controls.
- `Logs` — live/recent logs by app/service/run.
- `Deployments` — setup verification and GitHub redeploy history.
- `Domains` — hostname, DNS, proxy, HTTPS state.
- `Environment` — env vars and secrets with masked values after save.
- `Databases` — attached databases and create/attach flow.
- `Terminal` — scoped terminal with warning and audit cue.
- `Settings` — source, recipe, enablement, danger zone.

### Databases

Purpose: manage database services without pretending backup/restore exists.

Must show:

- Database services.
- Type: Postgres, MySQL, MariaDB, Redis, MongoDB.
- Status.
- Attached apps.
- Internal host/port metadata.
- Logs/health link.
- Create database action.

Must not show backup/restore controls in the MVP.

### Activity

Purpose: cross-app operational history.

Must show:

- Setup verification runs.
- Start/stop/restart actions.
- Domain verification events.
- GitHub webhook events.
- App failures.

### Server

Purpose: runtime host diagnostics.

Must show:

- Docker and Compose status.
- Routely server session status.
- Host metrics.
- Public host IP configuration.
- Ports used by dashboard, daemon, proxy.
- Doctor results.

## Component Modules

Split UI by feature, not by one giant dashboard client:

- `dashboard-shell` — layout, sidebar, server rail, nav.
- `server-status` — host metrics, Docker status, doctor cards.
- `apps-list` — app cards/table and bulk controls.
- `app-detail` — tabbed app workspace.
- `add-app-wizard` — source/detect/configure/verify/finish flow.
- `database-console` — database list/create/attach flows.
- `domain-console` — domain/DNS/proxy/HTTPS state.
- `logs-console` — log tail and filters.
- `activity-feed` — operational events.
- `terminal-panel` — scoped terminal UI.
- `ui` — reusable controls only.

Avoid a single file owning app state, fetching, rendering, and operations.

## Frontend State Taxonomy

Use consistent states everywhere:

- `ready` — app passed verification and can auto-start.
- `running` — app/service is currently up.
- `stopped` — app/service is ready but not running.
- `disabled` — app is excluded from auto-start.
- `needs setup` — app is missing required configuration.
- `verifying` — setup test run in progress.
- `failed` — last operation failed; logs available.
- `pending` — waiting on external state such as DNS.

## Copy Rules

Good copy examples:

- “Test run failed. Fix the command or port, then verify again.”
- “This app is disabled and will not start when Routely starts.”
- “DNS does not point to this server yet.”
- “Backup and restore are not available in this MVP.”

Avoid:

- “Something went wrong.”
- “Deployment successful” when only config was saved.
- “Production ready” unless readiness and runtime checks passed.

## Accessibility And Responsiveness

- Every action must be keyboard reachable.
- Status must not rely on color only.
- Logs and terminal need readable contrast and copy controls.
- Mobile layout can collapse navigation, but app action buttons must remain reachable.
- Destructive actions need confirmation and clear target names.

## Frontend Execution Rules

- Read `node_modules/next/dist/docs/` before editing Next.js app code.
- Build UI against typed route contracts, not ad-hoc JSON assumptions.
- Use real backend state when available.
- Temporary fixtures are allowed only inside isolated prototype/demo modules and must not report fake readiness.
- Keep feature modules small enough for a specialist to own without loading the whole app.
- Each frontend slice must include UI, loading/error/empty states, route integration, and tests where an adjacent test pattern exists.
