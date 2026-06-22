---
type: report
title: End-To-End VPS And GitHub Trust-Boundary Review
created: 2026-06-22
tags:
  - security
  - public-alpha
  - one-vps
  - github
  - trust-boundary
---

# End-To-End VPS And GitHub Trust-Boundary Review

Status: FAIL - release blockers found
Owner: Security
Audience: Routely Lead only
Reviewed HEAD: `cd91746`
Review date: 2026-06-22

## Scope

Executed SECURITY-01 item 2 in order.

Read required context:

- `docs/07-security-and-risks.md`
- `docs/13-end-to-end-execution-plan.md`
- `apps/daemon/src/server.js`
- `packages/proxy/src/index.js`
- `packages/github/src/index.js`
- `packages/db/src/index.js`
- Relevant route handlers under `apps/web/src/app/api/`

Also cross-checked shared contracts in:

- `docs/03-demo-acceptance-plan.md`
- `docs/05-architecture.md`
- `docs/06-interfaces.md`
- `apps/web/src/lib/daemon.ts`
- `packages/core/src/index.js`
- `packages/drivers/src/index.js`

Review focus:

- One-VPS Docker/Compose/proxy exposure.
- DNS/proxy/HTTPS truthfulness.
- Production auth/admin token enforcement through daemon and dashboard route handlers.
- GitHub webhook signatures, replay/dedupe, and repo/branch authorization.
- Database internal exposure and backup metadata/file behavior.
- Notification outbound SSRF/open redirect behavior.
- Secret leakage and untrusted dashboard text rendering.

## Result Summary

Public alpha one-VPS/GitHub release readiness is blocked.

- Release blockers: 2 high-severity issues.
- Confirmed non-blocker issues: 1 medium-severity issue.
- Acceptable alpha risks: 5 documented risks.
- Unknowns: 6 items requiring live VPS/GitHub/DNS validation.

## Release Blockers

### SEC-E2E-VPS-01: Production app ports are published on all interfaces while proxy routes assume localhost targets

Severity: High
Release blocker: Yes
Affected owners: Backend, PM
Affected files/routes:

- `packages/drivers/src/index.js:39`
- `packages/drivers/src/index.js:147`
- `packages/drivers/src/index.js:160`
- `packages/drivers/src/index.js:161`
- `apps/daemon/src/server.js:1201`
- `apps/daemon/src/server.js:1202`
- `packages/proxy/src/index.js:104`
- Daemon deploy/domain/proxy routes: `/apps/:id/deployments`, `/domains`, `/domains/:hostname/verify`, `/proxy/routes`.

Evidence:

- Generated Compose services publish non-internal app ports as `${port}:${port}` in `packages/drivers/src/index.js:39`. Docker Compose host ports without an IP bind default to all interfaces.
- Dockerfile deployments run containers with `-p ${hostPort}:${containerPort}` in `packages/drivers/src/index.js:147`, `packages/drivers/src/index.js:160`, and `packages/drivers/src/index.js:161`. Docker host ports without an IP bind default to all interfaces.
- Compose production deployment records `hostPort = containerPort` for non-internal apps in `apps/daemon/src/server.js:1201` and `apps/daemon/src/server.js:1202`.
- Proxy route generation targets `http://127.0.0.1:${deployment.host_port}` in `packages/proxy/src/index.js:104`, which implies the app should be reachable by the proxy locally, not exposed directly to the public network.

Impact:

On a VPS, a successfully deployed app can be reachable directly on its host port in addition to the intended domain/TLS proxy path. That can bypass TLS, domain verification, proxy security headers, and any future proxy-level controls. For Dockerfile deploys this affects Routely-assigned high ports; for Compose deploys it can expose the configured service port.

Recommended fix:

- Backend: bind Dockerfile deployment ports to loopback explicitly, e.g. `127.0.0.1:${hostPort}:${containerPort}`.
- Backend: for generated Compose configs, bind published app ports to `127.0.0.1` or place apps on a proxy-only Docker network without public host publishing.
- Backend: add tests asserting Dockerfile and generated Compose app ports do not bind all interfaces.
- PM: do not claim one-VPS proxy/TLS safety until direct host-port exposure is fixed or documented as a hard limitation.

