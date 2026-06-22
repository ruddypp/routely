---
type: report
title: End-To-End UI/UX Dashboard Contract
created: 2026-06-22
tags:
  - uiux
  - dashboard
  - public-alpha
  - qa
  - routely
related:
  - '[[CONTEXT]]'
  - '[[00-product-brief]]'
  - '[[01-alpha-plan]]'
  - '[[03-demo-acceptance-plan]]'
  - '[[11-feature-scope]]'
  - '[[12-prd]]'
  - '[[13-end-to-end-execution-plan]]'
  - '[[alpha-01-uiux-dashboard-handoff]]'
---

# End-To-End UI/UX Dashboard Contract

Status: executable UI/UX contract
Owner: UI/UX
Date: 2026-06-22
Scope: Frontend guidance only; no production code was edited for this pass.

## Source Context Reviewed

- Product/domain docs: `AGENTS.md`, `CONTEXT.md`, `docs/00-product-brief.md`, `docs/01-alpha-plan.md`, `docs/03-demo-acceptance-plan.md`, `docs/11-feature-scope.md`, `docs/12-prd.md`, and `docs/13-end-to-end-execution-plan.md`.
- Dashboard shell files: `apps/web/src/components/dashboard/types.ts`, `apps/web/src/components/dashboard/sidebar.tsx`, and `apps/web/src/components/dashboard/top-status-bar.tsx`.
- Dashboard client: `apps/web/src/app/dashboard-client.tsx`.
- Adjacent reusable state/copy helpers used for alignment: `apps/web/src/lib/app-lifecycle.ts`, `apps/web/src/lib/dashboard-operations.ts`, and `apps/web/src/lib/app-registry-form.ts`.
- Prior UI/UX baseline: [[alpha-01-uiux-dashboard-handoff]]. This document updates the contract for the end-to-end public-alpha plan.

## Contract Summary

The dashboard must feel like a 9Router-light command desk with Dokploy-inspired operational depth: quick local feedback, shallow navigation, real operational state, and no false success.

The first screen must answer five questions without opening private chat context:

1. What mode am I in: local workspace or one VPS?
2. What is running, stopped, disabled, or failing?
3. What will Start All do right now?
4. What production readiness or GitHub condition blocks deploy/redeploy?
5. Where do I inspect logs or failure details next?

Public-alpha trust rule: if an action is not backed by a real `/api/*` route and a verified backend contract, hide it, disable it with a reason, or mark it `deferred for public alpha`. Never show mock success, placeholder readiness, or success-colored generated state.

## Design Direction

- Subject: one solo developer operating local apps and one VPS from a single registry.
- Audience: terminal-comfortable developers who understand Docker, Compose, GitHub, DNS, and VPS basics, but want one low-ceremony dashboard.
- Page job: operate and diagnose the three public-alpha demos, not present a broad PaaS catalog.
- Visual stance: compact dark operations console with clear text labels, small readiness cards, restrained accent color, and terminal/log surfaces that feel native to local development.
- Signature element: the dashboard should use a visible `local → one VPS` runway: mode chip, readiness cards, and next-action copy should consistently move from local registry to one-VPS production without introducing teams, multi-server, or app-catalog metaphors.

## Information Architecture

Keep the current shallow module model from `DASHBOARD_NAV_GROUPS`. It matches the public-alpha demos and should remain stable unless Frontend changes every shell, mobile nav, and module header consistently.

| Group | Required label | Primary job | Demo relevance |
| --- | --- | --- | --- |
| Operate | `Overview` | Fleet state, urgent next action, daemon/server readiness, recent deploy/domain/GitHub signals. | All demos |
| Operate | `Apps / Services` | Registry, Start All, per-resource actions, app/service split, stack/preset onboarding. | Local demo, setup for VPS/GitHub |
| Release | `Deployments` | One verified deploy path, phase, failure, latest success, deploy logs. | One-VPS, GitHub |
| Release | `Domains` | Root domain, hostname, DNS, generated proxy route, TLS, target deployment. | One-VPS |
| Release | `GitHub` | Server-side GitHub App readiness, repo/branch mapping, signed deliveries, ignored/failing events, log path. | GitHub |
| Release | `Env / Secrets` | Stored env metadata, redaction, restart/redeploy needed. | One-VPS, GitHub diagnosis |
| Observe | `Logs` | Local logs and deployment logs for the selected app. | All demos |
| Observe | `Health` | Healthcheck status, failed/crashed state, metrics hints. | All demos |
| Observe | `Metrics` | Narrow samples only; do not imply a full observability product. | One-VPS diagnosis |
| Data | `Databases` | Compose-backed database/service state, internal-only posture. | Local, one-VPS |
| Data | `Backups` | Backup jobs/runs, local-file metadata, retention state. | One-VPS |
| Node | `Server Status` | Local vs one-VPS readiness, auth, Docker/Compose, data dir, doctor checks. | One-VPS |
| Node | `Notifications / Settings` | Notification channels/attempts and explicitly deferred settings. | Release confidence |

