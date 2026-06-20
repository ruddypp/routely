# UI-3 Overview And Apps Audit

Date: 2026-06-20

## Baseline Read

- `apps/web/src/app/dashboard-client.tsx` owns polling, module routing, app forms, resource rows, and the selected-app inspector. It already uses same-origin `/api/*` calls for health, apps, deployments, domains, proxy routes, GitHub, metrics, databases, backups, notifications, lifecycle actions, logs, env, and deploys.
- `apps/web/src/app/globals.css` already contains the Routely operational token system: near-black surfaces, compact control heights, functional green, warning, info, and danger states.
- `apps/web/src/app/layout.tsx` uses `next/font` Geist/Geist Mono and dark viewport metadata.
- API route handlers proxy browser requests to the daemon through `apps/web/src/lib/daemon.ts`; touched workflows should preserve this same-origin boundary.

## UI Issues Found Before Editing

- Overview was still a summary list surface, not a command center showing daemon, workspace, mode, app fleet, deploy, domain/proxy, GitHub, backups, and urgent actions together.
- Apps rows exposed status and lifecycle controls, but driver/preset, path/port/domain, latest deploy, and pending restart/redeploy state were not scanable enough at row level.
- Row-local deployment was only available through deploy-specific modules/inspector, so Dockerfile apps required hunting.
- Inspector had too many tabs for this checkpoint (`metrics`, `proxy`, `github`, `config`) instead of the requested Overview, Runtime, Env, Logs, Health, Deployments, Domains set.
- Mobile/empty state was usable, but the same hierarchy issues remained: empty command center did not show the full local-to-production readiness chain.

## Screenshots

- Baseline: `docs/qa/ui3-baseline-desktop.png`, `docs/qa/ui3-baseline-tablet.png`, `docs/qa/ui3-baseline-mobile.png`
- After: `docs/qa/ui3-after-desktop.png`, `docs/qa/ui3-after-mobile.png`, `docs/qa/ui3-after-apps-desktop.png`, `docs/qa/ui3-after-apps-mobile.png`

## Likely Changed Modules

- `apps/web/src/app/dashboard-client.tsx`
- `docs/qa/ui3-overview-apps-audit.md`
- `docs/qa/ui3-*.png`

## Verification Notes

- Browser requests observed through Playwright remained same-origin `/api/*`.
- This local workspace had no registered apps, so screenshots cover empty-state and responsive shell behavior; row action wiring was verified in source against existing `/api/apps/:id/*` and `/api/apps/:id/deployments` calls.
