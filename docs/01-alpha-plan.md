# Routely Public Alpha Plan

Status: Canonical PM execution plan
Owner: PM
Last updated: 2026-06-22

## Public Alpha Objective

Public alpha should prove Routely's Compose-first, dashboard-first promise with three repeatable demos, not by adding more breadth.

The objective is to make the existing alpha foundations honest, documented, secure enough for an early self-hosted solo developer, and easy for a new tester to verify:

```text
One dashboard to register and operate apps.
One Start action for every enabled app.
One Compose-backed model from laptop to VPS.
```

The CLI remains important for bootstrap, scripting, and diagnostics. Normal app setup and day-two operation should be possible from the dashboard once the relevant slice is implemented.

## Three Demos

### 1. Local Dashboard-First Demo

Goal: three apps plus one database are registered, started together, and managed individually.

The tester starts from a clean workspace, registers three apps and one Compose-backed database service, marks one app disabled, uses Start All to start every enabled app/service, then stops one running app individually. CLI and dashboard status/logs must agree. Disabled apps remain registered but do not participate in Start All.

### 2. One-VPS Compose Operations Demo

Goal: one app runs always-on on one VPS with operational state exposed honestly.

The tester initializes Routely on one Linux VPS, confirms server readiness, deploys or syncs one Compose-backed app, attaches a domain, configures env/secrets, records deploy history/logs, checks health, and verifies database/backup state where implemented. Domain/proxy/HTTPS state must distinguish generated config, DNS mismatch, pending TLS, verified TLS, and failure. Routely must not claim certificate or deploy success just because configuration was generated.

Current Dockerfile deploy foundations may be used as implementation bridges while Backend hardens the Compose-backed production path. Public docs must state the verified path only.

### 3. GitHub Redeploy And Diagnosis Demo

Goal: push triggers the intended redeploy and failure logs are inspectable.

The tester connects one GitHub repo and branch to an already deployed app, pushes a successful commit, then pushes an intentionally broken commit. Routely validates the webhook, triggers only the configured branch, records deployment metadata, marks failure phase, and exposes useful logs/deploy history in the dashboard and CLI.

## Vertical Slices

### Slice 1: Compose-Backed Registry And Enablement

Outcome: Routely has one app registry model that can express enabled/disabled apps, Compose-backed services, and the local-to-VPS direction without promising unsupported runtime behavior.

Scope:

- Verify `routely.yml`, SQLite, DTOs, and dashboard APIs preserve `enabled`, `driver`, `compose_file`, `compose_service`, dependencies, ports, healthcheck, domains, source, and env metadata.
- Preserve existing local behavior where `routely` starts enabled `command` and `compose` apps.
- Define Start All semantics: start all enabled apps/services in dependency order; skip disabled apps; keep disabled apps visible and editable.
- Define per-app controls: stop affects the current running instance; disable excludes the app from future bulk starts without deleting config/history.
- Keep unimplemented enable/disable, production Compose, and dashboard controls hidden, disabled, or labeled deferred until code supports them.

Primary roles: Backend, Frontend, UI/UX, QA E2E, Security.

### Slice 2: Dashboard-First App Operations

Outcome: normal setup and operations can be driven from a simple dashboard rather than manual config editing.

Scope:

- App creation/editing: name, path/source, command or Compose metadata, port, dependencies, healthcheck, domains, env/secrets, and enablement.
- Bulk Start: one clear action starts enabled apps/services and reports skipped disabled apps.
- Per-app stop/disable: controls explain the difference between stopping now and excluding from future Start All.
- Information architecture: Dokploy-inspired operations surface with 9Router-like lightness and low ceremony.
- Real-data honesty: dashboard modules must use same-origin `/api/*` data and avoid mock-success states.
- Unsupported states: production-only or not-yet-implemented actions must be disabled, hidden, or explicitly deferred.

Primary roles: UI/UX and Frontend with Backend support, then QA E2E and Security.

### Slice 3: One-VPS Compose Operations

Outcome: a tester can operate one app on one VPS and see useful production state without treating Routely as a broad server admin tool.

Scope:

- Confirm production env requirements, data directory, and `routely server init` / `routely server doctor` behavior.
- Verify production mutation APIs require admin auth.
- Harden the verified deploy path toward Compose-backed app operation; keep Dockerfile-only behavior documented as a current alpha foundation if Compose parity is not complete.
- Domain/proxy: DNS checks, route target, generated proxy config, HTTPS/TLS state, and failure messages.
- Env/secrets: save/update/redacted list behavior and restart/redeploy-needed state where implemented.
- Databases/backups: internal-by-default database records, backup jobs/runs, retention, and sensitive-file assumptions.
- Logs/deploy history/health: deployment phases, runtime/deployment logs, healthcheck state, latest successful deployment, and failure diagnosis.
- Document the alpha bootstrap path for running Routely itself on the VPS until installer/service automation is complete.