Sidebar and mobile nav dots are decorative. A dot may never be the only indicator of a module requiring attention; module cards, status badges, or alert copy must carry the accessible state.

## Local vs One-VPS Mode Contract

`TopStatusBar` should remain the global mode anchor. It can display a mode chip or a segmented mode control only if a real backend route supports changing modes. If the server only reports mode, the UI must present a read-only state plus next action, not a fake switch.

| Server state | Top-level label | Helper copy | Primary action |
| --- | --- | --- | --- |
| Daemon offline | `daemon offline` | `Start Routely with routely, then refresh.` | Disabled `Refresh` only while loading; otherwise refresh remains available. |
| Local mode | `mode local` | `Local mode starts enabled command and Compose resources in this workspace.` | `Start All` in `Apps / Services`. |
| Production not initialized | `one-VPS setup pending` | `Run routely server init and routely server doctor before production actions.` | Link/select `Server Status`; production actions disabled. |
| Production auth missing | `auth missing` | `Production mutations require an admin token.` | Link/select `Server Status`; mutating production actions disabled. |
| Production doctor failing | `server doctor check` | `Fix failing server checks before deploy, domains, GitHub, backups, or notifications.` | Link/select `Server Status`; blocked actions show same reason. |
| Production ready | `one-VPS ready` | `Production actions use admin auth and current server doctor state.` | Deploy/domain/GitHub controls enabled if their own prerequisites pass. |

Do not add `Add server`, `Switch server`, `Team workspace`, `Cluster`, or `Region` controls for public alpha. Multi-server and team concepts are hidden, not deferred, because they would change the mental model.

## Primary User Flow

The dashboard should lead the solo operator through this loop:

1. `Overview`: read mode, daemon/server state, fleet summary, latest failure, and next action.
2. `Apps / Services`: add or edit a resource using a verified type, driver, and preset; keep unsupported choices out of the primary path.
3. `Apps / Services`: use `Start All` to start every stopped enabled command/Compose resource; read started/skipped/failed counts.
4. `Apps / Services` or inspector: `Start`, `Stop`, `Restart`, `Disable for Start All`, `Logs`, and `Edit` one resource without removing it from the registry.
5. `Deployments`: deploy the verified production path only after Docker, data dir, auth, and server doctor are ready.
6. `Domains`: attach hostname, verify DNS, inspect generated proxy route, and wait for verified TLS without claiming HTTPS success early.
7. `GitHub`: connect repo/branch, inspect signed delivery state, and route failing redeploys to deployment logs.

## Lifecycle Language

Use plain action names and keep the same verb through button, loading state, toast/alert, and report copy.

| Concept | Required UI language | Semantics | Disabled/deferred reasons |
| --- | --- | --- | --- |
| Bulk start | Button `Start All`; loading `Starting`; report title `Start All report`. | Starts stopped enabled `command` and `compose` resources. Skips disabled, already running, and unsupported drivers. | `daemon offline; CLI fallback: routely up`, `no resources registered`, `no enabled command or Compose resources`, `all enabled command and Compose resources are already running`, `Start All is already running`. |
| Per-app start | Button `Start`; loading `Starting`. | Starts one enabled local command/Compose resource now. | `disabled resources are skipped by Start All until re-enabled`, `{driver} lifecycle is deferred`, `resource is already running`, `daemon offline`, `another lifecycle action is running`. |
| Per-app stop | Button `Stop`; loading `Stopping`. | Stops the current running instance only. It does not disable future Start All. | `resource is not running`, `daemon offline`, `another lifecycle action is running`. |
| Restart | Button `Restart`; loading `Working` is acceptable, but `Restarting` is clearer if updated. | Stop/start one enabled resource now. | Same support checks as `Start`; never use restart as a substitute for redeploy. |
| Disable | Preferred label `Disable for Start All`; existing form label may remain `Enabled` only with helper `Included in Start All. Turn off to keep registered but skip future Start All.` | Keeps the resource registered and editable, excludes it from future Start All. | If no direct toggle API exists, expose disable only through `Edit` and show row badge `Start All skips: disabled`. |
| Deploy | Button `Deploy`; loading `Deploying`. | Runs the verified production deploy path. Current UI may call it `Dockerfile deploy bridge` until Compose production parity is verified. | `daemon offline`, `resource disabled`, `deploy deferred for this driver`, `Dockerfile path missing`, `server status unavailable`, `Docker not ready`, `data dir pending`, `auth missing`, `server doctor check`. |

