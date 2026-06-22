---
type: report
title: End-To-End Local Demo QA Report
created: 2026-06-22
tags:
  - qa
  - e2e
  - local-demo
  - public-alpha
related:
  - '[[00-product-brief]]'
  - '[[01-alpha-plan]]'
  - '[[03-demo-acceptance-plan]]'
  - '[[06-interfaces]]'
  - '[[09-current-status]]'
  - '[[13-end-to-end-execution-plan]]'
---

# End-To-End Local Demo QA Report

Status: **PARTIAL PASS — RESPONSIVE RELEASE BLOCKER**
Owner: QA E2E
Date: 2026-06-22
Validated commit: `cd91746` (`feat: harden local readiness checks`)
Report target: Routely Lead

## Scope

Executed QA-01 local dashboard-first validation against public docs and current implementation. Covered a clean local workspace, three command apps, one Compose-backed Postgres database, bulk start, per-app stop, disable, Start All skip behavior, logs/status/health, same-origin dashboard APIs, and desktop/tablet/mobile responsive behavior.

## Environment

- Host OS: Linux `ruddypp` 7.0.12-101.fc43.x86_64
- Node: v24.12.0
- npm: 11.6.2
- Docker: Docker version 29.5.3, build d1c06ef
- Docker Compose: Docker Compose version v5.1.4
- Repo: `/home/ruddypp/Documents/work/routely`
- Branch/HEAD: `main` at `cd91746`
- QA workspaces: `.qa-runs/2026-06-22-local-demo` and `.qa-runs/qa-01-start-all-skip` were temporary and cleaned up.
- Screenshots: `output/playwright/qa-01-local-demo/`

## Commands Run

| Command | Result | Notes |
| --- | --- | --- |
| `git status --short` | PASS | Clean at dispatch except later unrelated Security reports. |
| `git log --oneline -12` | PASS | Confirmed Backend `cd91746`, UI/UX through `1abe109`, Frontend fix `700ee5f`. |
| `npm install` | PASS | Up to date; npm reported 2 moderate audit findings. |
| `npm run build --workspace apps/cli` | PASS | Rebuilt local CLI target used by global `routely` symlink. |
| `npm run lint` | PASS | Workspace lint completed. |
| `npm run test --workspace apps/cli` | PASS | 15 test files, 91 tests passed. |
| `npm run test --workspace apps/web` | PASS | 15 test files, 62 tests passed. |
| `npx tsc --noEmit --project apps/web/tsconfig.json` | PASS | No type errors. |
| `node --check apps/daemon/src/server.js` | PASS | Daemon syntax check passed. |
| `ss -ltnp sport = :3030/:9977/:3101/:3102/:3103/:5432` | INFO | `5432` was already occupied by local Postgres; other demo ports were free. |
| `routely init` | PASS | Clean workspace initialized. |
| `routely add "$ROUTELY_REPO/examples/hello-command" --name web --command "PORT=3101 ROUTELY_EXAMPLE_NAME=web ROUTELY_EXAMPLE_ROLE=frontend npm run dev" --port 3101 --health-path /health` | PASS | Registered `web` command app. |
| `routely add "$ROUTELY_REPO/examples/hello-command" --name api --command "PORT=3102 ROUTELY_EXAMPLE_NAME=api ROUTELY_EXAMPLE_ROLE=api npm run dev" --port 3102 --health-path /health` | PASS | Registered `api` command app. |
| `routely add "$ROUTELY_REPO/examples/hello-command" --name worker --command "PORT=3103 ROUTELY_EXAMPLE_NAME=worker ROUTELY_EXAMPLE_ROLE=worker npm run dev" --port 3103 --health-path /health` | PASS | Registered `worker` command app. |
| `routely db add postgres --name postgres --port 55432` | PASS | Used alternate port because public-doc `5432` was occupied. |
| `routely doctor` | PASS | No conflicts with alternate DB port. |
| `routely` | PASS | Started daemon, dashboard, three command apps, and Compose Postgres. |
| `routely ps` | PASS | Showed `api`, `web`, `worker`, and `postgres` running/enabled. |
| `routely logs web` | PASS | Showed command startup log and URL. |
| `routely health web` | PASS | Runtime health was healthy, HTTP 200. |
| `curl http://127.0.0.1:3101/health`, `:3102/health`, `:3103/health` | PASS | All command apps returned expected JSON before per-app stop. |
| `curl http://127.0.0.1:3030/api/health`, `/api/apps`, `/api/databases` | PASS | Dashboard same-origin route handlers returned real daemon data. |
| Playwright responsive/API-origin script at 375x812, 768x1024, 1280x800 | PASS WITH VISUAL FAIL | No direct browser daemon requests; screenshots captured; mobile content is clipped. |
| Dashboard `Stop` button | PASS | Stopped only `api`; `web`, `worker`, and `postgres` stayed running; `api` remained enabled. |
| Dashboard edit `Enabled` checkbox + `Save` | PASS | Disabled `api`; CLI/config/API later showed `enabled: false`. |
| `curl -X POST http://127.0.0.1:3030/api/apps/start-all` | PASS | Started enabled stopped apps and skipped disabled `api` with `code: disabled`. |
| `routely down` | PASS | Stopped temporary QA command apps. |
| Docker cleanup for temporary Postgres and Dockerfile artifacts | PASS | Removed QA containers/volumes/images. |

