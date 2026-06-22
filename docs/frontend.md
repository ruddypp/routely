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

Use a `Runtime Operations Deck`, not a tall Server Rail/banner. The deck is the dashboard's primary above-the-fold control surface: it combines a minimal title/header, top-right GitHub CTA, lifecycle controls, operational summary, and recent activity without crowding the rest of the dashboard.

Runtime Operations Deck content:

- Minimal deck header with “Runtime operations” copy.
- `Connect GitHub` CTA in the top-right.
- Runtime controls for Start, Stop, and Refresh.
- Compact production/session label.
- Operational summary for session, running apps, attention, routes, CPU, RAM, and domains.
- Recent operations/activity panel.

Runtime Operations Deck rules:

- It should be dark, compact, and integrated into the dashboard content.
- It should not become a tall global banner.
- It should use fewer larger cards, not many tiny metric cards.
- Warnings/errors should appear as compact chips or inline notices.
- If data is unavailable, show the smallest honest state that still explains why.

## Visual Quality Bar

The accepted dashboard baseline is a dark Spotify-inspired operations deck. It is not acceptable for future checkpoints to regress to a generic light admin board, a giant stale-data card, or a tall banner with disconnected content panels.

Required visual outcomes:

- The first impression is dark Spotify-inspired Routely, not a light dashboard template.
- Muted fixed sidebar, dashboard deck, and chart panels share one dark visual system.
- Runtime Operations Deck is compact, with GitHub CTA top-right and runtime controls stacked near the top.
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
3. `Application Setup Wizard`
4. `App Detail`
5. `Databases`
6. `Activity`
7. `Server`
8. `Settings`

Global actions:

- `Create service`
- `Start ready`
- `Stop all`
- `Run doctor`

## Page Specs

### Dashboard

Purpose: show runtime host and app fleet health at a glance.

Must show:

- Runtime Operations Deck with GitHub CTA top-right and Start/Stop/Refresh controls.
- Operational summary that answers: “Is this runtime host healthy and are my apps running?”
- App status chart: running, stopped, needs setup, failed, disabled.
- Host resource charts: CPU and memory trends when samples exist; compact empty states otherwise.
- Disk usage gauge with used/free summary.
- Traffic sparkline or traffic empty state per app/domain.
- Recent incidents and activity timeline.
- Recently active logs.
- Quick actions: Create service, Start ready, Stop all.

Layout guidance:

```text
┌──────────────────────────────────────────────────────────────┐
│ dark runtime operations deck: header + GitHub + controls     │
├──────────────┬───────────────────────────────────────────────┤
│ muted sidebar│ operational summary     activity              │
│              │ host resources + disk   app status + traffic  │
│              │ app/service list strip  logs/incidents        │
└──────────────┴───────────────────────────────────────────────┘
```

Empty state:

- “No apps yet. Add your first app to make this machine a Routely server.”

### Apps

Purpose: list every managed app and make common actions obvious. For a new user, this page is also the first deployment onboarding surface, not a technical registry/debug screen.

Dokploy research baseline:

- Use a `Project -> Environment -> Service` mental model.
- Routely MVP may expose a single `Default project` and one runtime-host environment, but it should still present apps, compose stacks, and databases as services inside that project.
- The primary CTA is `Create service`.
- First-level service choices are `Application`, `Compose`, `Database`, and deferred `Template / import`.
- `Application` is where GitHub repo, local folder, Dockerfile, Node/Next.js, static site, and custom source/stack choices live.

Beginner-first rules:

- If there are no services, show a `Create your first service` project onboarding panel with service-type cards. Do not show a large `No app selected` inspector because there is nothing to inspect yet.
- If `/api/apps` or admin-token setup is unavailable, show a compact, dismissible-looking inline warning above the onboarding content. The warning must not dominate the page or replace the path to add an app.
- Replace infrastructure copy like `Start all scope` with plain language: `Start ready services on this server` and `Services that still need setup will stay off`.
- Always answer these beginner questions in visible copy: `Where is my app source?`, `What stack did Routely detect?`, `What URL will open?`, and `What do I do next?`.
- Preserve the Spotify-inspired dark surface system: no light admin cards, no giant red/yellow error slabs, and no generic SaaS template panels.

Create-service cards:

- `Application` — app code from GitHub, local folder, Dockerfile, Node/Next.js, static output, or custom commands.
- `Compose` — existing `compose.yml` or `docker-compose.yml` with a service Routely can expose/control.
- `Database` — Postgres, MySQL, MariaDB, Redis, MongoDB, or future supported data services.
- `Template / import` — visible as deferred when not production-ready; do not fake it as enabled.

