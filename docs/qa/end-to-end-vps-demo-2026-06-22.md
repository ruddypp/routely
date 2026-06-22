---
type: report
title: End-To-End VPS Demo QA Report
created: 2026-06-22
tags:
  - qa
  - e2e
  - vps-demo
  - public-alpha
related:
  - '[[03-demo-acceptance-plan]]'
  - '[[06-interfaces]]'
  - '[[09-current-status]]'
  - '[[13-end-to-end-execution-plan]]'
---

# End-To-End VPS Demo QA Report

Status: **BLOCKED FOR REAL VPS/DNS — LOCAL STATIC/API CHECKS PASS**
Owner: QA E2E
Date: 2026-06-22
Validated commit: `cd91746` (`feat: harden local readiness checks`)
Report target: Routely Lead

## Scope

QA-01 requested the one-VPS demo on a disposable VPS with a real domain if credentials/environment were available. No disposable VPS, DNS provider access, or QA domain details were available in this environment, so QA did not attempt external deployment, DNS, HTTPS, or real public ingress. QA ran all practical local/static/API checks for production init, server doctor, auth boundaries, public health/auth shape, and production mutation rejection.

## Environment

- Host OS: Linux `ruddypp` 7.0.12-101.fc43.x86_64
- Node: v24.12.0
- npm: 11.6.2
- Docker: Docker version 29.5.3, build d1c06ef
- Docker Compose: Docker Compose version v5.1.4
- Repo: `/home/ruddypp/Documents/work/routely`
- Branch/HEAD: `main` at `cd91746`
- Temporary workspace: `.qa-runs/qa-01-vps-static` was cleaned up.

## Environment And Credential Availability

| Prerequisite | Availability | Notes |
| --- | --- | --- |
| Disposable Linux VPS host/IP | BLOCKED | No `ROUTELY_QA_VPS_HOST` or equivalent SSH target provided. |
| VPS SSH user/key | BLOCKED | No `ROUTELY_QA_VPS_USER` or `ROUTELY_QA_VPS_SSH_KEY` provided. |
| Real domain/DNS provider access | BLOCKED | No `ROUTELY_QA_DOMAIN` or `ROUTELY_QA_DNS_PROVIDER` provided. |
| `ROUTELY_SERVER_PUBLIC_IP` | BLOCKED | Missing; DNS verification cannot compare A record to target IP. |
| Open public ports 80/443 on VPS | BLOCKED | No VPS to validate firewall/security group/public ingress. |
| Routely admin token | AVAILABLE LOCALLY | Present in `.env`; local generated token also tested without printing the token. |
| Docker/Compose | AVAILABLE LOCALLY | Docker 29.5.3 and Compose v5.1.4 available on host. |

## Commands Run

| Command | Result | Notes |
| --- | --- | --- |
| `node` env-presence script for `ROUTELY_*`, `ROUTELY_QA_*`, `GITHUB_TOKEN` | PASS | Values redacted; confirmed missing VPS/DNS prerequisites. |
| `routely server init --data-dir /home/ruddypp/Documents/work/routely/.qa-runs/qa-01-vps-static/server-data` | PASS | Printed admin token redacted in QA output. |
| `routely server doctor --data-dir /home/ruddypp/Documents/work/routely/.qa-runs/qa-01-vps-static/server-data` | CHECK | Local host has Docker/Compose/Node/npm/data-dir/disk/memory; ports 80/443 unavailable to non-root local process. |
| `ROUTELY_SERVER_MODE=production ROUTELY_ADMIN_TOKEN=<redacted> ROUTELY_DAEMON_PORT=9988 npm run dev --workspace apps/daemon` | PASS | Started a production-mode daemon bound to `127.0.0.1:9988`. |
| `curl http://127.0.0.1:9988/auth/status` | PASS | Public auth signal returned `production: true`, `requiresAuth: true`, no token. |
| `curl http://127.0.0.1:9988/health` | PASS | Unauthenticated health returned `diagnosticsAvailable: false`, `apps: 0`, and did not include `server.dataDir`. |
| `curl http://127.0.0.1:9988/server/status` | PASS | Unauthenticated private status returned `401`. |
| `curl -X POST http://127.0.0.1:9988/apps/start-all` | PASS | Unauthenticated production mutation returned `401`. |
| `curl -H "Authorization: Bearer <redacted>" http://127.0.0.1:9988/server/status` | PASS | Authenticated server status returned production/auth state. |
| `npm run lint` | PASS | Shared baseline from local QA run. |
| `npm run test --workspace apps/cli` | PASS | Shared baseline from local QA run; 91 CLI tests passed. |
| `npm run test --workspace apps/web` | PASS | Shared baseline from local QA run; 62 web API tests passed. |
| `node --check apps/daemon/src/server.js` | PASS | Shared baseline from local QA run. |

