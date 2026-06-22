# Routely End-To-End Execution Plan

Status: PM execution plan
Owner: PM
Last updated: 2026-06-22

## Purpose

This plan turns the user's direction into agent-ready execution for Routely's public alpha: one light control plane that can run locally or on one VPS, start many apps together, stop or disable individual apps, and provide a simple dashboard for deploying common app stacks.

The plan does not replace the existing canonical docs. It sharpens execution across roles for the same public-alpha demos in `docs/01-alpha-plan.md` and the same acceptance gates in `docs/03-demo-acceptance-plan.md`.

Reference inspiration:

- 9Router: lightweight local command, fast status loop, and simple dashboard feel: https://github.com/decolua/9router
- Dokploy: self-hosted one-VPS PaaS concepts such as apps, Compose/Docker deploys, domains, env, logs, databases, backups, monitoring, GitHub, and notifications: https://github.com/Dokploy/dokploy

## User Direction

The product should feel like this:

1. Run `routely` and Routely boots the local control plane automatically.
2. Click one Start action and every enabled app starts together.
3. Stop, disable, or inspect one app without removing it from the registry.
4. Use the same mental model locally and on one VPS.
5. Deploy reasonable stacks through a clear dashboard instead of bespoke shell scripts.
6. Keep UI/UX lightweight, obvious, and low-ceremony: 9Router-like simplicity with Dokploy-inspired operational surfaces.

## Self-Grill Decisions

### What is the exact product promise?

Routely is not only a deploy tool. Routely is a dashboard-first app operations control plane for a solo operator who wants one registry and one operational loop from laptop to one VPS.

### What does “any stack within reason” mean?

Routely should support bounded stack presets, not unlimited magic. Public alpha can support or honestly guide these paths:

- Command app for local development.
- Compose-backed app for local and VPS parity.
- Dockerfile-backed app as a bridge where already implemented.
- Common Node/static app through a preset only when it maps cleanly to command, Dockerfile, or Compose.
- Managed database service as an internal-by-default dependency.

Unsupported stacks must be shown as manual/deferred, not fake-supported.

### What must never be faked?

Routely must never show fake success for deploys, health, DNS, proxy routing, HTTPS/TLS, backups, restore, GitHub webhooks, notifications, or secret storage. Unknown, pending, generated, failed, deferred, and verified states need separate copy and visual states.

### What is the highest test seam?

Use behavior-level seams rather than implementation details:

- CLI seam for `routely`, local registry, Start All, stop, disable, logs, and local demo behavior.
- Dashboard same-origin `/api/*` route seam for browser-safe UI behavior.
- Daemon/API seam for production mutations, auth, deploy state, logs, domain/proxy, GitHub, env/secrets, databases, backups, metrics, and notifications.

### What should UI optimize for?

The dashboard should first answer: what is running, what is enabled, what changed recently, what failed, and what action should I take next? Navigation should be shallow, actions should be named in plain language, and deferred controls should be hidden or clearly labeled.

## Execution Waves

### Wave 0: PM And Lead Alignment

Owner: PM, Routely Lead

Outcome: the work is ready for role execution without scope drift.