Empty-state source cards:

- `GitHub repo` — connect/select a repository and branch; icon should read as GitHub/source control.
- `Local folder` — choose or type a host path such as `/home/me/projects/my-app`; icon should read as folder/path.
- `Docker Compose` — use an existing `docker-compose.yml` or `compose.yml`; icon should read as Compose/containers.
- `Dockerfile` — build one service from a Dockerfile; icon should read as container image.
- `Node / Next.js` — detect package manager, build command, start command, and port; icon should read as JS/Node/Next.
- `Static site` — serve built assets or a static output directory; icon should read as globe/page.
- `Custom` — manual recipe for stacks not detected yet; icon should read as tools/sliders.

Icon guidance:

- Use purposeful dependencies or local SVGs for stack icons. `lucide-react`, `simple-icons`, Devicon SVGs, or focused local icon components are acceptable if committed with the slice.
- Icons must have accessible labels and a consistent tile treatment on dark panels.
- Brand icons may be monochrome or subtly branded, but Routely Green remains the primary action accent.

Recommended layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Apps                                  Create service / Start ready │
├──────────────────────────────────────────────────────────────┤
│ compact warning only when API/auth unavailable               │
├──────────────────────────────────────────────────────────────┤
│ Create your first service                                    │
│ [GitHub repo] [Local folder] [Docker Compose] [Dockerfile]    │
│ [Node/Next]   [Static site]  [Custom]                         │
├──────────────────────────────────────────────────────────────┤
│ When apps exist: searchable list + app detail preview         │
└──────────────────────────────────────────────────────────────┘
```

Each app card/row must show:

- Name.
- Status and readiness.
- Source type: local folder or GitHub.
- Source detail: local absolute path or `owner/repo` + branch.
- Detected stack/recipe: Compose, Dockerfile, Node/Next.js, static, custom, or unknown.
- Enabled/disabled state.
- Primary domain or local URL.
- Services count.
- Last run/deploy state.
- Quick actions: Start, Stop, Restart, Enable/Disable, Open.

Rules:

- Do not show `Start` as enabled for apps that failed readiness.
- `Disable` means exclude from auto-start, not delete.
- Failed apps must show the next fix step.
- App detail/preview panels should only appear when an app exists or a source card is actively selected.
- Never hide source paths, repository names, branches, detected recipe, exposed ports, or domain/local URL behind hover-only UI.

### Application Setup Wizard

Purpose: Dokploy-inspired, beginner-friendly setup that still verifies real execution. The user should feel they are choosing `what they already have` rather than configuring infrastructure.

Entry behavior:

- `Create service -> Application` opens a focused source-and-stack picker before any advanced form fields.
- The first screen uses large dark source cards with stack icons and one-sentence explanations.
- A selected source card reveals only the fields needed for that path.
- Advanced recipe fields stay collapsed until detection has produced a candidate or the user chooses `Custom`.

Source card fields:

- `GitHub repo`: installation/account, repository, branch, optional project subdirectory.
- `Local folder`: absolute host path, optional project subdirectory, folder existence hint, and read-permission hint.
- `Docker Compose`: compose file path, project directory, services to expose, and env file.
- `Dockerfile`: context path, Dockerfile path, build args, container port, and health check.
- `Node / Next.js`: package manager, install/build/start commands, output mode, app port, and env file.
- `Static site`: source/output directory, build command when needed, public directory, and route/domain.
- `Custom`: editable recipe name, services, image/build source, ports, env, volumes, and health command.

Steps:

1. Source — local folder or GitHub repo.
2. Detect — show stack/recipe candidates, confidence, files found, and paths used.
3. Configure — app name, services, ports, env, build/start settings.
4. Verify — build/start/health test run with live logs.
5. Finish — ready/enabled or saved as needs-fix.

State rules:

- `Next` is disabled until required fields are valid.
- Verification logs are visible by default.
- Passing verification can enable `Add and start`.
- Failing verification can save draft but cannot mark ready.
- Every step must show the resolved source path/repository and selected recipe so the user never loses context.
- Field labels use beginner language first and technical details second, for example `App folder path` with helper text `Absolute path on the machine running routely`.
- Verification errors must name the failing step and next fix, not only raw logs.

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

- `dashboard-shell` — muted fixed sidebar, dashboard frame, nav, and shared shell surfaces.
- `dashboard-visuals` — Runtime Operations Deck, dark charts, app status, traffic, and activity.
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
