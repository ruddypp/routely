# ALPHA-01 Security Validation

Status: NEEDS FIX
Date: 2026-06-21
Owner: Security
Scope: ALPHA-01 local demo hardening at current `main` HEAD `1f4d3e9`.

## Scope

Reviewed inputs:

- `.maestro/playbooks/2026-06-21-Routely-Alpha-Execution/ALPHA-01.md`
- `docs/07-security-and-risks.md`
- `docs/03-demo-acceptance-plan.md`
- Recent commits: `1e207a9` dashboard API auth, `5ef3010` auth cookie parsing tests, `4c22c67` dashboard readiness hardening, `1f4d3e9` local demo quickstart tests.

Reviewed code paths:

- Daemon binding/auth/public routes in `apps/daemon/src/server.js`.
- Dashboard route-handler auth/proxy helpers in `apps/web/src/lib/daemon.ts`.
- Dashboard browser fetch/rendering paths in `apps/web/src/app/dashboard-client.tsx`.
- Local command and Docker execution helpers in `packages/drivers/src/index.js`.
- Public DTO and redaction helpers in `packages/core/src/index.js`.

## Critical Findings

None found for ALPHA-01. The browser dashboard uses same-origin `/api/*` fetches, and the daemon enforces admin bearer token auth for non-public routes when it is in production mode.

## Medium Findings

### SEC-ALPHA01-01: Dashboard auth can be disabled by env-name mismatch while still forwarding the admin token

Severity: Medium
Owner: Frontend, with Backend confirming production env contract

Evidence:

- Dashboard route-handler auth is enabled only when `process.env.ROUTELY_ENV === "production"` in `apps/web/src/lib/daemon.ts`.
- The daemon determines production mode from `ROUTELY_SERVER_MODE === "production"` or persisted server foundation state in `apps/daemon/src/server.js`.
- `daemonFetch` forwards `ROUTELY_ADMIN_TOKEN` server-side to the daemon after dashboard authorization succeeds or is skipped.

Risk:

If a production daemon is correctly protected with `ROUTELY_SERVER_MODE=production` and `ROUTELY_ADMIN_TOKEN`, but the dashboard process lacks `ROUTELY_ENV=production`, same-origin dashboard API route handlers will not require a caller token. Those handlers can still forward the server-side admin token to protected daemon mutation routes, making dashboard API access depend on network reachability to the dashboard rather than caller authentication.

Remediation:

- Frontend: make dashboard auth required when any production signal is true: `ROUTELY_ENV=production`, `ROUTELY_SERVER_MODE=production`, or `ROUTELY_ADMIN_TOKEN` is configured. Prefer default-deny for mutation routes whenever an admin token exists.
- Frontend: add route-handler tests covering `ROUTELY_SERVER_MODE=production` with `ROUTELY_ENV` unset.
- Backend/PM: document one canonical production mode variable, or explicitly document that both daemon and dashboard processes must be started with matching production auth env.

### SEC-ALPHA01-02: Raw config env values can be exposed through app DTOs and are not included in log redaction

Severity: Medium
Owner: Backend
Evidence:

- `appToPublicDto` includes `env` for non-database and non-internal apps in `packages/core/src/index.js`.
- Stored app env vars under `app_env_vars` are redacted by `appEnvVarToPublicDto`, but base app config env from `routely.yml` is still merged into runtime env by `mergeAppEnv`.
- Daemon log redaction uses `listSecretValuesForApp`, which only returns rows marked secret in `app_env_vars`; it does not include secret-like values loaded from the app config env.
- `filterExportableEnv` prevents secret-looking env keys from being written by Routely-generated config entries, but a user-authored `routely.yml` can still contain those values and then be returned through `/apps` or leaked through runtime logs.

Risk:

The alpha security rules say secret values should not be exposed in API responses or logs beyond intentional redacted forms. A user who already has `API_KEY`, `TOKEN`, `PASSWORD`, or similar values in `routely.yml` can have those values returned in app API payloads for non-internal apps and not redacted from local app logs unless separately saved through the secret-aware env API.

Remediation:

- Backend: change app public DTOs to omit raw `env` values for all apps by default and expose only `envKeys` plus secret/redacted metadata.
- Backend: include secret-like values from base app config env in the redaction set, or require config env values matching the secret pattern to be treated as secret metadata.
- Backend: add tests for `/apps`, `/apps/:id`, `/apps/:id/logs`, and deployment log redaction when `routely.yml` contains a secret-looking env key.

### SEC-ALPHA01-03: Local daemon host can be configured to a non-loopback interface while local mode disables auth