Do not use `pause`, `archive`, `remove`, or `delete` as synonyms for disable. Delete/remove implies data loss and is not part of the public-alpha local demo.

## Stack Preset Onboarding

`Add resource` should be a guided registry definition, not a broad app catalog.

| Step | Required behavior | Frontend criteria |
| --- | --- | --- |
| Choose type | Offer only `app`, `database`, and `worker` for public alpha. | If future types exist in data, show them read-only with `deferred for public alpha` unless verified. |
| Choose driver | Offer `command`, `compose`, and `dockerfile` with scoped helper copy. | `command` and `compose` are local Start All eligible. `dockerfile` is deploy bridge only and must not imply local lifecycle support. |
| Choose preset | Offer current verified presets: `custom`, `nextjs`, `vite`, `express`, `postgres`, `mysql`, `mariadb`, `redis`, and `mongodb`. | Explain that presets populate registry metadata; they do not prove every stack can deploy automatically. |
| Fill scoped fields | Enable only fields relevant to the selected driver. | Command fields disabled for Compose/Dockerfile. Compose image/service/file/internal/volumes disabled for non-Compose. Disabled fields need helper text. |
| Source/GitHub intent | Source repo/branch in the app form is metadata only. | Live webhook connection belongs in `GitHub`; use helper `GitHub metadata; connect webhooks in GitHub module.` |
| Domains intent | Domain text in app form is registry intent only. | Live DNS/proxy/TLS verification belongs in `Domains`. |
| Env metadata | Portable non-secret env can be stored in config; secrets belong in `Env / Secrets`. | If `envLocked`, disable the textarea and direct the user to `Env / Secrets`. |

Hide primary UI for `buildpack`, `static`, `Nixpacks`, `Railpack`, public app catalog, automatic stack detection, and any unverified service driver. Existing resources that already have those values may remain visible in read-only metadata with `deferred for public alpha` and a reason.

## State Taxonomy

Every state must have text, tone, and next-action behavior. Color alone is insufficient.

| Area | State labels | Tone rule | Next-action copy |
| --- | --- | --- | --- |
| Daemon | `connected`, `offline`, `loading`, `refreshing`. | Connected is OK; offline is error; loading/refreshing is warning/muted. | Offline: `Start Routely with routely, then refresh.` |
| Local runtime | `running`, `starting`, `stopped`, `stopping`, `failed`, `crashed`, `unknown`. | Running/healthy OK; starting/stopping/unknown warning; failed/crashed error. | Failed/crashed must point to `Logs`. |
| Enablement | `enabled`, `disabled`, `Start All ready`, `Start All skips: disabled`, `Start All skips: running`, `Start All deferred: {driver}`. | Ready OK; skipped/deferred warning. | Disabled: `Enable it to include it in future Start All.` |
| Pending changes | `no pending changes`, `restart needed`, `redeploy needed`, `restart + redeploy needed`, `local restart applies`. | No pending OK; pending warning. | Name exact next action: restart or redeploy. |
| Server readiness | `local bypass`, `ready`, `missing auth`, `Docker not ready`, `data dir pending`, `server doctor check`, `unavailable`. | Ready/local bypass OK; unavailable/pending warning; missing auth error. | Route to `Server Status`. |
| Deployment | `no deployment recorded`, `queued`, `preparing`, `building`, `starting`, `healthchecking`, `succeeded`, `failed phase: {phase}`. | Succeeded OK; active phases warning; failed error. | Failed must show phase, error message, and `Open logs`. |
| Domain/DNS/proxy/TLS | `DNS not configured`, `DNS pending`, `DNS verified`, `DNS mismatch`, `generated route`, `proxy pending`, `proxy failed`, `pending TLS`, `verified TLS`, `failed TLS`, `target pending`. | Verified DNS/TLS OK; generated route and pending TLS warning; mismatch/failed error. | DNS mismatch must name expected server IP when available. |
| GitHub | `GitHub app missing`, `webhook secret missing`, `private key missing`, `no repo connected`, `ready`, `invalid signature`, `ignored event: {status}`, `deploy in progress: {phase}`, `deploy failed: {phase}`, `deploy succeeded #{id}`. | Ready/succeeded OK; missing config or ignored warning unless security-critical; invalid signature/failed error. | Always show delivery ID, repo, branch, commit, matched app, and logs path when available. |
| Env/secrets | `secret metadata`, `plain value`, `restart needed`, `redeploy needed`, `not deployable`, `local only`. | Secret metadata is warning/muted, not error; raw secret values must not appear. | Direct edits to `Env / Secrets`, not registry textarea, when stored secrets exist. |
| Data/backups | `internal-only`, `public requested`, `backup running`, `local file recorded`, `metadata-only`, `restore deferred`, `download exposed`, `no backup file`. | Internal/local file OK; deferred/running warning; public requested/download exposed/failed error. | Restore UI remains deferred; backup file downloads must not appear unless security-reviewed. |
| Notifications | `enabled`, `disabled`, `test failed`, `delivery failed`, `target redacted`, `outbound rejected`. | Enabled OK; disabled warning/muted; failed/rejected error. | Failed delivery shows channel, event, status, and safe target metadata. |