Primary roles: Backend, Frontend, UI/UX, QA E2E, Security.

### Slice 4: GitHub Redeploy Diagnosis

Outcome: one configured branch push triggers exactly the intended redeploy; a broken deploy is diagnosable.

Scope:

- Confirm required GitHub App env vars and setup steps.
- Preserve `X-Hub-Signature-256` validation.
- Preserve delivery dedupe and configured repo/branch filtering.
- Persist repo, branch, commit SHA, delivery ID, deployment status, failure phase, and log links where available.
- Ensure dashboard path from GitHub status/delivery to deployment logs is obvious.

Primary roles: Backend, Frontend, UI/UX, QA E2E, Security.

### Slice 5: Release Docs And Onboarding

Outcome: a new solo developer can run the alpha demos from public docs, and contributors know what is stable, deferred, and risky.

Scope:

- README quickstarts for local, one-VPS, and GitHub demos using only verified commands.
- `docs/08-development-setup.md` contributor setup refresh.
- `docs/09-current-status.md` final public alpha status.
- CLI/config/API/security docs reconciled to actual demo commands and dashboard-first flows.
- QA smoke reports under `docs/qa/`.
- Security review under `docs/security/`.
- Contributing and security disclosure docs if approved for public alpha.

Primary roles: PM, QA E2E, Security, Backend, Frontend, UI/UX.

## Order Of Execution

1. PM completes this Compose-first docs reset and commits only PM-owned docs/playbook changes after verification.
2. UI/UX defines the dashboard-first information architecture and state language for Start All, per-app stop/disable, deferred actions, and production operations.
3. Backend verifies and hardens the Compose-backed app registry, enablement semantics, local Start All behavior, and API contracts.
4. Frontend implements dashboard-first app creation/editing, Start All, per-app stop/disable states, and real-data local logs/status.
5. QA E2E runs local demo smoke and files blocker instructions through Routely Lead.
6. Security reviews local binding, command/container execution messaging, and secret/log exposure.
7. Backend hardens one-VPS init/doctor, production auth, deploy path, domain/proxy, env/secrets, database/backups, logs, deploy history, and health.
8. Frontend implements the corresponding production dashboard surfaces against real data.
9. QA E2E runs disposable VPS smoke with dated environment notes.
10. Security reviews production trust boundaries: auth, Docker/Compose/proxy exposure, secrets, backups, outbound checks, and untrusted text.
11. Backend hardens GitHub webhook redeploy flow and failure metadata.
12. Frontend tightens GitHub diagnosis flow.
13. QA E2E runs successful and broken GitHub push smoke.
14. Security reviews webhook signature, dedupe, repo authorization assumptions, and untrusted text rendering.
15. PM reconciles docs and release readiness status.
16. Routely Lead asks the user for approval before destructive cleanup, credential actions, or public release steps.

## Risks

- Scope creep: production operations are broad. Tie every alpha task to one of the three demos.
- Implementation gap: current code has Compose-backed local services and Dockerfile deploy foundations; production Compose parity must be verified before public docs claim it.
- Security: Routely executes local commands, containers, and connected repo code; stores secrets; receives webhooks; and sends outbound notifications.
- VPS variability: Docker, Compose, DNS, proxy, ACME, firewall, OS, and provider differences can break the demo.
- HTTPS truthfulness: generated proxy config is not the same as issued certificates.
- SQLite expectations: SQLite is intentional for one-node MVP state, not a distributed control plane.
- Dashboard honesty: mock success or enabled controls for unsupported actions would damage trust.
- Dirty worktree: agents must preserve unrelated changes and commit only owned files when a checkpoint requires a commit.
- Next.js version: before editing `apps/web`, agents must read the relevant guide under `node_modules/next/dist/docs/` as required by `AGENTS.md`.

## Deferred Scope

- Public app catalog as a public feature.
- Teams/RBAC, organizations, billing, or enterprise audit workflows.
- Public multi-server UX.
- Kubernetes.
- Broad VPS management outside Routely-managed apps/services.
- Email notifications.
- External backup storage.
- Destructive restore automation.
- Preview deployments.
- Managed cloud service.
- Advanced rollback orchestration beyond preserving or identifying last successful deployments where practical.