- Confirm this document stays tied to the three public-alpha demos.
- Confirm GitHub triage labels exist before publishing issue work items: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`.
- Launch the role playbooks from `.maestro/playbooks/2026-06-22-Routely-End-To-End-Execution/` in dependency order.
- Keep unrelated dirty worktree changes out of PM commits and role commits.

### Wave 1: UI/UX Operating Model

Owner: UI/UX

Outcome: executable design criteria before broad frontend implementation.

- Define the 9Router-light information architecture for local and one-VPS use.
- Define state language for enabled, disabled, running, stopped, starting, stopping, failed, pending, generated, verified, deferred, and unavailable.
- Define the primary dashboard flow: register/import app, select stack preset, Start All, stop one app, disable one app, inspect logs/health, deploy to VPS, diagnose failure.
- Produce responsive and accessibility criteria for desktop, tablet, and mobile.
- Hand off concrete frontend criteria under `docs/qa/` or another PM-approved docs path without editing production code.

### Wave 2: Backend Runtime And Contracts

Owner: Backend

Outcome: every demo-critical action has a real, tested contract or honest deferred state.

- Harden `routely` local bootstrap, daemon readiness, registry normalization, and local lifecycle behavior.
- Verify stack preset data flows through config, SQLite state, daemon DTOs, and dashboard APIs.
- Harden Start All, per-app stop, disable-for-future-starts, dependencies, logs, health, and port conflict handling.
- Harden one-VPS auth, Compose/Docker deploy bridge, domain/proxy/TLS truthfulness, env/secrets redaction, deploy history, logs, GitHub webhook trust, databases, backups, metrics, and notifications.
- Add tests at CLI, daemon/API, and package seams where behavior changes.

### Wave 3: Frontend Dashboard Implementation

Owner: Frontend

Outcome: the dashboard demonstrates local and one-VPS operations with real data and honest states.

- Read the relevant Next.js 16 docs under `node_modules/next/dist/docs/` before changing `apps/web`.
- Use same-origin `/api/*` route handlers only; browser code must not call the daemon directly.
- Implement lightweight dashboard IA, app onboarding/editing, stack preset display, Start All, per-app stop/disable, logs, health, deploy history, domains, env/secrets, GitHub, databases, backups, notifications, and server status where backend contracts exist.
- Hide, disable, or mark unsupported actions as deferred with explicit copy.
- Preserve real-data behavior in tests and dashboard smoke checks.

### Wave 4: QA And Security Validation

Owner: QA E2E, Security

Outcome: reports identify pass/fail status for the public-alpha release gate.

- QA validates local dashboard-first demo, one-VPS demo, GitHub redeploy demo, responsive dashboard behavior, and intentional failure diagnosis.
- Security validates auth, secrets, GitHub webhooks, outbound notifications, Docker/Compose/proxy exposure, backups, untrusted dashboard text, local bindings, and report truthfulness.
- QA and Security write reports only; they do not commit their own reports.
- Routely Lead collects both reports and routes coordinated findings back to PM.

### Wave 5: Release Readiness

Owner: Routely Lead, PM, Backend, Frontend

Outcome: Routely is ready for public alpha when all three demos pass from public docs.

- Fix blocker findings routed from QA/Security.
- Rewrite public README only after commands and screenshots are verified.
- Ensure unsupported scope remains clear in docs.
- Cut a release-readiness summary with exact commands, environment, known deferred scope, and remaining risks.

## Vertical Slices

### Slice 1: One-Command Local Bootstrap

Demo target: Local dashboard-first demo.

Owners: Backend, Frontend, QA, Security.

Blocked by: none.

Acceptance:

- `routely` starts the local runtime and dashboard path predictably.
- Dashboard shows daemon/server readiness from real status.
- Failure to bind ports or start the daemon returns actionable errors.
- Local security posture is clear: private local binding by default and no raw secret/log leakage.
- Non-loopback local daemon binding is blocked unless production auth is active or an explicit unsafe override is documented.

Verification:

- CLI lifecycle tests and web server-status route tests pass.
- QA can start from a clean workspace using public docs only.

### Slice 2: App Registry And Stack Presets

Demo target: Local demo and one-VPS setup.

Owners: PM, UI/UX, Backend, Frontend.

Blocked by: Slice 1.

Acceptance:

- Dashboard can create or edit a managed app with name, path/source, enablement, driver, command/Compose/Dockerfile metadata, ports, env metadata, dependencies, healthcheck, and optional domain metadata.
- Stack presets explain supported paths and unsupported/deferred paths honestly.
- Public-alpha create/edit choices expose only verified drivers and presets as selectable; compatibility-only or non-demo options stay read-only, hidden, or labeled `deferred for public alpha`.
- Registry state is consistent across `routely.yml`, SQLite/runtime state, daemon DTOs, and dashboard APIs.

Verification:

- Registry normalization and dashboard API tests cover enabled/disabled apps, command apps, Compose-backed apps, and unsupported preset states.

### Slice 3: Start All, Stop, Disable, Logs, Health

Demo target: Local dashboard-first demo.

Owners: Backend, Frontend, QA, Security.

Blocked by: Slice 2.

Acceptance:

- Start All starts every enabled app and skips disabled apps with clear reason copy.
- Stop affects the running app now; disable excludes the app from future Start All without deleting it.
- Logs, status, health, dependency, crash, and port conflict states are visible and actionable.
- Dashboard shell, module headers, app rows, and primary actions remain readable and reachable at mobile, tablet, and desktop widths without horizontal page overflow.

Verification:

- CLI tests and dashboard API tests cover enabled filtering, stop vs disable semantics, port conflict, app crash, logs, and health unavailable states.
- QA records local smoke results for desktop/tablet/mobile, including a viewport overflow assertion at 375px, 768px, and 1280px.

### Slice 4: One-VPS Bootstrap And Auth

Demo target: One-VPS Compose operations demo.

Owners: Backend, Frontend, QA, Security.

Blocked by: Slice 2.

Acceptance:

- Production init/doctor reports server readiness.
- Private mutation operations require production auth/admin token.
- Dashboard same-origin route handlers require caller auth for production/private mutations whenever a production or admin-token signal exists, and never proxy an admin token for unauthenticated callers.
- Dashboard server status separates local, production-ready, production-blocked, and auth-missing states.
- Public unauthenticated production health/status responses avoid absolute filesystem path and data-directory metadata.

Verification:

- Auth, doctor/status, and production mutation tests pass.
- Security confirms unauthenticated mutations fail.

### Slice 5: Deploy, Domain, Proxy, HTTPS Truth

Demo target: One-VPS Compose operations demo.

Owners: Backend, Frontend, QA, Security.

Blocked by: Slice 4.

Acceptance:

- One managed app deploys on one VPS through the verified runtime path.
- Domain verification, generated proxy route, HTTPS/TLS, latest successful deployment, deploy phases, and failure logs are represented separately.
- All deploy entry points, including app inspector controls, use the same server, Docker, data-dir, auth, daemon, path, enablement, and driver blocker semantics.
- UI avoids success copy/colors for generated, pending, failed, or unverified states.

Verification:

- Deploy/domain/proxy tests pass.
- QA runs a disposable VPS smoke with a real domain.
- Security audits Docker/Compose/proxy exposure and TLS truthfulness.

### Slice 6: GitHub Redeploy Diagnosis

Demo target: GitHub redeploy and diagnosis demo.

Owners: Backend, Frontend, QA, Security.

Blocked by: Slice 5.

Acceptance:

- GitHub App metadata is configured server-side.
- Webhook signatures are validated and deliveries are deduped where practical.
- Only configured repo/branch mappings trigger deploy.
- Dashboard shows latest delivery, ignored events, deploy phase, commit metadata, failure reason, and log path.

Verification:

- GitHub route/webhook tests pass.
- QA records one successful push and one intentional failed deploy.
- Security audits webhook replay, repo authorization, and untrusted text rendering.

### Slice 7: Operations Surfaces

Demo target: One-VPS operations and release confidence.

Owners: Backend, Frontend, QA, Security.

Blocked by: Slice 5.

Acceptance:

- Env/secrets store only redacted public metadata after save.
- URL/DSN/URI-shaped env values and common connection-string keys are treated as secret by default and never rendered raw in API DTOs, dashboard text, logs, screenshots, or exported config.
- Database services are internal-only by default.
- Backup jobs/runs expose status and local-file metadata without unsafe restore promises.
- Backup DTOs and dashboard copy prefer file name, storage class, size, and status over absolute host paths except in authenticated diagnostics.
- Metrics, health, logs, deploy history, and notifications show real data or honest unavailable/deferred states.
- Notification targets revalidate redirects and final DNS/address resolution against private, loopback, and link-local restrictions before public docs claim outbound webhook safety.
- Health and metrics retention is bounded or explicitly documented as alpha behavior.

Verification:

- Env/database/backup/metrics/notifications tests pass.
- Security validates redaction and outbound notification trust boundaries.

### Slice 8: Release Docs And Final Gate

Demo target: all three public-alpha demos.

Owners: Lead, PM, Backend, Frontend, QA, Security.

Blocked by: Slices 1-7.

Acceptance:

- Public docs let a new solo operator run local, one-VPS, and GitHub demos without private chat context.
- Public docs warn that registered local command apps run through the user's shell in the configured path with inherited environment, and that app logs may contain sensitive output.
- QA and Security reports exist and are routed.
- Known deferred scope is explicit and not shown as implemented.
- README commands match verified behavior.

Verification:

- `npm run lint`, relevant workspace tests, and demo smoke checks pass or failures are documented with ownership.

## Role Handoff Contract

- PM owns scope, acceptance criteria, vertical-slice issues, and docs consistency.
- UI/UX owns executable design criteria before broad dashboard implementation.
- Backend owns CLI, daemon, packages, storage, runtime drivers, deploy contracts, proxy/domain/GitHub/env/logs/database/backup/notification contracts, and backend tests.
- Frontend owns Next.js route handlers, dashboard UI, real-data state rendering, responsive behavior, and frontend tests.
- QA E2E owns dated smoke reports and does not commit reports.
- Security owns dated trust-boundary reports and does not commit reports.
- Routely Lead owns launch order, final routing, QA/Security report commits, and release-readiness coordination.

## Issue Tracker Readiness

GitHub is the issue tracker for agent-created work items, but the repository currently needs the Matt Pocock triage labels before strict `ready-for-agent` issue publishing can happen. The required labels are:

- `needs-triage`
- `needs-info`
- `ready-for-agent`
- `ready-for-human`
- `wontfix`

Until those labels exist, the executable work items live in the Maestro playbooks under `.maestro/playbooks/2026-06-22-Routely-End-To-End-Execution/`.

## Playbook Launch Order

1. `LEAD-01.md` to confirm launch order and guardrails.
2. `PM-01.md` to publish/prepare issue tracker work items when labels are ready.
3. `UIUX-01.md` to define design criteria.
4. `BACKEND-01.md` for runtime/API contracts and tests.
5. `FRONTEND-01.md` after UI/UX criteria and backend contracts are available.
6. `QA-01.md` after implementation commits are available.
7. `SECURITY-01.md` after implementation commits are available.
8. `LEAD-02.md` to collect reports, route fixes, and decide release readiness.

## Out Of Scope For This Plan

- Multi-tenant teams, RBAC, billing, organizations, or enterprise audit workflows.
- Kubernetes.
- Broad VPS administration unrelated to Routely-managed apps.
- Public app catalog as a public-alpha feature.
- Unlimited automatic stack detection beyond documented stack presets.
- External backup providers and destructive restore automation.
- Preview deployments and advanced rollback orchestration.