Generated proxy config is not route success. Pending or issuing TLS is not HTTPS success. Dockerfile deploy success is not Compose parity. A connected GitHub repo is not proof that the latest push redeployed.

## Failure Copy

Failure copy must answer: what happened, why it matters, and what to do next. Use active voice, no apologies, and no vague `something went wrong` text.

| Failure | Required copy pattern |
| --- | --- |
| Daemon offline | `Daemon offline. Start Routely with routely, then refresh.` |
| Start All skips disabled app | `{app} was skipped because it is disabled. Enable it to include it in future Start All.` |
| Unsupported local lifecycle | `{driver} lifecycle is deferred for local Start All. Use Deployments when the production path is ready.` |
| Port conflict | `Port {port} is already in use. Stop the other process or change this app port.` |
| App crash | `{app} crashed. Open Logs to inspect the last output.` |
| Deploy blocked | `Deploy blocked: {reason}. Fix Server Status readiness, then deploy again.` |
| Deploy failed | `Deploy failed during {phase}. Open deployment logs to inspect the failing step.` |
| DNS mismatch | `DNS mismatch. Point {hostname} at {ROUTELY_SERVER_PUBLIC_IP}, then Verify DNS.` |
| TLS pending | `TLS pending. The proxy route exists, but certificate verification is not active yet.` |
| GitHub invalid signature | `Webhook rejected: invalid signature. Check the GitHub webhook secret on the server.` |
| Ignored branch | `Ignored event: branch does not match this app's configured deploy branch.` |
| Secret value hidden | `Secret value is stored. Only redacted metadata is shown after save.` |
| Backup unsafe exposure | `Backup download exposure detected. Keep backup files local until security review approves downloads.` |

Inline error surfaces should preserve untrusted app names, branch names, commit messages, domains, logs, and webhook text as text-only content. Do not render untrusted text as HTML.

## Responsive Behavior

Required visual QA widths are 390px mobile, 768px tablet, and 1280px desktop.

- Mobile: sidebar is hidden, mobile module navigation is available, top status chips wrap without horizontal page overflow, and primary controls remain reachable above or near the selected content.
- Tablet: module cards and app rows may stack, but status cards, form fields, and terminal/log surfaces must remain readable without clipped labels.
- Desktop: two-column surfaces are acceptable for Apps inspector, Deployments, Domains, GitHub, Databases, and Backups; sticky inspector may remain in view.
- Inspector tabs must stay horizontally scrollable with stable minimum widths. Do not compress seven tab labels into overlapping text.
- App rows must not require horizontal scrolling to reach `Start`, `Stop`, `Logs`, `Deploy`, or `Edit`.
- Terminal/log surfaces need a minimum height that allows useful diagnosis and a maximum height that avoids swallowing the page.
- Dense metadata grids may reduce column count by breakpoint, but labels must stay paired with values.

