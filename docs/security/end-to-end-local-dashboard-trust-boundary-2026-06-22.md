---
type: report
title: End-To-End Local Dashboard Trust-Boundary Review
created: 2026-06-22
tags:
  - security
  - public-alpha
  - local-dashboard
  - trust-boundary
---

# End-To-End Local Dashboard Trust-Boundary Review

Status: FAIL - release blockers found
Owner: Security
Audience: Routely Lead only
Reviewed HEAD: `cd91746`
Review date: 2026-06-22

## Scope

Executed SECURITY-01 item 1 in order.

Read required context:

- `AGENTS.md`
- `CONTEXT.md`
- `docs/00-product-brief.md`
- `docs/01-alpha-plan.md`
- `docs/03-demo-acceptance-plan.md`
- `docs/05-architecture.md`
- `docs/06-interfaces.md`
- `docs/07-security-and-risks.md`
- `docs/13-end-to-end-execution-plan.md`

Reviewed implementation surfaces:

- `apps/daemon/src/server.js`
- `apps/cli/src/index.ts`
- `apps/cli/src/ports.ts`
- `apps/web/src/lib/daemon.ts`
- `apps/web/src/app/api/**/route.ts`
- `apps/web/src/app/dashboard-client.tsx`
- `apps/web/src/lib/dashboard-operations.ts`
- `apps/web/src/lib/app-registry-form.ts`
- `packages/core/src/index.js`
- `packages/db/src/index.js`
- `packages/drivers/src/index.js`
- `packages/github/src/index.js`
- `packages/proxy/src/index.js`

Review focus:

- Local mode daemon/dashboard binding.
- Daemon/API and same-origin dashboard route boundaries.
- Production auth/admin token enforcement as seen through dashboard route handlers.
- Secrets/env redaction, local logs, and API DTOs.
- Untrusted dashboard text rendering.
- Local binding behavior for non-loopback host configuration.

## Result Summary

Release readiness is blocked for the local/dashboard trust boundary.

- Release blockers: 2 high-severity issues.
- Confirmed non-blocker issues: 1 medium-severity issue.
- Acceptable alpha risks: 4 documented risks.
- Unknowns: 4 items requiring live smoke or environment validation.

## Release Blockers

### SEC-E2E-LOCAL-01: Local daemon can bind to non-loopback without production auth or unsafe override

Severity: High
Release blocker: Yes
Affected owners: Backend, PM
Affected files/routes:

- `apps/daemon/src/server.js:156`
- `apps/daemon/src/server.js:245`
- `apps/daemon/src/server.js:248`
- `apps/daemon/src/server.js:2668`
- `apps/cli/src/index.ts:1120`
- Daemon private routes including `/apps`, `/apps/start-all`, `/apps/:id/start`, `/apps/:id/env`, `/domains`, `/deployments`, `/databases`, `/backups`, and `/notifications`.

Evidence:

- The daemon host is directly configurable through `ROUTELY_DAEMON_HOST` and defaults to loopback only when unset in `apps/daemon/src/server.js:156`.
- `app.listen` uses the configured host without a startup guard in `apps/daemon/src/server.js:2668`.
- Local-mode authorization returns true for every non-public path when `state.production` is false in `apps/daemon/src/server.js:245` and `apps/daemon/src/server.js:248`.
- The CLI `routely` launcher inherits the parent environment and only overrides `ROUTELY_DAEMON_PORT`, so an exported `ROUTELY_DAEMON_HOST=0.0.0.0` reaches the daemon in `apps/cli/src/index.ts:1120`.
- `docs/13-end-to-end-execution-plan.md` requires non-loopback local daemon binding to be blocked unless production auth is active or an explicit unsafe override is documented.

Impact:

If a local operator accidentally or intentionally sets `ROUTELY_DAEMON_HOST=0.0.0.0` without production mode/auth, the unauthenticated daemon control plane can be exposed to the local network. That exposes app lifecycle, env mutation, log, deploy, domain, backup, database, notification, and GitHub management routes.

Recommended fix:

- Backend: reject daemon startup when the host is not loopback and production auth is not active.
- Backend: if an unsafe local bind is intentionally supported, require an explicit scary override such as `ROUTELY_ALLOW_UNSAFE_DAEMON_BIND=1` and log the risk.
- PM: document the default local binding and any explicit unsafe override in public docs only after implementation exists.
- Tests: add daemon startup/CLI tests for default loopback, non-loopback rejection, production-auth allowance, and explicit unsafe override behavior.

### SEC-E2E-LOCAL-02: Dashboard route handlers can proxy the admin token without caller auth when dashboard env is misconfigured

Severity: High
Release blocker: Yes
Affected owners: Frontend, Backend
Affected files/routes:

- `apps/web/src/lib/daemon.ts:448`
- `apps/web/src/lib/daemon.ts:483`
- `apps/web/src/lib/daemon.ts:503`
- `apps/web/src/lib/daemon.ts:517`
- `apps/web/src/app/api/deployments/[id]/logs/stream/route.ts:8`
- `apps/web/src/app/api/deployments/[id]/logs/stream/route.ts:18`
- Same-origin dashboard routes under `apps/web/src/app/api/**/route.ts` that proxy private daemon operations.

Evidence:

- Dashboard caller auth is required only when `ROUTELY_ENV === "production"` in `apps/web/src/lib/daemon.ts:448`.
- If that condition is false, `isDashboardRequestAuthorized` returns true before checking caller credentials in `apps/web/src/lib/daemon.ts:483`.
- `daemonFetch` forwards the server-side `ROUTELY_ADMIN_TOKEN` to the daemon whenever the route is not marked public in `apps/web/src/lib/daemon.ts:503` and `apps/web/src/lib/daemon.ts:517`.
- The deployment log stream route repeats the same pattern by checking `isDashboardRequestAuthorized` and then forwarding `ROUTELY_ADMIN_TOKEN` in `apps/web/src/app/api/deployments/[id]/logs/stream/route.ts:8` and `apps/web/src/app/api/deployments/[id]/logs/stream/route.ts:18`.
- The interface contract says route handlers should require caller auth whenever production or admin-token signals exist and should never proxy an admin token for unauthenticated callers.

Impact:

If the daemon is production-protected and the dashboard process has `ROUTELY_ADMIN_TOKEN` but lacks `ROUTELY_ENV=production`, unauthenticated same-origin dashboard API callers can cause the web process to proxy the admin token to private daemon routes. A network-exposed dashboard would become the effective control-plane boundary.

Recommended fix:

- Frontend: require caller auth when `ROUTELY_ENV=production`, when `ROUTELY_ADMIN_TOKEN` is configured, or when a cached/probed daemon auth status says production/auth is required.
- Frontend: centralize the log stream route on the same auth/token-forwarding helper or share one guard.
- Backend/Frontend: add route-handler tests for `ROUTELY_ADMIN_TOKEN` set with `ROUTELY_ENV` unset, persisted production daemon state, and unauthenticated mutation attempts.

## Confirmed Issues

### SEC-E2E-LOCAL-03: CLI log command reads raw log files without known-secret redaction

Severity: Medium
Release blocker: No, if public docs warn that local app logs may contain sensitive output and demo screenshots avoid secrets
Affected owners: Backend, PM
Affected files/routes:

- `apps/cli/src/index.ts:1254`
- `apps/cli/src/index.ts:1266`
- `apps/daemon/src/server.js:1283`
- `apps/daemon/src/server.js:1292`

Evidence:

- The CLI `routely logs` command reads and prints the app log file directly in `apps/cli/src/index.ts:1254` and `apps/cli/src/index.ts:1266`.
- The daemon API path redacts known app secret values on read in `apps/daemon/src/server.js:1283` and `apps/daemon/src/server.js:1292`.
- Local command app logging writes child process stdout/stderr to disk before redaction; the daemon API redacts on response, but CLI output does not.

Impact:

Known stored secrets are protected in dashboard/API log responses, but CLI users can still print raw app log files. Local apps can also emit unknown sensitive values that Routely cannot infer. This is a solo-operator alpha risk, but public docs and screenshots must not imply logs are scrubbed universally.

Recommended fix:

- Backend: have `routely logs` resolve the app record and apply the same known-secret redaction before printing or following logs.
- PM: keep the public warning required by `docs/13-end-to-end-execution-plan.md` that app logs may contain sensitive output.