## Verified Results

| Area | Expected | Actual | Status |
| --- | --- | --- | --- |
| Production init | `routely server init` prepares production foundation state and admin token. | Local init created server foundation state and redacted admin token; mode reported production. | PASS |
| Server doctor | Doctor reports actionable Docker, Compose, Node/npm, data-dir, disk, memory, and port readiness. | Doctor reported all available checks and warned on local privileged ports 80/443. | PASS WITH LOCAL WARNINGS |
| Public auth status | `/auth/status` exposes mode/auth without token material. | Returned `production: true`, `requiresAuth: true`, and auth metadata only. | PASS |
| Public health | Production unauthenticated health avoids diagnostics/data-dir/app details. | Returned `diagnosticsAvailable: false`, `apps: 0`, and no `server.dataDir`. | PASS |
| Private production APIs | Private mutation/status routes require admin token. | Unauthenticated `/server/status` and `/apps/start-all` returned 401. | PASS |
| Authenticated diagnostics | Admin-token request can access server status. | Authenticated `/server/status` returned production mode and auth configured state. | PASS |

## Blocked Checks

| Check | Blocker | Exact prerequisite needed |
| --- | --- | --- |
| Disposable VPS install/init/doctor | No VPS host or SSH credentials. | `ROUTELY_QA_VPS_HOST`, `ROUTELY_QA_VPS_USER`, SSH key/path or agent access, and sudo/root permissions. |
| Public IP and ports | No VPS public IP or firewall/security group. | `ROUTELY_SERVER_PUBLIC_IP`, open inbound 80/443, and allowed dashboard/daemon access path. |
| Real domain DNS verification | No domain or DNS provider access. | A disposable domain/subdomain, DNS provider credentials or manual DNS control, and target A/AAAA record. |
| HTTPS/TLS truthfulness | No real DNS/VPS ingress. | A reachable domain pointed at the VPS with Traefik/ACME or documented TLS path. |
| Real one-app deploy on VPS | No VPS runtime. | VPS with Node/npm, Docker, Compose, Routely source install, data dir, admin token, and selected verified deploy driver. |
| Env/secrets on VPS | No production app to mutate. | Deployed app on VPS plus admin token. |
| Production logs/deploy history/health | No deployed app on VPS. | Successful and failing production deployments. |
| Database/backup on VPS | No VPS data directory/runtime. | Registered production database and local-file backup state on VPS. |

## Findings For Routely Lead

### ENV-QA-2026-06-22-VPS-01: Real VPS/DNS demo cannot be accepted in this environment

- Severity: Environment blocker for Demo 2 release gate.
- Owner: Routely Lead.
- Expected: QA validates one disposable VPS with real domain/DNS and honest domain/proxy/HTTPS state.
- Actual: Required VPS, SSH, DNS, domain, and public IP prerequisites were absent.
- Instructions: Provide a disposable Linux VPS, public IP, SSH credentials, domain/DNS control, and permission to create/remove Docker containers/routes/certificates before rerunning Demo 2.

### DOC-QA-2026-06-22-VPS-01: Public docs do not provide a concrete VPS prerequisite checklist

- Severity: Medium; docs readiness issue.
- Owner: PM/Docs with Backend review.
- Expected: Public alpha docs let a new solo operator understand exact VPS baseline before starting.
- Actual: README names Linux VPS, Docker, Compose, production env, and data dir, but does not consolidate OS image, SSH/sudo expectations, firewall ports, DNS prerequisites, dashboard access guidance, cleanup expectations, and whether 80/443 require root/capability/systemd service setup.
- Instructions: Add a VPS prerequisite checklist before release, including provider-neutral requirements and exact values QA should collect.

## Backend Instructions

No backend code blocker was found in local production/auth static checks. Production auth gates, public auth status, public health redaction, and server doctor output behaved as expected locally.

## Frontend Instructions

No VPS-specific frontend behavior was externally validated because no VPS/dashboard production deployment was available. Frontend should still consume the production/auth contracts verified here: unauthenticated production health has limited diagnostics, and private production mutations require caller auth.

## Notes

- QA did not edit production code.
- QA did not commit this report.
- Temporary token files and workspaces were deleted after checks.
- This report separates verified local/static/API results from real environment blockers.