## Accessibility Criteria

- Keyboard focus remains visible for sidebar buttons, mobile nav buttons, module tabs, lifecycle buttons, links, form fields, selects, switches, rows that behave as buttons, and log reload controls.
- Every disabled control needs a nearby visible reason or an `aria-label`/`title` reason; the reason should match backend block semantics.
- Dot-only indicators are decorative with `aria-hidden="true"`; text labels or badges carry the state.
- Status badges use text plus color. Success/warning/error cannot be distinguished by color alone.
- Buttons use action-specific loading labels when practical: `Starting`, `Stopping`, `Deploying`, `Checking`, `Saving`, `Removing`.
- Alerts for action failures should be announced by semantic alert components where possible.
- Touch targets for primary mobile actions should be at least visually button-sized and not packed into tiny icon-only controls.
- Respect reduced-motion preferences. Existing global transition suppression should remain in effect.
- Log and terminal text must be selectable and readable with preserved whitespace. Long log lines may wrap or scroll inside the terminal surface, not the whole page.

## Deferred-State Rules

Use this decision tree before rendering any public-alpha control:

1. Hide it if the concept is outside the public-alpha demos and showing it changes the product promise.
2. Disable it if the action is implemented but a current prerequisite is missing.
3. Mark it `deferred for public alpha` if the concept helps users understand roadmap boundaries but must not look actionable.
4. Use `locked` only for permission/auth barriers on implemented actions. Do not use `locked` for roadmap deferrals or server readiness failures.

### Controls That Must Be Hidden

- Teams, organizations, RBAC, billing, enterprise audit, SSO, multi-tenant workspace, and approval controls.
- Multi-server, cluster, region, Kubernetes, managed-cloud, and broad VPS-admin controls.
- Public app catalog and app marketplace browsing.
- Preview deployments and PR-environment controls.
- Destructive restore automation and broad rollback/cancel orchestration unless Backend verifies a safe demo path.
- Static/buildpack/Nixpacks/Railpack primary onboarding paths until verified against the three demos.

### Controls That Must Be Disabled With Reasons

- `Start All` when daemon is offline, busy, there are no resources, no stopped enabled command/Compose resources, or all eligible resources are already running.
- `Start`/`Restart` when daemon is offline, another lifecycle action is running, resource is disabled, resource is already running, or driver lifecycle is deferred.
- `Stop` when daemon is offline, another lifecycle action is running, or resource is not running.
- `Deploy` when daemon is offline, resource is disabled, driver is not verified for deploy, path is missing, server status is unavailable, Docker is not ready, data dir is pending, auth is missing, or server doctor is failing.
- Domain `Save root`, `Add`, `Verify DNS`, and `Remove` when daemon is offline, the form is incomplete, or another domain action is running.
- `Open HTTPS` unless TLS status is `active` or `verified`.
- GitHub `Connect` when daemon is offline, saving is in progress, no app is chosen, repository is blank, or server-side GitHub App/webhook prerequisites are missing.
- Env `Set env` and `Unset` when daemon is offline, a save is in progress, or required key input is missing.
- Database, backup, and notification mutation controls when daemon is offline or the row/action is already busy.

### Controls That May Be Visible As Deferred

- Compose production deploy parity until the verified production path exists.
- Dockerfile local lifecycle in Start All contexts.
- OAuth install callback, live repo browsing, commit status updates, and preview deployments in GitHub context.
- External backup storage, restore UI, public backup downloads, and destructive restore.
- Email notifications, complex alert routing, and escalation policies.
- Full observability, long-retention metrics, and broad monitoring features.
- Rollback/cancel controls beyond identifying the latest successful deployment.

## Component Guidance For Frontend