## Controls That Passed Static Review

- Default daemon bind is private loopback when `ROUTELY_DAEMON_HOST` is unset in `apps/daemon/src/server.js:156`.
- Production daemon private paths require bearer/admin token unless the route is explicitly public in `apps/daemon/src/server.js:245` through `apps/daemon/src/server.js:273`.
- Unauthenticated production daemon health suppresses app inventory and filesystem/data-dir diagnostics in `apps/daemon/src/server.js:1847` through `apps/daemon/src/server.js:1867`.
- Browser-side source did not contain direct daemon fetches; daemon fetches are in server-side route helpers and route handlers.
- Dashboard code did not contain `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `eval`, or `new Function` in `apps/web/src`.
- Env/secret inference includes common URL/URI/DSN keys, and public env DTOs redact inferred or explicit secrets in `packages/core/src/index.js`.
- React text rendering is used for logs, commit messages, branch names, app names, domains, and notification messages; no unsafe HTML sink was found in the inspected dashboard code.

## Acceptable Alpha Risks

- Local command and Compose apps execute code chosen by the solo operator in the configured workspace. This is inherent to Routely's local runner model.
- Local app processes inherit environment values unless overridden; operators must treat app commands as trusted code.
- Raw app log files on disk may contain sensitive app output. Dashboard/API responses redact known values, but the files themselves remain sensitive local artifacts.
- Dashboard links built from validated app ports/domains open external/local app targets. This is acceptable for solo local operations as long as Routely does not treat opened apps as trusted UI.

## Unknowns

- No live network bind smoke was run for `ROUTELY_DAEMON_HOST=0.0.0.0`; classification is based on static code review to avoid opening a listener.
- No browser XSS payload smoke was run for untrusted logs, commit messages, branch names, app names, or domains.
- No OS firewall or LAN exposure checks were run.
- No production dashboard deployment was started to validate env combinations beyond route-helper tests/static review.

## Exact Checks Performed

- Read the SECURITY-01 playbook at `.maestro/playbooks/2026-06-22-Routely-End-To-End-Execution/SECURITY-01.md`.
- Read required docs listed in scope.
- Enumerated `apps/web/src/app/api/**/route.ts` route handlers.
- Searched `apps/web/src` for direct daemon calls and unsafe HTML sinks with `rg` patterns including `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `ROUTELY_DAEMON_URL`, `127.0.0.1:9977`, and `localhost:9977`.
- Reviewed daemon auth/public-path logic, dashboard auth helper behavior, local CLI launcher, local port helpers, log helpers, redaction helpers, and dashboard rendering helpers.
- `npm run test --workspace apps/web`: passed, 15 test files and 62 tests.
- `node --check apps/daemon/src/server.js`: passed.
- `npm run test --workspace apps/cli`: failed; first run timed out in `src/local-demo.test.ts` after 20 seconds.
- `npm run test --workspace apps/cli -- src/local-demo.test.ts --reporter verbose`: failed; the package script still ran the full CLI suite, 90 tests passed and 1 timed out: `src/checkpoint4.test.ts > checkpoint 4 server foundation > returns serializable server doctor checks` after 5000 ms. The local-demo tests passed in this rerun.
- `npm run test --workspace packages/core && ...`: not applicable; package workspaces do not define `test` scripts. The command stopped at `@routely/core` with `Missing script: "test"`.
- `npm run lint --workspaces --if-present`: passed.
- `npm audit --omit=dev --audit-level=high`: exited 0; reported 2 moderate PostCSS/Next advisories and no high-severity production dependency finding.

## Owner Routing

| Finding | Severity | Blocker | Owner | Requested action |
| --- | --- | --- | --- | --- |
| SEC-E2E-LOCAL-01 | High | Yes | Backend | Block non-loopback local daemon bind unless production auth or explicit unsafe override is active. |
| SEC-E2E-LOCAL-02 | High | Yes | Frontend + Backend | Require caller auth whenever admin-token or production signals exist before proxying daemon admin token. |
| SEC-E2E-LOCAL-03 | Medium | No | Backend + PM | Redact known secrets in CLI log output or document CLI logs as sensitive local output. |
