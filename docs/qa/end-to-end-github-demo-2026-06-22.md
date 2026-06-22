---
type: report
title: End-To-End GitHub Demo QA Report
created: 2026-06-22
tags:
  - qa
  - e2e
  - github-demo
  - public-alpha
related:
  - '[[03-demo-acceptance-plan]]'
  - '[[06-interfaces]]'
  - '[[09-current-status]]'
  - '[[13-end-to-end-execution-plan]]'
---

# End-To-End GitHub Demo QA Report

Status: **BLOCKED FOR REAL GITHUB PUSH DEMO — LOCAL SIGNED WEBHOOK CHECKS PASS**
Owner: QA E2E
Date: 2026-06-22
Validated commit: `cd91746` (`feat: harden local readiness checks`)
Report target: Routely Lead

## Scope

QA-01 requested GitHub redeploy diagnosis with one successful push and one intentional failing push if GitHub App credentials were available. The repository `.env` contains GitHub App configuration, but this environment did not include a reachable webhook URL, disposable VPS/domain, GitHub test repository details, or push credentials. QA therefore ran local/static/API checks: GitHub App config detection, installation/repo/app mapping, signature rejection, valid signed ignored-branch handling, delivery dedupe, configured-branch webhook queuing, Dockerfile deployment history, and deployment logs.

## Environment

- Host OS: Linux `ruddypp` 7.0.12-101.fc43.x86_64
- Node: v24.12.0
- npm: 11.6.2
- Docker: Docker version 29.5.3, build d1c06ef
- Docker Compose: Docker Compose version v5.1.4
- Repo: `/home/ruddypp/Documents/work/routely`
- Branch/HEAD: `main` at `cd91746`
- Temporary workspace: `.qa-runs/qa-01-github-static` was cleaned up.

## Environment And Credential Availability

| Prerequisite | Availability | Notes |
| --- | --- | --- |
| GitHub App env values | AVAILABLE | `ROUTELY_GITHUB_APP_ID`, private key, webhook secret, client ID, and client secret are present in `.env`; values were not printed. |
| Routely admin token | AVAILABLE | Present in `.env`; used via `x-routely-admin-token` header without printing. |
| Public webhook URL | BLOCKED | No VPS/domain/public tunnel was provided. |
| Disposable deployed app | BLOCKED | No VPS deployment target was available. |
| GitHub test repo/branch | BLOCKED | No repo URL, branch, or `GITHUB_TOKEN`/push credentials were provided. |
| Successful real push | BLOCKED | Requires a real repo and reachable webhook. |
| Intentional failing real push | BLOCKED | Requires a real repo, deployed app, and permission to push a broken commit. |

## Commands Run

| Command | Result | Notes |
| --- | --- | --- |
| `routely init` in `.qa-runs/qa-01-github-static` | PASS | Created isolated local workspace. |
| `routely add /home/ruddypp/Documents/work/routely/examples/hello-docker --name web --driver dockerfile --port 3000 --health-path /health` | PASS | Registered a Dockerfile app for local webhook deploy simulation. |
| `DOTENV_CONFIG_PATH=/home/ruddypp/Documents/work/routely/.env ROUTELY_WORKSPACE_ROOT=.qa-runs/qa-01-github-static ROUTELY_DAEMON_PORT=9989 node -r dotenv/config apps/daemon/src/server.js` | PASS | Started temp daemon with GitHub env loaded and production auth inherited. |
| `curl -H "x-routely-admin-token: <redacted>" http://127.0.0.1:9989/github/status` | PASS | Reported GitHub configured, app ID/client ID present, webhook secret/private key configured. |
| `curl -X POST /github/installations` with fixture installation | PASS | Registered installation `123456` for `qa-fixture`. |
| `curl -X POST /github/repos` with `qa-owner/qa-repo` | PASS | Registered repository metadata with `defaultBranch: main`. |
| `curl -X POST /apps/:id/github` with `fullName: qa-owner/qa-repo`, `branch: main` | PASS | Connected app `web` to repo/branch with auto-deploy enabled. |
| Invalid signed webhook `X-Hub-Signature-256: sha256=bad` | PASS | Returned `401` and recorded rejected delivery. |
| Valid signed `feature` branch webhook | PASS | Returned `202`, ignored delivery because no app was connected to `feature`. |
| Duplicate valid delivery ID | PASS | Returned duplicate/already processed response. |
| Valid signed `main` branch webhook | PASS | Returned `202`, queued deployment for app `web` with commit SHA. |
| `curl /deployments` after wait | PASS | Deployment transitioned to `succeeded`, phase `succeeded`, repo/branch/commit metadata preserved. |
| `curl /deployments/1/logs` | PASS | Logs contained queued GitHub deployment, Docker build/start, healthcheck retries, and success URL. |
| `docker rm -f routely_web_1`, `docker image rm routely/web:1`, temp workspace cleanup | PASS | Removed local Docker artifacts and temp files. |
| `npm run test --workspace apps/cli` | PASS | Shared baseline from local QA run; 91 CLI tests passed. |
| `npm run test --workspace apps/web` | PASS | Shared baseline from local QA run; 62 web API tests passed. |

