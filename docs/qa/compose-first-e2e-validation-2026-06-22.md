---
type: report
title: Routely Compose-First E2E QA Validation
created: 2026-06-22
tags:
  - qa
  - e2e
  - compose-first
  - public-alpha
related:
  - '[[00-product-brief]]'
  - '[[01-alpha-plan]]'
  - '[[03-demo-acceptance-plan]]'
  - '[[05-architecture]]'
  - '[[06-interfaces]]'
  - '[[09-current-status]]'
---

# Routely Compose-First E2E QA Validation

Status: **PASS WITH BLOCKERS**
Owner: QA E2E
Date: 2026-06-22
Validated commit: `1ddfb4e` (`chore: add compose-first qa security playbooks`)
Report target: Routely Lead

## Scope

Validated the completed Compose-first Routely implementation against `docs/00-product-brief.md`, `docs/01-alpha-plan.md`, `docs/02-team-execution-plan.md`, `docs/03-demo-acceptance-plan.md`, `docs/05-architecture.md`, `docs/06-interfaces.md`, `docs/09-current-status.md`, and the Compose-first Backend/Frontend playbook handoffs.

QA covered the dashboard-first solo-operator flow for:

- Registry create/edit for Compose-backed resources.
- Start All for enabled apps, skipped disabled apps/services, per-app stop, and non-destructive enable/disable.
- Production operation state for deploys, domains/proxy, env/secrets, databases, backups, logs, history, and health.
- GitHub redeploy diagnostics for configured branch delivery, ignored branch delivery, failed deployment phase, and logs.
- Dashboard same-origin `/api/*` access and browser smoke screenshots.

## Environment

- Host OS: Linux ruddypp 7.0.12-101.fc43.x86_64
- Node: v24.12.0
- npm: 11.6.2
- Docker: 29.5.3, build d1c06ef
- Docker Compose: v5.1.4
- Repo: `/home/ruddypp/Documents/work/routely`
- Branch/HEAD: `main` at `1ddfb4e`
- QA workspace: `.maestro/playbooks/Working/qa-compose-e2e-smoke`

## Verification Commands

| Command | Result | Notes |
| --- | --- | --- |
| `npm run lint` | PASS | ESLint completed with no reported errors. |
| `npm run test --workspace apps/web` | PASS | 15 test files, 62 tests passed. |
| `npm run test --workspace apps/cli` | PASS | 15 test files, 81 tests passed. |
| `npx tsc --noEmit --project apps/web/tsconfig.json` | PASS | Completed with no type errors. |
| `node .maestro/playbooks/Working/qa-compose-e2e-smoke.mjs` | PASS | Clean local workspace exercised registry, lifecycle, production state, and signed GitHub webhook diagnostics. |
| `ROUTELY_DASHBOARD_URL=http://127.0.0.1:13030 ROUTELY_DASHBOARD_SMOKE_DIR=/home/ruddypp/Documents/work/routely/.maestro/playbooks/Working/qa-compose-e2e-smoke/screenshots npm run test:dashboard-smoke --workspace apps/web` | PASS WITH VISUAL FINDING | Existing smoke passed and produced 375px, 768px, and 1280px screenshots; manual screenshot review found mobile clipping. |

## Functional Results

| Area | Expected | Actual | Status |
| --- | --- | --- | --- |
| Compose registry create/edit | Dashboard API can create a Compose-backed resource and edit Compose metadata without losing enablement/source/domain intent. | Created `qa-compose-service` via `/api/apps`, patched `compose_service` to `qa-postgres-edited`, preserved `enabled: false`, source metadata, and domain intent. | PASS |
| Start All | Starts stopped enabled command/Compose resources and skips disabled resources. | Started `hello-node-command` and `hello-api-command`; skipped `hello-disabled-worker`, `qa-compose-service`, and `qa-db` with `code: disabled`; no failures. | PASS |
| Per-app stop | Stopping one app does not change enablement. | Stopped `hello-node-command`; response preserved `enabled: true`. | PASS |
| Enable/disable | Enable/disable remains non-destructive and preserves app metadata. | Toggled `hello-disabled-worker` enabled then disabled again; command metadata remained present. | PASS |
| Env/secrets | Raw secrets never render through public daemon/dashboard responses. | Saved `DATABASE_URL=postgres://qa-raw-secret` as secret; `/api/apps/:id/env` returned `[redacted]` and did not include the raw value. | PASS |
| Deploy history/logs | Failed deploys expose status, phase, commit, and log evidence. | Signed GitHub push queued deployment `#1`; missing Dockerfile failed in `preparing` phase; deployment logs included missing Dockerfile evidence without saved secrets. | PASS |
| Domains/proxy | Screens/API distinguish empty/generated/pending state and do not claim HTTPS success. | `/api/domains` and `/api/proxy/routes` returned structured empty state; dashboard copy states generated proxy config is not certificate success. | PASS |
| Databases/backups | Database and backup state are visible honestly without claiming running/external restore support. | `qa-db` showed `stopped`; backup job showed `storageStatus: metadata-only` and `restoreStatus: deferred`. | PASS |
| Logs/health | Started apps expose logs and health state. | `hello-api-command` logs included service output; `/api/apps/:id/health` returned `healthy`. | PASS |
| GitHub diagnostics | Configured repo/branch, deliveries, ignored branches, deployment linkage, failure phase, and logs are exposed without unsupported claims. | Repo `qa/github-failure:main` connected; signed `main` delivery linked to failed deployment; signed `feature/not-configured` delivery was ignored; dashboard GitHub module tests passed. | PASS |
| Same-origin dashboard | Browser must call same-origin `/api/*` routes, not daemon directly. | Existing dashboard smoke passed for 375px, 768px, and 1280px and detected no direct browser daemon requests. | PASS |
| Responsive visual fit | Mobile dashboard should keep top status, primary controls, and app rows readable without horizontal clipping. | 375px screenshot shows horizontal clipping and off-screen controls. | FAIL |

