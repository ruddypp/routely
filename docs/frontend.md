# Frontend Blueprint

## Frontend Goal

The Routely dashboard is a Spotify-inspired operations dashboard: dark, polished, compact, and easy to read while running many apps. It should tell the operator what is running, what is broken, what is receiving traffic, and what action is safe to take next.

## Design Direction

### Subject

Routely is a runtime-host console for solo developers. The user runs `routely`, opens a dashboard, starts every enabled app, then monitors and controls each app from one place.

### Visual North Star

Use Spotify's product UI as the main visual inspiration, adapted for app/server operations:

- Dark immersive shell.
- Layered charcoal panels.
- Rounded/pill controls.
- Compact high-density content.
- Green healthy/running accent.
- Clear white text hierarchy.
- Charts that feel like part of a dark console.

Do not copy Spotify branding, logos, exact layouts, or proprietary assets. Routely must remain its own product.

### Palette

- `Stage Black` — `#0A0D0B` for the app background.
- `Deck Black` — `#101412` for sidebar and deep shell surfaces.
- `Panel Charcoal` — `#171C1A` for cards and dashboard panels.
- `Elevated Charcoal` — `#222823` for raised widgets and hover states.
- `Soft Border` — `#2D352F` for subtle dividers.
- `Primary Text` — `#F7FFF9` for key headings and numbers.
- `Muted Text` — `#A8B3AD` for secondary labels.
- `Routely Green` — `#1ED760` for running, healthy, primary CTAs, and active navigation.
- `Route Blue` — `#4F8CFF` for domains/routes and links.
- `Warning Amber` — `#F59E0B` for pending/needs setup.
- `Failure Red` — `#EF4444` for failed/error states.

### Typography

- UI/body: system sans with compact line-height and strong weight contrast.
- Data/logs/terminal: monospace stack for ports, metrics, paths, env keys, and log lines.
- Large dashboard numbers should be bold and tight, not oversized magazine headlines.
- Labels should be small, uppercase, and muted where they support scanning.

### Shape, Spacing, And Density

- Default panel radius: `18px` to `24px`.
- Buttons: pill radius, clear hover/focus states.
- Icon actions: circular or pill-shaped.
- Cards should be compact and content-rich; avoid huge empty panels.
- Main content should fit meaningful information above the fold on 1365px-wide screens.
- Avoid light beige/white command-board panels unless a future theme explicitly adds light mode.

### Signature Element

Use a compact `Server Rail`, not a tall top banner. It should behave like Spotify's top player/status strip translated to server operations.

Server Rail content:

- Runtime host name.
- Session state.
- Daemon state.
- Docker state.
- Compose state.
- CPU/RAM/Disk quick chips.
- Uptime.
- Refresh action.

Server Rail rules:

- Height should stay compact.
- It should use dark/elevated surfaces.
- Chips should be pill-shaped.
- Warnings/errors should not explode into giant panels.
- If data is unavailable, show a small warning chip and a short inline reason.

## Visual Quality Bar

The current dashboard redesign is not acceptable if it still looks like a generic light admin board, has a giant stale-data card, or uses a tall navy banner with disconnected white content panels.

Required visual outcomes:

- The first impression is dark Spotify-inspired Routely, not a light dashboard template.
- Sidebar, Server Rail, and dashboard content share one dark visual system.
- Server Rail is compact and integrated into the shell.
- Dashboard cards are polished charcoal surfaces, not white/cream blocks.
- Charts are real components with dark-theme styling and accessible summaries.
- Stale/unavailable data appears as compact inline warnings, not a huge empty warning column.
- No active Backups/Restore UI in nav, overview cards, or app operations.

## Approved UI Dependencies

Frontend agents may install dependencies liberally when they improve the UI, interaction quality, accessibility, or implementation speed. Dependencies must still be purposeful and committed with package/lockfile changes.

Recommended examples:

- `recharts` for charts.
- `lucide-react` for lightweight icons.
- `clsx` or `tailwind-merge` for class composition.
- `framer-motion` for subtle motion if it improves polish without distracting.
- Focused Radix primitives if a real interaction needs accessible popover/dialog/tabs behavior.

Do not add a heavy admin template that dictates Routely's design language.

## Chart Requirements

The visual dashboard must include reusable chart/visual modules, even when some panels render honest empty states until backend samples exist.

Required chart modules:

- `HostResourceChart` — dark line/area chart for CPU and memory samples.
- `DiskUsageGauge` — circular/progress disk usage visualization.
- `TrafficSparkline` — route/app traffic sparkline with dark empty state when no proxy traffic exists.
- `AppStatusChart` — compact status distribution for running/stopped/failed/disabled/needs setup.
- `ActivityTimeline` — dense event timeline for starts, stops, verification failures, domain events, and recent logs.

Rules:

- Use real backend samples when available.
- If the backend has only current values, render current-value cards plus a compact empty chart state.
- Never fabricate healthy/running/traffic values just to fill a chart.
- Charts must have accessible labels and non-color text summaries.
- Chart colors must use the Routely palette, not random library defaults.

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

- Compact dark Server Rail.
- Hero/fleet panel that answers: “Is this runtime host healthy and are my apps running?”
- App status chart: running, stopped, needs setup, failed, disabled.
- Host resource charts: CPU and memory trends when samples exist; compact empty states otherwise.
- Disk usage gauge with used/free summary.
- Traffic sparkline or traffic empty state per app/domain.
- Recent incidents and activity timeline.
- Recently active logs.
- Quick actions: Add app, Start all, Stop all.

Layout guidance:

```text
┌──────────────────────────────────────────────────────────────┐
│ compact dark Server Rail                                     │
├──────────────┬───────────────────────────────────────────────┤
│ dark sidebar │ hero/fleet status       app status + disk     │
│              │ host resource charts    traffic + activity    │
│              │ app/service list strip  logs/incidents        │
└──────────────┴───────────────────────────────────────────────┘
```

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

- `dashboard-shell` — layout, sidebar, compact Server Rail, nav.
- `dashboard-visuals` — dark dashboard hero, charts, app status, traffic, activity.
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
- Giant stale-data panels that hide useful dashboard content.

## Accessibility And Responsiveness

- Every action must be keyboard reachable.
- Status must not rely on color only.
- Logs and terminal need readable contrast and copy controls.
- Mobile layout can collapse navigation, but app action buttons must remain reachable.
- Destructive actions need confirmation and clear target names.
- Dark surfaces must maintain contrast for text, charts, and focus rings.

## Frontend Execution Rules

- Read `node_modules/next/dist/docs/` before editing Next.js app code.
- Build UI against typed route contracts, not ad-hoc JSON assumptions.
- Use real backend state when available.
- Temporary fixtures are allowed only inside isolated prototype/demo modules and must not report fake readiness.
- Keep feature modules small enough for a specialist to own without loading the whole app.
- Each frontend slice must include UI, loading/error/empty states, route integration, and tests where an adjacent test pattern exists.
- Visual checkpoints must include a screenshot or concise visual QA note in the final handoff.
- If a dependency is added, explain why it was needed, keep it focused, and include the lockfile/package changes in the same commit.