## Functional Results

| Area | Expected | Actual | Status |
| --- | --- | --- | --- |
| Clean init | A clean workspace can run `routely init`. | Initialized `.routely/routely.db` and starter `routely.yml`. | PASS |
| Register three apps | Three apps can be registered with names, paths, commands, ports, health paths, and enablement. | `web`, `api`, and `worker` registered from `examples/hello-command`; all defaulted `enabled: true`. | PASS |
| Register one database | One Compose-backed database can be registered if supported. | `postgres` registered as `driver: compose`, `internal-only`, `postgres:16`. | PASS |
| README copy-paste port | README uses `routely db add postgres --name postgres --port 5432`. | Local host already had Postgres on `127.0.0.1:5432`; QA used `55432` to continue. | BLOCKED BY LOCAL ENV / DOC CAVEAT |
| Bulk local start | `routely` starts every enabled command/Compose resource. | Started 4 local resources: three command apps plus Compose Postgres. | PASS |
| Status | CLI/API/dashboard show real status, driver, port, and enablement. | `routely ps` and `/api/apps` agreed on running/enabled state. | PASS |
| Logs | `routely logs web` shows recent app logs. | Log contained startup header and `web running at http://127.0.0.1:3101`. | PASS |
| Health | App health is inspectable. | `routely health web` returned healthy HTTP 200; direct `/health` curls passed. | PASS |
| Per-app stop | Stop affects current process only and preserves enablement. | Dashboard stopped `api`; `api` became `stopped` and remained `enabled: true`; other apps stayed running. | PASS |
| Disable | Disable excludes app from future Start All without deleting it. | Dashboard edit persisted `api enabled: false`; CLI/config/API showed disabled app still registered. | PASS |
| Start All skip | Start All starts stopped enabled apps and skips disabled apps with reason. | `/api/apps/start-all` started `web` and `worker`; skipped disabled `api` with reason `api is disabled and was skipped.` | PASS |
| Same-origin dashboard | Browser calls same-origin `/api/*`, not daemon directly. | Playwright saw `/api/*` requests only and zero direct `127.0.0.1:9977` browser requests. | PASS |
| Responsive dashboard | Demo-critical views must be readable/reachable on mobile/tablet/desktop without clipping. | Body/doc scroll widths stayed within viewport, but mobile visual content was clipped left/right at 375px and 390px. | FAIL |

## Evidence

