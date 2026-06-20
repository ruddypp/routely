# UI-0 Dashboard Audit

Checkpoint: `docs/17-ui-redesign-agent-prompt.md` UI-0  
Scope: audit only; no dashboard implementation changes started.

## Baseline Reviewed

- Product/docs: `AGENTS.md`, `README.md`, `DESIGN.md`, `docs/01-prd.md`, `docs/02-technical-architecture.md`, `docs/03-functional-specification.md`, `docs/04-user-flows.md`, `docs/13-current-setup-status.md`, `docs/14-implementation-plan.md`, `docs/17-ui-redesign-agent-prompt.md`.
- Web code: `apps/web/src/app/dashboard-client.tsx`, `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`, `apps/web/src/lib/daemon.ts`.
- API routes used by dashboard actions: `apps`, app lifecycle/logs/env/github/health/metrics/deployments, server status, deployments/logs, domains/root/verify/remove, proxy routes, GitHub status/repos/installations/deliveries/webhook, metrics, databases start/stop/create, backups run/toggle/create, notifications create/test/toggle.
- Current dashboard runtime checked with Playwright at:
  - normal `npm run dev`: `http://localhost:3030`, workspace resolved to `apps/cli`, empty registry.
  - direct root workspace daemon/web: `http://localhost:3000`, workspace `/home/ruddypp/Documents/work/routely`, production-auth mode with `hello-command` and `qa-postgres` visible after the web process inherited `ROUTELY_ADMIN_TOKEN`.

## Screenshots

- `docs/qa/ui-0-dashboard-desktop-1440x900.png`
- `docs/qa/ui-0-dashboard-tablet-768x1024.png`
- `docs/qa/ui-0-dashboard-mobile-375x812.png`
- `docs/qa/ui-0-apps-desktop-1440x900.png`
- `docs/qa/ui-0-apps-mobile-375x812.png`

## Current Structure

- `dashboard-client.tsx` is a single 3,158-line client component containing DTO types, polling, mutation handlers, module routing, forms, inspector state, and UI primitives.
- Top-level state polls 11 same-origin endpoints every 4 seconds: `/api/health`, `/api/apps`, `/api/server/status`, `/api/deployments`, `/api/domains`, `/api/proxy/routes`, `/api/github/status`, `/api/metrics`, `/api/databases`, `/api/backups`, `/api/notifications`.
- Navigation modules exist: Overview, Apps, Deployments, Domains, GitHub, Env, Logs, Health, Metrics, Databases, Backups, Settings.
- Overview shows fleet summary plus server foundation. Apps shows resource rows plus a selected app inspector. Env/Logs/Health reuse the selected app inspector. Metrics combines host samples and selected app details.
- Browser mutations preserve same-origin routing through `/api/*`; route handlers proxy to the daemon with `apps/web/src/lib/daemon.ts`.

## Concrete UI Issues

- Visual direction is still Spotify-derived: near-black, large pills, uppercase labels, circular initials, and soft media-app surfaces. It does not yet read as a 9Router plus Dokploy operations command center.
- Layout hierarchy is panel-heavy. Overview and server readiness use large card bands that consume first viewport space before exposing actionable operations.
- Navigation is flat. It lacks the required Control, Deploy, Data, System grouping, so production and local workflows read as one long menu rather than operational zones.
- Routine buttons are too large and loud. Many actions use uppercase text with wide tracking (`START`, `RESTART`, `ADD RESOURCE`, `REFRESH`) and pill geometry, making routine operations feel more prominent than the data rows.
- Resource rows are not dense enough. Rows reserve a large second line for controls and repeat full action labels; desktop row actions could be smaller and icon-assisted.
- Inspector is overlarge and always appended below Apps on desktop instead of behaving like a right-side context panel. It duplicates row controls and pushes details far down the page.
- Inspector tabs wrap into a broad grid and are hard to scan. App-specific tabs should be calmer segmented controls or a tighter tab row/drawer pattern.
- Typography relies heavily on uppercase micro labels and letter spacing. This creates a branded media-app texture instead of precise operational labeling.
- Status treatment is inconsistent. Some states are badges, some are readiness cards, some are tiny dots; status mapping needs shared component tokens and consistent state semantics.
- Empty/loading/error states exist but are generic. They do not clearly guide the next operational step, especially empty registry, no metrics, no domains, and daemon/API unavailable states.
- Mobile is usable only in a compressed sense. The bottom module rail overlays content and row actions in the Apps screenshot; full-page captures show content passing underneath the fixed nav.
- Tablet width causes key summary values to truncate (`loc...`, `0/...`, `0 t...`, `0 j...`) inside cards, making readiness information less trustworthy.
- Forms use 40px pill inputs and broad grids. UI-1 should tighten inputs to 34-38px and replace raw repeated field styling with primitives.
- Dev screenshots show the Next.js devtools floating button in the lower-left, which can obscure mobile content during QA.

## Workflow And Runtime Notes

- `npm run dev` starts through the CLI workspace and resolves the active workspace as `apps/cli`, yielding an empty app registry even though root `routely.yml` contains `hello-command`.
- Running `ROUTELY_WORKSPACE_ROOT=/home/ruddypp/Documents/work/routely npm run dev` currently fails before dashboard startup due to a real port conflict: `qa-postgres:5432`.
- Starting daemon and web separately can inspect the root workspace, but root state is production-auth protected. The web process must inherit `ROUTELY_ADMIN_TOKEN` for same-origin private API routes to work.
- Sourcing `.env` directly in shell produces `RSA: command not found` warnings due multiline key values; future local QA should use a safer env-loading path.

## Most Likely Files To Change Next

- `apps/web/src/app/dashboard-client.tsx`: split data wiring from modules and remove inline primitives.
- `apps/web/src/app/globals.css`: replace Spotify-like globals with Routely operational tokens.
- `apps/web/src/app/layout.tsx`: metadata/theme color may need alignment with new token system.
- New UI primitives likely under `apps/web/src/components/ui/`: button, badge/status dot, field/select/switch, panel, table/list row, alert, empty state, skeleton.
- New dashboard modules likely under `apps/web/src/components/dashboard/`: shell, sidebar, top status bar, mobile nav, module header, overview, apps, app inspector, deployments, domains, GitHub, env, logs, health, metrics, databases, backups, settings.
- `apps/web/src/lib/daemon.ts`: shared DTO types should become the browser/module source of truth instead of duplicated local types in `dashboard-client.tsx`.
- Route handlers under `apps/web/src/app/api/*`: likely preserved, with narrow changes only if component refactor exposes missing response shapes or error handling gaps.

## Exit Criteria Status

- Current dashboard structure is understood.
- UI patterns to replace are identified: Spotify-like theme, oversized pills, flat nav, panel-heavy hierarchy, repeated inline primitives, bottom nav overlay, and monolithic client architecture.
- No code redesign has started.
