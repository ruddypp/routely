# Routely Public Alpha Plan

Status: Canonical PM execution plan
Owner: PM
Last updated: 2026-06-21

## Public Alpha Objective

Public alpha should prove Routely's core promise with three repeatable demos, not by adding more breadth.

The objective is to make the existing alpha foundations honest, documented, secure enough for an early self-hosted user, and easy for a new tester to verify:

```text
One command local.
One VPS always-on.
One dashboard to deploy and operate every app.
```

## Three Demos

### 1. Local Demo

Goal: three apps plus one database started by `routely`.

The tester starts from a clean workspace, registers three local command apps and one Compose-backed database service, runs `routely`, and sees all four workloads in CLI and dashboard status with logs available.

### 2. VPS Demo

Goal: one Dockerfile app deployed to a VPS with domain and HTTPS.

The tester initializes Routely on one Linux VPS, confirms server readiness, deploys a Dockerfile app, attaches a domain, verifies DNS/proxy state, and confirms HTTPS is honestly reported. Routely must not claim certificate success just because config was generated.

### 3. GitHub Demo

Goal: push triggers auto-redeploy and failure logs are inspectable.

The tester connects one GitHub repo and branch to an already deployed app, pushes a successful commit, then pushes an intentionally broken commit. Routely validates the webhook, triggers only the configured branch, records deployment metadata, marks failure phase, and exposes useful logs in the dashboard and CLI.

## Vertical Slices

### Slice 1: Local Demo Hardening

Outcome: a new user can complete the local demo from docs without private chat context.

Scope:

- Confirm `routely init`, `routely add`, `routely db add`, `routely`, `routely ps`, `routely logs`, `routely restart`, `routely down`, and `routely doctor` match documented behavior.
- Provide or document three tiny app examples and one database service path.
- Preserve workspace resolution: active user workspace is separate from Routely repo/install root.
- Verify dependency ordering, port preflight, stale runtime reconciliation, and log persistence.
- Ensure dashboard app/service status and logs are real-data backed through same-origin `/api/*`.

Primary roles: Backend, Frontend, UI/UX, QA E2E, Security.

### Slice 2: VPS Demo Hardening

Outcome: a tester can deploy a Dockerfile app on one VPS and route it through a domain with honest HTTPS/proxy state.

Scope:

- Confirm production env requirements, data directory, and `routely server init` / `routely server doctor` behavior.
- Verify production mutation APIs require auth.
- Harden Dockerfile deploy phases and deployment logs.
- Verify domain DNS checks against `ROUTELY_SERVER_PUBLIC_IP` where possible.
- Keep TLS state conservative.
- Document the alpha bootstrap path for running Routely itself on the VPS until installer/service automation is complete.

Primary roles: Backend, Frontend, UI/UX, QA E2E, Security.

### Slice 3: GitHub Demo Hardening

Outcome: one configured branch push triggers exactly the intended redeploy; a broken deploy is diagnosable.

Scope:

- Confirm required GitHub App env vars and setup steps.
- Preserve `X-Hub-Signature-256` validation.
- Preserve delivery dedupe and configured branch filtering.
- Persist repo, branch, commit SHA, delivery ID, deployment status, failure phase, and log links where available.
- Ensure dashboard path from GitHub status/delivery to deployment logs is obvious.

Primary roles: Backend, Frontend, UI/UX, QA E2E, Security.

### Slice 4: Demo-Critical Dashboard Polish

Outcome: the dashboard helps complete the three demos without mock-success behavior.

Scope:

- Overview: server readiness, fleet counts, recent deploys, health failures, urgent next actions.
- Apps/services: local lifecycle, URLs, status, logs.
- Deployments: phases, latest status, failure details, logs.
- Domains: DNS, proxy, HTTPS state, route target.
- GitHub: connection state, repo/branch, latest delivery/deploy, ignored/failing events.
- Settings/notifications/backups only where they support demo diagnosis and readiness.

Primary roles: Frontend and UI/UX with Backend support, then QA E2E and Security.

### Slice 5: Release Docs And Onboarding

Outcome: a new user can run the alpha demos from public docs, and contributors know what is stable, deferred, and risky.

Scope:

- README quickstarts for local, VPS, and GitHub demos.
- `docs/08-development-setup.md` contributor setup refresh.
- `docs/09-current-status.md` final public alpha status.
- CLI/config/API/security docs reconciled to actual demo commands.
- QA smoke reports under `docs/qa/`.
- Security review under `docs/security/`.
- Contributing and security disclosure docs if approved for public alpha.

Primary roles: PM, QA E2E, Security, Backend, Frontend, UI/UX.

## Order Of Execution

1. PM completes this docs reset and gets approval before deletion/archive cleanup.
2. Backend verifies and hardens the local demo path.
3. Frontend and UI/UX tighten local dashboard workflows around real data.
4. QA E2E runs local demo smoke and files blocker instructions.
5. Security reviews local binding, command execution messaging, and secret/log exposure.
6. Backend hardens VPS init/doctor, Dockerfile deploy, domain/HTTPS, and production auth.
7. Frontend and UI/UX tighten server readiness, deployment, domain, health, and log flows.
8. QA E2E runs disposable VPS smoke with dated environment notes.
9. Security reviews production trust boundaries: auth, Docker/proxy exposure, secrets, backups, outbound checks.
10. Backend hardens GitHub webhook deploy flow and failure metadata.
11. Frontend and UI/UX tighten GitHub diagnosis flow.
12. QA E2E runs successful and broken GitHub push smoke.
13. Security reviews webhook signature, dedupe, repo authorization assumptions, and untrusted text rendering.
14. PM reconciles docs and release readiness status.
15. Routely Lead asks the user for approval before archive/delete cleanup.

## Risks

- Scope creep: production operations are broad. Tie every alpha task to one of the three demos.
- Security: Routely executes local commands and connected repo code, stores secrets, receives webhooks, and sends outbound notifications.
- VPS variability: Docker, DNS, proxy, ACME, firewall, OS, and provider differences can break the demo.
- HTTPS truthfulness: generated proxy config is not the same as issued certificates.
- SQLite expectations: SQLite is intentional for single-node MVP, not a distributed control plane.
- Dirty worktree: current repo state has unrelated modifications. Agents must preserve unrelated changes and commit only owned files when a checkpoint requires a commit.
- Next.js version: before editing `apps/web`, agents must read the relevant guide under `node_modules/next/dist/docs/` as required by `AGENTS.md`.

## Deferred Scope

- Marketplace/templates as a public feature.
- Teams/RBAC.
- Multi-server UX.
- Kubernetes.
- Broad VPS management.
- Email notifications.
- External backup storage.
- Destructive restore automation.
- Preview deployments.
- Managed cloud service.
- Advanced rollback orchestration beyond preserving or identifying last successful deployments where practical.
