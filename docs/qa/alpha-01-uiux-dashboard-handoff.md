# ALPHA-01 UI/UX Dashboard Handoff

Status: UI/UX review/spec handoff
Owner: UI/UX
Date: 2026-06-21

## UX Problem

The dashboard is close to the right public alpha shape: it is a dense operational control surface, uses same-origin `/api/*` data, and covers local apps, services, logs, deploys, domains, GitHub, env, health, metrics, databases, backups, and notifications.

The remaining demo risk is honesty at the edges. The UI must never imply that unverified drivers, TLS, rollback, preview-style production operations, or broad settings are ready when the public alpha only needs three demos:

- local runner: three apps plus one database with real status and logs
- VPS: one Dockerfile app with domain and conservative HTTPS/proxy state
- GitHub: configured branch push redeploys and broken deploy logs are diagnosable

## Recommended Flow

1. Start on Overview with four questions answered in the first viewport: daemon/server ready, app fleet state, latest deploy state, and urgent next action.
2. For the local demo, route users from Overview to Apps, then Logs. Apps should make start/stop/restart, URLs, status, dependencies, service/database state, crash state, and captured logs obvious.
3. For the VPS demo, route users from Overview to Deployments, then Domains. Deployments should show Docker/server/auth/data-dir readiness before the Deploy button. Domains should show DNS, proxy, TLS, target, and verification messages as separate states.
4. For the GitHub demo, route users from GitHub to Deployments/Logs. Recent deliveries must show repo, branch, commit, accepted/ignored/failed status, linked deployment, and an obvious log path for broken pushes.
5. Settings, backups, notifications, metrics, and databases should support diagnosis only. Any unsupported production capability should be disabled, hidden, or explicitly marked deferred.

## Lead Decision

For public alpha, hide non-demo drivers and broad presets from primary create/edit paths. Existing resources or compatibility-only values that use unsupported drivers may remain visible in read-only context, but must be disabled and labeled `deferred for public alpha` with a short reason. Do not present `buildpack`, `static`, broad presets, or non-demo service drivers as selectable alpha-ready paths unless Backend and Frontend have verified them against the three public-alpha demos.

## Local Review Notes

- Current dashboard data flow is real-data oriented: `apps/web/src/app/dashboard-client.tsx` polls same-origin `/api/health`, `/api/apps`, `/api/server/status`, `/api/deployments`, `/api/domains`, `/api/proxy/routes`, `/api/github/status`, `/api/metrics`, `/api/databases`, `/api/backups`, and `/api/notifications`.
- Local workflow shape is present: Apps separates app resources from services/databases, exposes lifecycle controls, links to logs, and shows pending restart/redeploy state.
- VPS/GitHub workflow shape is present: Deployments, Domains, and GitHub are split into dedicated modules with readiness cards, history rows, and log/status affordances.
- Remaining risk is not missing navigation; it is semantic consistency. Some code paths still treat `issuing` TLS as OK, show `locked` labels for modules that are active demo surfaces, and offer broad create/edit choices that exceed the public-alpha demos.

## 2026-06-21 UI/UX Review Addendum

Scope reviewed: local dashboard demo-critical workflows, copy, unsupported/deferred controls, responsive/accessibility expectations, and real-data honesty. This pass did not edit `apps/web` because dashboard code ownership is Frontend unless explicitly coordinated.

Accepted UI/UX direction now visible in the local dashboard code:

- Primary create/edit choices are narrowed to alpha-relevant app types, drivers, and presets: `app`, `database`, `worker`; `command`, `compose`, `dockerfile`; and common local/database presets.
- Deployments now show Docker, server doctor, data-dir, auth, and failed-count readiness cards, and deploy buttons expose concrete blocker labels such as `daemon offline`, `Docker not ready`, `data dir pending`, `auth missing`, and `server doctor check`.
- Domains now present root, hostname, DNS, proxy, TLS, and target as separate readiness cards in the main Domains module. This is the right public-alpha information architecture for HTTPS honesty.
- GitHub configuration separates App ID, Client ID, webhook secret, private key, repo connection, branch, auto-deploy, and deliveries. This supports the GitHub demo diagnosis flow.
- Databases, backups, and notifications include explicit deferred/safety copy for restore automation, external storage, email, raw targets, and loopback/private notification rejection.