- Mobile screenshot: `output/playwright/qa-01-local-demo/dashboard-apps-375x812.png`
- Mobile 390px screenshot: `output/playwright/qa-01-local-demo/dashboard-apps-390x844.png`
- Tablet screenshot: `output/playwright/qa-01-local-demo/dashboard-apps-768x1024.png`
- Desktop screenshot: `output/playwright/qa-01-local-demo/dashboard-apps-1280x800.png`
- Stop/edit screenshot: `output/playwright/qa-01-local-demo/dashboard-after-stop-edit-1280x800.png`
- Disabled screenshot: `output/playwright/qa-01-local-demo/dashboard-after-api-disabled-1280x800.png`

![375px mobile clipped dashboard](/home/ruddypp/Documents/work/routely/output/playwright/qa-01-local-demo/dashboard-apps-375x812.png)

Key Start All skip evidence:

```json
{
  "started": ["web", "worker"],
  "skipped": [
    {
      "app": { "name": "api", "enabled": false, "status": "stopped" },
      "code": "disabled",
      "reason": "api is disabled and was skipped."
    }
  ],
  "failed": []
}
```

Key same-origin evidence:

```json
{
  "apiRequests": [
    "/api/health",
    "/api/apps",
    "/api/server/status",
    "/api/github/status",
    "/api/databases",
    "/api/backups",
    "/api/notifications"
  ],
  "daemonRequests": []
}
```

## Findings For Routely Lead

### FE-QA-2026-06-22-LOCAL-01: Mobile dashboard clips demo-critical content

- Severity: High; release blocker for responsive dashboard acceptance.
- Owner: Frontend.
- Expected: At mobile widths, top status chips, module headers, Start All copy, app rows, and action buttons remain readable/reachable without horizontal page overflow or clipping.
- Actual: At 375px and 390px, the visible page starts mid-word (`workspace` clipped to `rkspace`), the top status row clips off-screen, the Start All scope text and some actions are cut off, and the bottom nav labels are truncated. The automated `documentElement.scrollWidth` check does not catch this because parent containers hide overflow.
- Evidence: `output/playwright/qa-01-local-demo/dashboard-apps-375x812.png` and `output/playwright/qa-01-local-demo/dashboard-apps-390x844.png`.
- Repro:
  1. Start a local demo workspace with three apps and one database.
  2. Open `http://127.0.0.1:3030` at 375px or 390px width.
  3. Navigate to `Apps / Services`.
  4. Observe clipped left/right content despite no document-level horizontal scrollbar.
- Frontend instructions: Audit dashboard shell/header/module grid widths for large fixed widths, negative offsets, and `overflow-x-hidden` masking. Add a visual or DOM assertion that detects elements whose bounding boxes extend beyond the viewport, not only `documentElement.scrollWidth`.

### DOC-QA-2026-06-22-LOCAL-01: README local DB port is fragile on developer machines

- Severity: Medium; not a code blocker, but it blocked exact README copy-paste in this QA environment.
- Owner: PM/Docs with Backend review.
- Expected: Public quick start is repeatable from common developer machines.
- Actual: README hardcodes `routely db add postgres --name postgres --port 5432`; local Fedora host already had Postgres listening on `127.0.0.1:5432`, so exact copy-paste could not run without changing the port or stopping an unrelated service.
- Evidence: preflight `ss` showed `127.0.0.1:5432` and `[::1]:5432` listeners; using `--port 55432` allowed the demo to pass.
- Instructions: Either document how to choose an alternate database port when `5432` is occupied, or make the quick start use a less collision-prone host port while keeping internal DB behavior honest.

## Backend Instructions

No backend release blocker was found in local lifecycle behavior. Backend contracts passed for bootstrap, app registration, database registration, port preflight with alternate port, Start All disabled skip, per-app stop semantics, logs, health, and same-origin API data.

## Frontend Instructions

Fix `FE-QA-2026-06-22-LOCAL-01` before claiming responsive dashboard acceptance. Functional dashboard controls passed, but the mobile visual fit does not satisfy the UI/UX contract or QA-01 responsive requirement.

## Notes

- QA did not edit production code.
- QA did not commit this report.
- Temporary QA workspaces and containers were cleaned up.
- Existing untracked `docs/security/*` files belong to the Security agent and were preserved.