| File or component | Required guidance |
| --- | --- |
| `apps/web/src/components/dashboard/types.ts` | Keep the IA group order and labels above. If labels change, update sidebar, mobile nav, module headers, tests, and this contract together. |
| `apps/web/src/components/dashboard/sidebar.tsx` | Keep `Solo ops: local → one VPS`; keep daemon status text; ensure signal dots remain decorative and never replace labels. |
| `apps/web/src/components/dashboard/top-status-bar.tsx` | Preserve workspace and mode visibility. Add or refine mode helper copy before adding any switch; no fake mode change control without an API. |
| `apps/web/src/app/dashboard-client.tsx` | Continue polling same-origin `/api/*` only. Keep Apps, Deployments, Domains, GitHub, Env, Logs, Health, Data, Backups, Server, and Notifications driven by real API state. |
| `AppsModule` | `Start All scope` copy must name command/Compose eligibility, disabled skips, Dockerfile deferral, and CLI fallback. Start All report must show started/skipped/failed counts. |
| `AppRow` and `DetailPanel` | Lifecycle controls must share the same disabled reasons. If an app can be deployed from both Apps and Deployments, both surfaces must show identical deploy blockers. |
| `AppForm` | Rename or supplement `Enabled` with `Included in Start All`; keep driver-scoped helpers; keep GitHub source and domain fields labeled as intent only. |
| `DeploymentsModule` | Keep readiness cards for Docker, server doctor, data dir, auth, active, and failed. Use `Dockerfile deploy bridge` copy until Compose production parity is verified. |
| `DomainsModule` | Keep DNS, proxy, TLS, target, and deploy as separate readiness cards. `generated route` is warning/information, not success. `Open HTTPS` only appears as a link when TLS is active/verified. |
| `GithubModule` | Keep configuration, repo/branch mapping, delivery diagnosis, signature state, ignored events, failing events, deployment phase, and logs path in one flow. |
| `ServerFoundationPanel` | Replace broad `disabled until ready` fallback copy with precise reasons when possible: `requires server doctor`, `auth missing`, `data dir pending`, `Docker not ready`, or `deferred for public alpha`. |
| `apps/web/src/lib/app-lifecycle.ts` | Treat current helper labels as the canonical Start All and per-app lifecycle language unless backend semantics change. |
| `apps/web/src/lib/dashboard-operations.ts` | Treat current helper labels as canonical for GitHub, deployments, domains, TLS, env, logs, databases, backups, and auth. |
| `apps/web/src/lib/app-registry-form.ts` | Keep the verified type/driver/preset lists narrow. Add new options only after Backend and QA verify them against the three public-alpha demos. |

## Demo Acceptance Checks For Frontend

### Local Dashboard-First Demo

- With three apps and one database, `Overview` shows real fleet counts and urgent next action.
- `Apps / Services` separates app resources from services/databases and shows running, stopped, disabled, pending, port, domain, source, and Start All state per row.
- `Start All` starts stopped enabled command/Compose resources and reports disabled/unsupported/running skips without deleting registry entries.
- Per-app `Stop` leaves other running apps up and does not change enablement.
- Disabled apps remain visible, editable, and explicitly skipped by future Start All.
- Logs for a failed/crashed app are reachable from `Apps / Services`, `Logs`, and inspector surfaces.

### One-VPS Operations Demo

- `Server Status` distinguishes local, production-ready, production-blocked, auth-missing, Docker not ready, data-dir pending, and server doctor check states.
- `Deployments` blocks deploy with the same reason wherever the deploy control appears.
- Deploy failures show status, phase, error message, latest successful deployment when available, and a log path.
- `Domains` distinguishes root, hostname, DNS, generated proxy route, TLS, target, and deployment; no generated/pending state uses success copy.
- `Env / Secrets`, `Databases`, `Backups`, `Metrics`, and `Notifications / Settings` show real data or honest unavailable/deferred states only.

### GitHub Redeploy Diagnosis Demo

- `GitHub` shows App ID, Client ID, webhook secret, private key, repo/branch mapping, auto-deploy state, delivery state, ignored/failing counts, and latest deploy.
- A matching push shows repo, branch, commit SHA, delivery ID, matched app, deployment ID, phase, and logs path.
- An invalid signature, ignored branch, duplicate delivery, failed deploy, or missing setup state uses distinct copy and tone.
- A deliberately broken deploy routes to deployment logs and preserves the latest successful deployment where available.

## Verification For This Contract

- This document gives Frontend concrete component and page guidance for `types.ts`, `sidebar.tsx`, `top-status-bar.tsx`, `dashboard-client.tsx`, and adjacent state/copy helpers.
- It names which controls must be hidden, disabled with reasons, or marked `deferred for public alpha`.
- It defines IA, navigation labels, lifecycle language, stack preset onboarding, local vs one-VPS mode copy, state taxonomy, failure copy, responsive behavior, accessibility criteria, and deferred-state rules.
- It intentionally avoids production code changes; implementation belongs to Frontend after this contract is accepted.