Severity: Medium
Owner: Backend
Evidence:

- Daemon host defaults to `127.0.0.1`, but `ROUTELY_DAEMON_HOST` can override it in `apps/daemon/src/server.js`.
- In non-production mode, `isAuthorized` returns true for all requests.
- Local lifecycle routes can start, stop, restart, mutate app config, and read logs through the daemon.
- Local command apps execute with `shell: true`, inherit `process.env`, and run in the configured app path in `packages/drivers/src/index.js`.

Risk:

The default binding is safe for the local demo, but setting `ROUTELY_DAEMON_HOST=0.0.0.0` or another non-loopback host exposes an unauthenticated local control plane. That control plane can execute configured local commands and read logs. This is especially risky because `ROUTELY_DAEMON_HOST` appears in `.env.example`, making host customization discoverable.

Remediation:

- Backend: reject non-loopback `ROUTELY_DAEMON_HOST` in local mode unless an explicit unsafe override is present.
- Backend: require production auth automatically when binding to a non-loopback interface.
- Backend: add startup tests for host/auth combinations.
- PM/Backend docs: mark non-loopback local daemon binding as unsafe unless production auth is enabled.

## Low Findings

### SEC-ALPHA01-04: Public health/status routes expose local filesystem paths

Severity: Low
Owner: Backend
Evidence:

- `/health`, `/server/status`, and `/auth/status` are public daemon paths in production.
- `/health` suppresses app inventory for unauthenticated production callers, but it still returns `workspace` and `database` path fields.

Risk:

Absolute filesystem paths are not secrets by themselves, but they disclose deployment layout and usernames. For a public alpha VPS, this is unnecessary information for unauthenticated callers.

Remediation:

- Backend: remove `workspace` and `database` from unauthenticated production health responses, or replace them with booleans/status labels.
- Backend: add a production unauthenticated health test asserting no absolute path disclosure.

### SEC-ALPHA01-05: Public docs do not yet make local shell command execution risk explicit enough

Severity: Low
Owner: PM, Backend
Evidence:

- `docs/07-security-and-risks.md` records arbitrary code execution as a known risk.
- The public quickstart registers commands such as `routely add ... --command "... npm run dev"`.
- The command driver executes configured commands through the shell and inherits the Routely process environment.

Risk:

The implementation behavior is expected for a local runner, but public alpha users should see the trust boundary before running commands from cloned repositories or copied examples. The current public README limitations mention the incomplete dashboard login UI, but the local command trust model should be visible near the quickstart.

Remediation:

- PM/Backend docs: add a concise warning near the local quickstart: Routely executes registered local commands through the user's shell, in the configured path, with inherited environment variables; only register trusted workspaces and commands.
- Backend docs: mention that app logs can contain application output and should be treated as sensitive when commands print secrets.

## Validated Controls

- Same-origin dashboard API boundary: browser fetches in `dashboard-client.tsx` use `/api/*`; daemon access is isolated to server-side route handlers/helpers.
- Production daemon auth: daemon non-public routes require admin token when production mode is active.
- GitHub webhook boundary: the daemon validates `X-Hub-Signature-256`, rejects invalid signatures, records duplicate delivery IDs, and filters by connected repo/branch before queueing deployments.
- Untrusted dashboard rendering: no `dangerouslySetInnerHTML` or raw HTML insertion was found in dashboard app/components. Logs, app names, repo names, branch names, domain names, and messages are rendered as React text nodes.
- Deployment logs: both normal and SSE deployment log reads use `readDeploymentLogsRedacted` when the app record is available.
- Notification outbound safety: webhook/Discord URLs are restricted to HTTP(S), reject credentials, reject private/loopback/link-local DNS results, and use a short timeout.
- Database/proxy exposure: domain creation rejects internal/database apps before public proxy route materialization.

## Verification Commands

Commands run during this review:

```bash
git status --short
git log --oneline --decorate -12
git show --stat --oneline 1e207a9 5ef3010 4c22c67 1f4d3e9
rg -n "daemon|localhost|127\.0\.0\.1|0\.0\.0\.0|same-origin|/api|token|auth|dangerouslySetInnerHTML|innerHTML|logs|secret|redact|spawn|exec|command|shell" apps packages docs -S
rg -n "fetch\(" apps/web/src -S
```

No production code was changed by this review.

## Status

NEEDS FIX for public alpha release readiness.

The local demo defaults are acceptable for trusted local use, but the production dashboard auth mismatch and config-env secret exposure should be fixed before marking the public alpha security gate green.