## Evidence

- Smoke summary: `.maestro/playbooks/Working/qa-compose-e2e-smoke/summary.json`
- Routely run log: `.maestro/playbooks/Working/qa-compose-e2e-smoke/routely-up.log`
- Browser smoke log: `.maestro/playbooks/Working/qa-compose-e2e-smoke/dashboard-smoke-routely.log`
- Desktop screenshot: `.maestro/playbooks/Working/qa-compose-e2e-smoke/screenshots/dashboard-smoke-1280x800.png`
- Tablet screenshot: `.maestro/playbooks/Working/qa-compose-e2e-smoke/screenshots/dashboard-smoke-768x1024.png`
- Mobile screenshot: `.maestro/playbooks/Working/qa-compose-e2e-smoke/screenshots/dashboard-smoke-375x812.png`

Key `summary.json` evidence:

```json
{
  "startAll": {
    "started": ["hello-api-command", "hello-node-command"],
    "skipped": [
      { "name": "hello-disabled-worker", "code": "disabled" },
      { "name": "qa-compose-service", "code": "disabled" },
      { "name": "qa-db", "code": "disabled" }
    ],
    "failed": []
  },
  "stoppedWeb": { "status": "stopped", "enabled": true },
  "backup": { "enabled": true, "storageStatus": "metadata-only", "restoreStatus": "deferred" },
  "failedDeployment": { "status": "failed", "phase": "preparing", "commitSha": "abc123def456" }
}
```

## Findings For Routely Lead

### FE-QA-2026-06-22-01: Mobile dashboard clips primary content

- Severity: High; release blocker for responsive dashboard acceptance, but not a backend lifecycle blocker.
- Owner: Frontend.
- Evidence: `.maestro/playbooks/Working/qa-compose-e2e-smoke/screenshots/dashboard-smoke-375x812.png`.
- Expected: At 375px width, the top status bar, module header actions, Start All copy, app row state, and action buttons remain readable/reachable without horizontal page overflow.
- Actual: The 375px screenshot starts mid-word at the workspace badge, clips the right side of the top status bar, truncates Start All scope text, hides the `Add resource` action off-screen, and clips row/action content to the right.
- Repro:
  1. Run `node .maestro/playbooks/Working/qa-compose-e2e-smoke.mjs` to seed the QA workspace.
  2. Start the seeded dashboard at `ROUTELY_DAEMON_PORT=19977 ROUTELY_DASHBOARD_PORT=13030`.
  3. Run `ROUTELY_DASHBOARD_URL=http://127.0.0.1:13030 ROUTELY_DASHBOARD_SMOKE_DIR=/home/ruddypp/Documents/work/routely/.maestro/playbooks/Working/qa-compose-e2e-smoke/screenshots npm run test:dashboard-smoke --workspace apps/web`.
  4. Inspect `dashboard-smoke-375x812.png`.
- Frontend instructions: Audit `apps/web/src/app/dashboard-client.tsx` and dashboard shell/header components for fixed-width grids, missing `min-w-0`, non-wrapping action bars, and overflow-prone table/card rows. Stack or wrap app row metadata/actions on mobile, keep primary actions visible, and add a dashboard smoke assertion that `document.documentElement.scrollWidth <= window.innerWidth` at 375px, 768px, and 1280px.

### QA-BLOCKED-2026-06-22-01: Real VPS/DNS/GitHub provider validation not executed

- Severity: Environment blocker; route to Routely Lead, not Backend/Frontend.
- Owner: Routely Lead.
- Reason: QA context did not include a VPS, DNS provider access, a public domain, GitHub App ownership, webhook endpoint exposure, or repository credentials.
- Coverage provided: Local daemon/dashboard APIs simulated production operation state, signed GitHub webhook delivery, ignored branch handling, failed deployment history, and deployment logs.
- Follow-up: Provide disposable VPS/DNS/GitHub App credentials and a test repo if Lead wants full Demo 2 and real provider-backed Demo 3 validation before release.

## Backend Instructions

No backend blockers found in this validation pass. Backend lifecycle contracts, disabled-resource skipping, non-destructive stop/enablement, redacted env, deployment failure logs, database state, backup metadata, and GitHub delivery/deployment linkage passed the local E2E smoke.

## Frontend Instructions

Fix `FE-QA-2026-06-22-01` before declaring responsive dashboard acceptance complete. Existing API route tests and browser smoke pass functionally, but the smoke script should be hardened to fail on viewport overflow so this class of clipping does not pass silently.

## Notes

- QA did not edit production code.
- QA did not commit this report, per `AGENTS.md` and `docs/02-team-execution-plan.md`.
- The temporary QA script and smoke artifacts are under `.maestro/playbooks/Working/`.