## Verified Results

| Area | Expected | Actual | Status |
| --- | --- | --- | --- |
| GitHub config detection | Server detects configured App ID, private key, webhook secret, client ID. | `/github/status` reported configured with app/client IDs present and secrets configured. | PASS |
| Repo/branch mapping | App can connect to repo/branch metadata. | `web` connected to `qa-owner/qa-repo:main`; auto-deploy enabled. | PASS |
| Invalid signature | Webhook rejects invalid `X-Hub-Signature-256`. | Invalid delivery returned `401`; delivery recorded `status: rejected`, `signatureValid: false`. | PASS |
| Ignored branch | Pushes to unconfigured branches do not deploy. | Valid signed `feature` delivery returned ignored reason `No Routely app is connected to qa-owner/qa-repo:feature.` | PASS |
| Delivery dedupe | Duplicate delivery IDs are ignored where practical. | Second `qa-ignored-branch` delivery returned `duplicate: true`, `alreadyProcessed: true`. | PASS |
| Configured branch queue | Pushes to configured branch create deployment metadata. | Valid signed `main` delivery queued deployment `1` for `web`, preserving repo, branch, and commit SHA. | PASS (LOCAL SIMULATION) |
| Deploy history/logs | Deployment records include status/phase/logs. | Local Dockerfile deploy reached `succeeded`; logs included queue, build, start, healthcheck, and success messages. | PASS (LOCAL SIMULATION) |
| Real successful GitHub push | A real push from GitHub reaches Routely and redeploys. | Not executed; no public webhook URL or test repo credentials. | BLOCKED |
| Real intentional failing push | Broken commit marks failed phase and exposes logs. | Not executed; no test repo/deployed app/push permission. | BLOCKED |

## Evidence

Configured branch webhook response summary:

```json
{
  "ok": true,
  "queued": true,
  "app": "web",
  "delivery": {
    "status": "deployment_queued",
    "repo": "qa-owner/qa-repo",
    "branch": "main",
    "commitSha": "3333333333333333333333333333333333333333",
    "deploymentId": 1
  },
  "deployment": {
    "id": 1,
    "status": "preparing",
    "phase": "preparing"
  }
}
```

Final deployment summary after wait:

```json
[
  {
    "id": 1,
    "appName": "web",
    "status": "succeeded",
    "phase": "succeeded",
    "repo": "qa-owner/qa-repo",
    "branch": "main",
    "commitSha": "3333333333333333333333333333333333333333",
    "containerName": "routely_web_1",
    "hostPort": 32001
  }
]
```

Delivery summary:

```json
[
  {
    "deliveryId": "qa-ignored-branch",
    "event": "push",
    "status": "ignored",
    "signatureValid": true,
    "repo": "qa-owner/qa-repo",
    "branch": "feature",
    "message": "No Routely app is connected to qa-owner/qa-repo:feature."
  },
  {
    "deliveryId": "qa-invalid-signature",
    "event": "push",
    "status": "rejected",
    "signatureValid": false,
    "message": "GitHub webhook signature length mismatch."
  },
  {
    "deliveryId": "qa-main-branch",
    "event": "push",
    "status": "deployment_queued",
    "signatureValid": true,
    "repo": "qa-owner/qa-repo",
    "branch": "main"
  }
]
```

## Findings For Routely Lead

### ENV-QA-2026-06-22-GITHUB-01: Real GitHub push demo cannot be accepted in this environment

- Severity: Environment blocker for Demo 3 release gate.
- Owner: Routely Lead.
- Expected: QA performs one successful real GitHub push and one intentional failing push through a reachable Routely webhook and deployed app.
- Actual: GitHub App env values exist locally, but no public webhook URL, disposable VPS/domain, test repository details, or push credentials were available.
- Instructions: Provide a GitHub App installation/repository, push credentials or explicit repo access, a deployed app reachable through the one-VPS path, and the public webhook URL configured in GitHub before rerunning Demo 3.

## Backend Instructions

No backend blocker was found in local GitHub route/API checks. Signature validation, rejected deliveries, ignored branches, dedupe, repo/app mapping, deployment queue metadata, and deploy logs behaved as expected in local simulation.

## Frontend Instructions

No real GitHub dashboard push flow was validated because no public provider-backed demo was available. Frontend should still surface the verified backend states: configured app metadata, ignored delivery, duplicate delivery, queued deployment, deployment phase, and log path.

## Notes

- QA did not edit production code.
- QA did not commit this report.
- Temporary signed payload files, Docker container/image, and workspace were cleaned up.
- Local signed webhook simulation is not a substitute for the release-gate real GitHub push demo.