Remaining UI/UX blockers for Frontend:

- App inspector deploy control still only checks `driver === "dockerfile"`, path, enabled, and daemon connectivity. It should use the same deploy blocker semantics as Apps and Deployments so server doctor, Docker, data-dir, and auth failures are visible everywhere a deploy button appears.
- App inspector domain/TLS copy still treats `issuing` as success-colored and summarizes HTTPS as `route generated` when TLS is `issuing` or `active`. `issuing` must remain warning/pending, and HTTPS should not read as complete until TLS is `active`.
- Server foundation still says production infrastructure actions are `locked` and falls back to `deployments/domains/https/github/backups locked`. For public alpha this conflicts with active demo modules. Use `pending server readiness`, `requires server doctor`, or `deferred for public alpha` according to the actual state.
- The unused legacy combined data/deploy panels remain in `dashboard-client.tsx` with stale TLS and `locked` copy. Remove them after Frontend ownership confirmation so future edits do not revive inconsistent semantics.
- Inspector tabs use a fixed 3-column mobile grid and 7-column wider grid. At 390px, verify labels do not crowd or overlap; if they do, make the tab row horizontally scrollable with stable button widths.
- Overview urgent next actions do not yet include DNS mismatch, TLS failed/pending, missing GitHub webhook secret, or notification delivery failure. Add those as attention items before release QA if Backend exposes the state consistently.

Real-data honesty criteria for QA/Frontend:

- No module may render mock success, placeholder readiness, or enabled production controls when `/api/*` returns missing, stale, or failed state.
- `generated`, `pending`, `issuing`, `active`, `failed`, `ignored`, `disabled`, `deferred`, and `locked` must mean different things. Do not use success color for generated proxy config or pending certificate state.
- Demo screenshots should include at least one non-happy path: daemon offline, failed app/logs, failed deployment phase, DNS/TLS pending or failed, or ignored GitHub delivery.

## Component And State Spec

- Overview: show urgent next actions before secondary history. Treat missing daemon, failed app, failed deployment, DNS mismatch, TLS failed/pending, missing GitHub webhook secret, and failed backup/notification as attention items.
- Apps: keep local lifecycle controls available only for connected, enabled resources. Show disabled reasons inline: `daemon offline`, `resource disabled`, `already running`, `not running`, or `Dockerfile deploy only`.
- App create/edit: restrict public-alpha choices or label unverified options. `buildpack`, `static`, broad presets, and non-demo drivers should not look equally supported unless Frontend/Backend verifies them.
- Logs: preserve terminal formatting, truncation notice, log file path, and reload state. Empty logs should say whether the app has not run yet, crashed before output, or logs are unavailable.
- Deployments: deployment history must include status, phase, app, source, commit when present, container/image, host/container port, error message, and a Logs action.
- Domains: keep DNS, proxy, TLS, and target as separate readiness cards. `issuing`, `pending`, `generated`, and `active` are not interchangeable.
- GitHub: show configuration as separate checks: App ID, client ID, private key, webhook secret, connected repo, branch, auto-deploy setting, latest delivery, latest deployment, ignored delivery reason, and signature validity.
- Env/secrets: after save, show only redacted or display-safe values. Pending restart/redeploy state should name the exact next action.
- Deferred capability labels: use `deferred` for roadmap items and `locked` only when the current mode/server state actively prevents an implemented action.

## Copy Guidelines