### SEC-E2E-VPS-02: Same-origin dashboard routes can proxy the admin token without caller auth when dashboard env is misconfigured

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
- Production/private dashboard API families under `apps/web/src/app/api/`: apps, deployments, domains, proxy, GitHub, env, databases, backups, metrics, and notifications.

Evidence:

- Dashboard auth is enabled only by `ROUTELY_ENV === "production"` in `apps/web/src/lib/daemon.ts:448`.
- If that env var is missing, `isDashboardRequestAuthorized` returns true before checking caller credentials in `apps/web/src/lib/daemon.ts:483`.
- `daemonFetch` still forwards the server-side `ROUTELY_ADMIN_TOKEN` to private daemon routes in `apps/web/src/lib/daemon.ts:503` and `apps/web/src/lib/daemon.ts:517`.
- The deployment log stream route has a separate fetch path that also forwards `ROUTELY_ADMIN_TOKEN` after the same dashboard auth check in `apps/web/src/app/api/deployments/[id]/logs/stream/route.ts:8` and `apps/web/src/app/api/deployments/[id]/logs/stream/route.ts:18`.
- SECURITY-01 acceptance requires dashboard same-origin route handlers to require caller auth for production/private mutations whenever production or admin-token signals exist, and never proxy an admin token for unauthenticated callers.

Impact:

On a VPS, an exposed dashboard process with `ROUTELY_ADMIN_TOKEN` but without `ROUTELY_ENV=production` can proxy privileged daemon mutations for unauthenticated callers. That affects deploys, domain/proxy changes, env/secrets, GitHub connections, database starts/stops, backup runs, notifications, logs, health refreshes, and metrics refreshes.

Recommended fix:

- Frontend: require caller auth when `ROUTELY_ADMIN_TOKEN` is configured, when `ROUTELY_ENV=production`, or when daemon `/auth/status`/`/server/status` indicates `requiresAuth` or production.
- Frontend: avoid forwarding the admin token unless the caller supplied a valid token or session.
- Backend/Frontend: add unauthenticated production mutation tests for every production route family and for the log stream route.

## Confirmed Issues

### SEC-E2E-VPS-03: Invalid-signature GitHub deliveries can poison delivery dedupe for the same delivery ID

Severity: Medium
Release blocker: No
Affected owners: Backend
Affected files/routes:

- `apps/daemon/src/server.js:2436`
- `apps/daemon/src/server.js:2455`
- `apps/daemon/src/server.js:2456`
- `apps/daemon/src/server.js:2463`
- `apps/daemon/src/server.js:2468`
- `apps/daemon/src/server.js:2480`
- `packages/db/src/index.js:1865`
- `packages/db/src/index.js:1871`
- Public webhook route: `/github/webhook` through daemon and same-origin `apps/web/src/app/api/github/webhook/route.ts`.

Evidence:

- The webhook handler records rejected invalid-signature requests using the caller-supplied delivery ID in `apps/daemon/src/server.js:2455` through `apps/daemon/src/server.js:2463`.
- The same `recordGithubWebhookDelivery` helper uses `INSERT OR IGNORE` keyed only by `delivery_id` in `packages/db/src/index.js:1865` and `packages/db/src/index.js:1871`.
- A later valid signed delivery with the same delivery ID reaches the normal record path in `apps/daemon/src/server.js:2468`, sees `inserted === false`, and returns duplicate/already processed in `apps/daemon/src/server.js:2480`.

Impact:

An unauthenticated caller cannot forge a valid webhook action without the secret, but they can create rejected delivery records. If an attacker can guess, learn, or race a real delivery ID, the valid GitHub delivery can be suppressed as a duplicate. This is primarily a targeted deploy-denial risk rather than code execution.

Recommended fix:

- Backend: do not insert invalid-signature deliveries into the same dedupe keyspace used for valid deliveries, or allow a later valid signature to replace a previously rejected delivery.
- Backend: add tests for invalid-first then valid-same-delivery-ID behavior.
- Backend: consider rate limiting or low-detail logging for invalid webhook attempts.

## Controls That Passed Static Review

