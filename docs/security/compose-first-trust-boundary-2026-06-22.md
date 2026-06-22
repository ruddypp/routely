---
type: report
title: Compose-First Trust-Boundary Security Validation
created: 2026-06-22
tags:
  - security
  - compose-first
  - public-alpha
  - trust-boundary
related:
  - '[[Routely Security And Risk Reference]]'
  - '[[ALPHA-01 Security Validation]]'
  - '[[Routely Compose-First Security Validation]]'
---

# Compose-First Trust-Boundary Security Validation

Status: NEEDS FIX
Owner: Security
Audience: Routely Lead only
Reviewed HEAD: `1ddfb4e`
Review date: 2026-06-22

## Scope

Reviewed required context:

- `AGENTS.md`
- `CONTEXT.md`
- `docs/00-product-brief.md`
- `docs/01-alpha-plan.md`
- `docs/02-team-execution-plan.md`
- `docs/03-demo-acceptance-plan.md`
- `docs/04-docs-map.md`
- `docs/05-architecture.md`
- `docs/06-interfaces.md`
- `docs/07-security-and-risks.md`
- `.maestro/playbooks/2026-06-22-Routely-Compose-First-Execution/BACKEND-01.md`
- `.maestro/playbooks/2026-06-22-Routely-Compose-First-Execution/FRONTEND-01.md`
- Recent Compose-first commits from `dd0f642` through `1ddfb4e`

Reviewed implementation surfaces:

- Daemon auth, public paths, health, app lifecycle, deploy, domain/proxy, GitHub webhook, env/secrets, logs, metrics, backups, databases, and notifications in `apps/daemon/src/server.js`.
- Dashboard route-handler proxy/auth behavior in `apps/web/src/lib/daemon.ts` and `apps/web/src/app/api/**/route.ts`.
- Dashboard rendering and operational labels in `apps/web/src/app/dashboard-client.tsx` and `apps/web/src/lib/dashboard-operations.ts`.
- Public DTO/redaction helpers in `packages/core/src/index.js`.
- Persistence/query helpers in `packages/db/src/index.js`.
- Docker/Compose/GitHub/proxy helper packages in `packages/drivers/`, `packages/github/`, and `packages/proxy/`.

## Executive Summary

Compose-first added useful security controls: signed GitHub webhooks, delivery dedupe, branch/repo matching, conservative DNS/TLS labels, internal-by-default databases, non-served backup files, React text rendering, and secret-aware deployment-log redaction when values are explicitly marked secret.

The release gate is not green yet. Two release-blocking issues remain from the alpha review and are more important now that the dashboard exposes production operations: dashboard auth can be disabled by an env mismatch while still forwarding the daemon admin token, and common secret URL values such as `DATABASE_URL` can be treated as non-secret and rendered raw. Notification SSRF hardening also needs a redirect/DNS-rebinding pass before public one-VPS guidance should claim outbound webhook safety.

## Findings

### SEC-COMPOSE-01: Dashboard route auth can be disabled while route handlers still proxy the admin token

Severity: High
Status: Still open from `SEC-ALPHA01-01`, severity raised for Compose-first production operations
Affected owners: Frontend, Backend, PM

Evidence:

- Dashboard auth is enabled only when `process.env.ROUTELY_ENV === "production"` in `apps/web/src/lib/daemon.ts:448`.
- Dashboard route handlers reject callers through `isDashboardRequestAuthorized`, but `daemonFetch` forwards `ROUTELY_ADMIN_TOKEN` server-side to daemon requests whenever the token exists in `apps/web/src/lib/daemon.ts:503` and `apps/web/src/lib/daemon.ts:517`.
- The daemon's production mode is independent: it checks `ROUTELY_SERVER_MODE === "production"` or persisted server foundation state in `apps/daemon/src/server.js:164` and authorizes via bearer/admin-token logic in `apps/daemon/src/server.js:244`.
- Compose-first route handlers now cover high-impact actions: deploys, domains/proxy, env/secrets, databases/backups, notifications, logs, metrics, and GitHub operations under `apps/web/src/app/api/**/route.ts`.

Impact:

If the daemon is protected with a production admin token but the dashboard process is missing `ROUTELY_ENV=production`, same-origin dashboard API routes do not require a caller token. Those routes can still forward the server-side `ROUTELY_ADMIN_TOKEN` to protected daemon mutation paths. A network-exposed dashboard would then become the effective control-plane boundary instead of admin-token auth.

Reproduction notes:

1. Start the daemon in production or with initialized production state and `ROUTELY_ADMIN_TOKEN` configured.
2. Start the dashboard with `ROUTELY_ADMIN_TOKEN` configured but without `ROUTELY_ENV=production`.
3. Call a dashboard mutation route such as `/api/apps/{id}/deployments`, `/api/apps/{id}/env`, `/api/backups/{id}/run`, or `/api/notifications/{id}/test` without a caller bearer token.
4. Expected secure behavior: HTTP 401. Current code path: dashboard auth is skipped and the server-side token can be forwarded to the daemon.

Remediation:

- Frontend: require dashboard caller auth whenever any production signal is true: `ROUTELY_ENV=production`, `ROUTELY_SERVER_MODE=production`, persisted production state if available, or `ROUTELY_ADMIN_TOKEN` is configured.
- Frontend: default-deny all mutating route handlers when an admin token exists unless the caller provides the matching token.
- Frontend: add route-handler tests for `ROUTELY_SERVER_MODE=production` and `ROUTELY_ADMIN_TOKEN` with `ROUTELY_ENV` unset.
- Backend/PM: document one canonical production-mode contract for daemon and dashboard processes, then align README and example service env.

### SEC-COMPOSE-02: Common secret URL env values can be classified as plain values and rendered raw

Severity: High
Status: Still open from `SEC-ALPHA01-02`, expanded with Compose-first env/secrets evidence
Affected owners: Backend, Frontend

Evidence:

- Secret inference only matches env keys containing `SECRET`, `TOKEN`, `PASSWORD`, `PRIVATE`, or `KEY` in `packages/core/src/index.js:15` and `packages/core/src/index.js:847`.
- `normalizeAppEnvInput` defaults `isSecret` from that key heuristic in `packages/core/src/index.js:862`.
- `appEnvVarToPublicDto` returns raw `value` and `displayValue` whenever `is_secret` is false in `packages/core/src/index.js:872`.
- `appToPublicDto` exposes non-internal, non-database app `env` after `filterExportableEnv`; `DATABASE_URL` is not filtered by the current pattern in `packages/core/src/index.js:464` and `packages/core/src/index.js:952`.
- Deployment/app log redaction only uses values stored as secret app env vars through `listSecretValuesForApp` in `packages/db/src/index.js:910` and `redactForApp` in `apps/daemon/src/server.js:864`.
- Focused check confirmed `DATABASE_URL=postgres://user:pass@example/db` is normalized with `isSecret: false`, returned raw by `appEnvVarToPublicDto`, and left in `filterExportableEnv`.

Impact:

Common secret-bearing values such as `DATABASE_URL`, `REDIS_URL`, `MONGODB_URI`, `SENTRY_DSN`, `WEBHOOK_URL`, or provider-specific URLs can appear in API responses, dashboard text, logs, or screenshots if the user does not explicitly mark them secret. This conflicts with the public-alpha rule that raw secrets are never rendered after save.

Reproduction notes:

```bash
node --input-type=module <<'NODE'
import { normalizeAppEnvInput, appEnvVarToPublicDto, filterExportableEnv } from './packages/core/src/index.js';
const normalized = normalizeAppEnvInput({ key: 'DATABASE_URL', value: 'postgres://user:pass@example/db' });
console.log(normalized);
console.log(appEnvVarToPublicDto({ id: 1, app_id: 1, key: normalized.key, value: normalized.value, is_secret: normalized.isSecret ? 1 : 0, scope: normalized.scope, needs_restart: 1, needs_redeploy: 1 }));
console.log(filterExportableEnv({ DATABASE_URL: normalized.value }));
NODE
```

Remediation:

- Backend: treat URL/DSN/URI env keys as secret by default, especially `DATABASE_URL`, `REDIS_URL`, `MONGODB_URI`, `POSTGRES_URL`, `MYSQL_URL`, `SENTRY_DSN`, `WEBHOOK_URL`, and provider connection strings.
- Backend: consider making app env public DTOs metadata-only by default, with explicit opt-in for non-secret display.
- Backend: include secret-like values from `routely.yml` app env in log redaction, not only rows in `app_env_vars`.
- Frontend: keep `safeEnvDisplay` but do not rely on it as the primary control; require backend DTOs to avoid raw secret values.
- Add tests for `/apps`, `/apps/:id/env`, `/apps/:id/logs`, deployment logs, and dashboard rendering with URL-shaped secret values.

### SEC-COMPOSE-03: Notification URL SSRF guard does not revalidate redirects or pin DNS resolution

Severity: Medium
Affected owner: Backend

Evidence:

- `safeOutboundUrl` rejects non-HTTP(S), credentials, and DNS answers that are private, loopback, or link-local in `apps/daemon/src/server.js:1588`.
- Notification delivery then calls `fetch(url, ...)` with default redirect behavior in `apps/daemon/src/server.js:1641`.
- The outbound request is made by hostname after the safety lookup, so DNS can change between validation and fetch, and redirects are not revalidated against the same private-address policy.
- Failed notification attempts store up to 240 bytes of response body in `apps/daemon/src/server.js:1647`, then expose the attempt message through `notificationAttemptToPublicDto` in `packages/core/src/index.js:205`.

Impact:

A configured public notification endpoint can redirect Routely to internal services, or a DNS-rebinding hostname can pass lookup and resolve privately during `fetch`. The current payload is a POST JSON body and short timeout limits impact, but this still violates the intended boundary that notification targets cannot reach loopback/private/link-local infrastructure.

Reproduction notes:

1. Configure a webhook/Discord notification URL to a public host that returns `302 Location: http://127.0.0.1:9977/server/status` or another private target.
2. Trigger `POST /notifications/{id}/test` or a deploy/backup notification.
3. Current code path validates the original URL, then `fetch` can follow the redirect without re-checking the target address.

Remediation:

- Backend: set `redirect: "manual"` for notification fetches and reject 3xx redirects unless the new location passes the same safety checks.
- Backend: resolve the hostname immediately before connect and prevent private-address connections after redirects; consider using an HTTP client hook or socket lookup override that pins the validated address.
- Backend: add tests for redirect-to-loopback, DNS rebinding simulation, IPv4-mapped IPv6, and localhost-equivalent hostnames.
- Backend: redact or classify response snippets from failed webhooks as untrusted external text in notification attempts.

### SEC-COMPOSE-04: Public daemon health/status routes still expose filesystem metadata

Severity: Low
Status: Still open from `SEC-ALPHA01-04`
Affected owner: Backend

Evidence:

- `/health`, `/server/status`, and `/auth/status` are public daemon paths in `apps/daemon/src/server.js:263`.
- `/health` returns absolute `workspace` and `database` paths in `apps/daemon/src/server.js:1795`.
- In unauthenticated production, `/health` hides app inventory, but path and server state remain public in `apps/daemon/src/server.js:1805`.
- The daemon defaults to `127.0.0.1` in `apps/daemon/src/server.js:155`, so this is mainly exposed when a deployment binds or proxies the daemon publicly.

Impact:

Absolute paths disclose deployment layout, usernames, and data-directory choices. This is unnecessary for public unauthenticated liveness and increases the blast radius of daemon misbinding or proxy mistakes.

Reproduction notes:

Call `GET /health` on a production daemon without an admin token. The response suppresses `apps` but includes path metadata.

Remediation:

- Backend: split minimal public liveness from authenticated diagnostic health.
- Backend: remove `workspace`, `database`, and detailed readiness path data from unauthenticated production responses.
- Backend: add a production unauthenticated health test asserting no absolute path disclosure.

### SEC-COMPOSE-05: Backup DTOs expose full local path metadata despite correctly not serving files

Severity: Low
Affected owners: Backend, Frontend

Evidence:

- Backup jobs can accept a custom `localDir` in `apps/daemon/src/server.js:2224`.
- Backup runs save full `filePath` metadata in `apps/daemon/src/server.js:1735`.
- Public backup DTOs expose `localDir`, `filePath`, and nested file `path` while also correctly setting `downloadUrl: null`, `servesFile: false`, and `restoreStatus: "deferred"` in `packages/core/src/index.js:624` and `packages/core/src/index.js:661`.
- Dashboard labels treat backup files as metadata-only and restore as deferred in `apps/web/src/lib/dashboard-operations.ts:261` and `apps/web/src/lib/dashboard-operations.ts:270`.

Impact:

Backup files are not publicly served, which satisfies the most important control. However, full paths can leak host layout and sensitive naming through API responses, screenshots, or support logs. This is low severity for an authenticated solo-operator dashboard, but unnecessary path exposure should be reduced before public docs encourage production backup screenshots.

Reproduction notes:

Create a backup job with a custom `localDir`, run it, then call `/api/backups` or daemon `/backups`. Responses include full local directory/path metadata.

Remediation:

- Backend: return `fileName`, size, status, and storage class by default; include absolute paths only in an authenticated diagnostic endpoint or CLI command.
- Frontend: prefer rendering file name and storage status instead of absolute path.
- PM/Docs: keep restore limitations explicit: backups are local metadata-only in this alpha and destructive restore automation is deferred.

### SEC-COMPOSE-06: Health and metrics reads are capped in responses but retained indefinitely in SQLite

Severity: Low
Affected owner: Backend

Evidence:

- Healthchecks are listed by app without a retention policy in `packages/db/src/index.js:1111`.
- Metric reads default to the latest 30 app/host samples in `packages/db/src/index.js:1136` and `packages/db/src/index.js:1146`.
- I found no prune/delete path for old metric or health samples during the focused retention search.

Impact:

Health and metrics samples are not highly sensitive in the current alpha, but indefinite retention can grow the SQLite database and keep operational history longer than expected. In public alpha docs, “latest 30 displayed” should not be mistaken for “only 30 retained.”

Reproduction notes:

Repeatedly call `/metrics`, `/apps/{id}/metrics`, and `/apps/{id}/health`; only the latest 30 samples are returned, but older rows remain in SQLite.

Remediation:

- Backend: add retention pruning for metrics and health samples, or document the alpha retention behavior explicitly.
- Backend: add tests for retention once a policy is chosen.

## Validated Controls

- Same-origin browser boundary: dashboard browser code uses `/api/*`; daemon access is concentrated in server-side route handlers/helpers. No direct browser fetch to `127.0.0.1:9977` was found in `apps/web/src/app/dashboard-client.tsx`.
- Production daemon auth: non-public daemon paths require bearer or `x-routely-admin-token` when production mode is active in `apps/daemon/src/server.js:244`.
- Docker/Compose command exposure: local commands and Compose/Docker deploys execute trusted configured app code by design. This remains an explicit trust boundary, not an unexpected vulnerability.
- Domain/proxy/TLS truthfulness: domain creation and verification use pending/not-configured/generated/issuing states; generated proxy config is not labeled as verified TLS in `apps/daemon/src/server.js:1881` and `apps/web/src/lib/dashboard-operations.ts:220`.
- Database exposure: domain/proxy creation rejects internal/database apps in `apps/daemon/src/server.js:981` and proxy route generation returns null for internal/database apps in `apps/daemon/src/server.js:923`.
- GitHub webhook boundary: the daemon validates `X-Hub-Signature-256`, records rejected deliveries, dedupes delivery IDs, ignores unsupported events, and filters by connected repo/branch before queueing deployments in `apps/daemon/src/server.js:2369`.
- Untrusted text rendering: focused grep found no `dangerouslySetInnerHTML`, `.innerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, or `new Function` in `apps/web/src`, `apps/daemon/src`, or `packages`; dashboard values render as React text nodes.
- Logs/deploy history: app log reads and deployment log reads redact values marked secret in `app_env_vars`; deployment SSE uses the same redacted DTO path in `apps/daemon/src/server.js:1292` and `apps/daemon/src/server.js:2521`.
- Backups: backup files are local metadata-only, not served through dashboard routes, and restore is labeled deferred.
- Solo-operator/no-RBAC scope: no team/RBAC controls were found or implied as implemented; this matches public-alpha solo-operator scope.

## Verification

Commands run:

```bash
npm run lint
npm run test --workspace apps/cli
npm run test --workspace apps/web
node --check apps/daemon/src/server.js
rg -n "dangerouslySetInnerHTML|\.innerHTML\b|insertAdjacentHTML|document\.write|eval\(|new Function" apps/web/src apps/daemon/src packages
rg -n "process\.env\.[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|PRIVATE_KEY|KEY)|ROUTELY_ADMIN_TOKEN|ROUTELY_GITHUB_WEBHOOK_SECRET|GITHUB_WEBHOOK_SECRET|GITHUB_PRIVATE_KEY" apps/web/src apps/daemon/src packages README.md docs/07-security-and-risks.md .env.example
node --input-type=module # focused DATABASE_URL DTO/redaction check
```

Results:

- `npm run lint`: PASS
- `npm run test --workspace apps/cli`: PASS, 15 files / 81 tests
- `npm run test --workspace apps/web`: PASS, 15 files / 62 tests
- `node --check apps/daemon/src/server.js`: PASS
- Unsafe rendering grep: PASS, no matches
- Secret/env grep: reviewed direct secret env references; no raw GitHub/admin secret DTO exposure found, but `DATABASE_URL` classification gap reproduced

Logs saved under `.maestro/playbooks/Working/security-*-20260622.log` and `.maestro/playbooks/Working/security-focused-greps-20260622.log`.

## Release Gate Recommendation

Keep the Compose-first security gate at NEEDS FIX.

Minimum fixes before greenlighting public alpha security:

1. Fix `SEC-COMPOSE-01` so dashboard route auth cannot be disabled by env mismatch when an admin token or production daemon exists.
2. Fix `SEC-COMPOSE-02` so common URL/DSN connection strings are treated as secrets by default and are not rendered raw.
3. Fix or explicitly document `SEC-COMPOSE-03` before claiming outbound notification SSRF protection is complete.

No production code was changed by this review.