- Use honest operational copy: `pending`, `not configured`, `not verified`, `generated`, `issuing`, `active`, `failed`, `ignored`, `disabled`, `deferred`.
- Avoid success-adjacent copy for HTTPS until certificate state is actually active. Generated proxy config should read as `proxy route generated`, not HTTPS success.
- Button labels should name the action and loading state consistently: `Start` -> `Starting`, `Stop` -> `Stopping`, `Deploy` -> `Deploying`, `Verify DNS` -> `Checking DNS`.
- Empty states should direct the next concrete action: add an app, start Routely from the CLI, run `routely server doctor`, connect a repo, verify DNS, or open logs.
- Do not expose implementation labels as primary copy when user language is clearer. Keep `/api/*`, route-handler, and daemon internals in diagnostics, not main task guidance.

## Responsive And Accessibility Requirements

- Required dashboard smoke widths: 390px mobile, 768px tablet, 1280px desktop.
- Mobile must keep the top status bar readable, bottom module navigation scrollable, and primary app/deploy/log controls reachable without horizontal page overflow.
- Inspector tabs must not wrap into overlapping text at mobile widths. If needed, make tabs horizontally scrollable instead of squeezing seven labels into a dense grid.
- Every icon/dot-only state needs adjacent text or an accessible label. Status badges already help; timeline dots and nav signal dots should remain decorative only.
- Disabled controls need visible reasons nearby when the reason is not obvious.
- Keyboard focus must remain visible for nav, tabs, buttons, links, form fields, rows that behave as buttons, and horizontal mobile navigation.
- Reduced-motion preference must be respected; current global CSS already covers transition duration.

## Instructions For Frontend

- Before editing `apps/web`, read the relevant Next.js guide under `node_modules/next/dist/docs/` per `AGENTS.md`.
- Preserve same-origin `/api/*` usage. Browser code must not call the daemon directly.
- Reconcile the server foundation footer copy. The fallback `deployments/domains/https/github/backups locked` language conflicts with active demo modules unless those actions are truly disabled by server state.
- Align TLS semantics across Domains and the app inspector. In the inspector, `issuing` should be warning/pending, not OK, and HTTPS should not read as complete until TLS is active.
- Gate or label unverified create/edit options such as `buildpack`, `static`, and broad presets so alpha users do not think non-demo deploy paths are supported.
- Add visible disabled reasons for Apps-level deploy controls that match the Deployments module readiness blockers: daemon offline, Docker not ready, server init missing, auth missing, app disabled, missing path, or unsupported driver.
- Remove or isolate unused legacy combined panels in `apps/web/src/app/dashboard-client.tsx` after ownership confirmation. They contain stale copy and suppressed lint, which increases drift risk.
- Keep deploy button disablement consistent between Apps and Deployments. If Docker/server/data-dir/auth readiness blocks deploy in Deployments, Apps should show the same block reason.

## Visual QA Criteria

- Local demo: with three apps and one database, Overview shows real fleet counts, Apps separates apps from services/databases, each row has status/port/source/actions, and Logs shows captured output for a selected app.
- Local failure: a crashed app or failed start is visible as a failed/crashed state with useful log output and no success-colored status.
- VPS demo: Deployments shows Docker/server readiness, deployment phase, failure message when applicable, and deployment logs. Domains shows DNS/proxy/TLS/target separately and does not claim HTTPS success before TLS is active.
- GitHub demo: GitHub shows configured/missing server-side setup, connected repo/branch, delivery status, ignored branch behavior, deployment linkage, and a path to logs for failed deploys.
- Real-data honesty: no demo-critical module should show mock data, placeholder success, or enabled controls for unsupported alpha features.
- Unsupported breadth: create/edit only offers public-alpha verified options, or clearly disables/de-emphasizes compatibility-only options with `deferred for public alpha` copy.
- Responsive: desktop, tablet, and mobile screenshots show no text overlap, no clipped primary controls, no horizontal page overflow, and readable terminal/log areas.

## Blockers To Route Back To Routely Lead

- Environment/access: VPS, DNS, GitHub App, webhook secret, or repo access needed for visual verification.
- Ownership: Frontend should confirm before UI/UX edits `apps/web`; this handoff intentionally avoids code changes.