- GitHub webhook signatures use HMAC SHA-256 and `timingSafeEqual` in `packages/github/src/index.js`.
- GitHub webhook body parsing preserves `rawBody` before JSON parsing in `apps/daemon/src/server.js`, allowing signature checks over the raw payload.
- GitHub push filtering requires `refs/heads/*`, a non-zero commit SHA, and configured repo/branch mappings before deploy queueing.
- Production daemon private endpoints require admin token when production mode is active in `apps/daemon/src/server.js:245` through `apps/daemon/src/server.js:273`.
- DNS verification checks A records against `ROUTELY_SERVER_PUBLIC_IP` and keeps TLS as pending/issuing rather than claiming certificate success.
- Proxy routes are not generated for internal/database apps in `packages/proxy/src/index.js:92` through `packages/proxy/src/index.js:98`.
- Production database services are created as `internal: true`, generated Compose configs omit `ports` for internal services, and database DTOs expose env keys rather than env values.
- Backup DTOs expose file name, size, status, and metadata only; they do not include download URLs or serve backup files.
- Notification targets reject non-HTTP(S), credentials, private/loopback/link-local DNS answers, and redirects to unsafe targets in `apps/daemon/src/server.js:1609` through `apps/daemon/src/server.js:1656`.
- Env/secret DTOs redact inferred secrets, including URL/URI/DSN-shaped keys, in `packages/core/src/index.js`.
- Dashboard code uses React text rendering for untrusted logs, GitHub metadata, app names, branch names, domains, and messages; no unsafe HTML sink was found in `apps/web/src`.

## Acceptable Alpha Risks

- Notification SSRF controls validate hostnames before fetch and revalidate redirects, but they do not pin the resolved address to the socket connection. DNS rebinding between validation and connect remains a residual risk. Do not claim complete outbound webhook SSRF prevention until a pinned lookup/client strategy exists.
- GitHub repo authorization is based on the signed GitHub payload's `repository.full_name` and branch mapping, not installation/repository ID enforcement at webhook time. This is acceptable for a solo-operator alpha when the GitHub App webhook secret stays server-side, but stronger repository ID checks would improve defense-in-depth.
- Backup jobs allow an authenticated admin to choose `localDir`; backups are sensitive local files and are not served by Routely. This is acceptable for a solo admin but must be documented as a filesystem trust decision.
- One-VPS operations depend on host firewall, Docker daemon posture, DNS provider behavior, and Traefik/ACME runtime behavior that were not live-validated in this static review.
- `npm audit --omit=dev --audit-level=high` reported 2 moderate PostCSS/Next advisories and no high-severity production dependency finding. Track the moderate advisory separately; the suggested forced fix is breaking.

## Unknowns

- No disposable VPS smoke was run, so actual public port exposure, host firewall behavior, Docker networking, and Traefik reachability were not observed live.
- No real DNS/ACME/TLS issuance was tested, so DNS/proxy/HTTPS truthfulness is based on code paths and tests rather than external certificate state.
- No real GitHub webhook delivery was sent, so signature/dedupe/repo-branch behavior was reviewed statically and through existing tests only.
- No live notification target was exercised against redirect or DNS-rebinding infrastructure.
- No backup command was executed against a real production database container.
- No browser smoke was run with malicious log text, commit messages, app names, or domain names.

## Exact Checks Performed

- Read the SECURITY-01 playbook at `.maestro/playbooks/2026-06-22-Routely-End-To-End-Execution/SECURITY-01.md`.
- Read required docs listed in scope.
- Reviewed route handlers under `apps/web/src/app/api/` for proxy behavior and caller auth handling.
- Reviewed `apps/daemon/src/server.js` for auth hooks, public paths, deploys, domain/proxy, GitHub webhooks, env/logs, databases, backups, metrics, and notifications.
- Reviewed `packages/proxy/src/index.js`, `packages/github/src/index.js`, `packages/db/src/index.js`, `packages/core/src/index.js`, and `packages/drivers/src/index.js` for route generation, signature checks, persistence/dedupe, DTO redaction, and Docker/Compose args.
- Searched `apps/web/src` for direct daemon calls and unsafe HTML sinks with `rg` patterns including `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `ROUTELY_DAEMON_URL`, `127.0.0.1:9977`, and `localhost:9977`.
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
| SEC-E2E-VPS-01 | High | Yes | Backend | Bind production app ports to loopback/proxy-only networking instead of all interfaces. |
| SEC-E2E-VPS-02 | High | Yes | Frontend + Backend | Require caller auth before forwarding `ROUTELY_ADMIN_TOKEN` from dashboard routes. |
| SEC-E2E-VPS-03 | Medium | No | Backend | Prevent invalid-signature webhook records from poisoning valid delivery dedupe. |
