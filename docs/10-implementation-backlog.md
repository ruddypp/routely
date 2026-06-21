# Routely Implementation Backlog

Status: Canonical backlog for dev agents
Owner: PM
Last updated: 2026-06-22

## Source Of Execution

`docs/01-alpha-plan.md` is the execution source for public alpha work. This backlog expands that plan into implementable slices for Backend, Frontend, UI/UX, QA, and Security without changing the product scope.

## Slice 1: Compose-Backed Registry And Enablement

Goal: one app registry model expresses enabled/disabled apps, Compose-backed services, and the local-to-VPS direction honestly.

Backend:

- Verify `routely.yml`, SQLite, DTOs, and dashboard APIs preserve `enabled`, `driver`, `compose_file`, `compose_service`, dependencies, ports, healthcheck, domains, source, and env metadata.
- Preserve existing local behavior where `routely` starts enabled `command` and `compose` apps.
- Harden dependency ordering, port conflict handling, process/container lifecycle, and log access.
- Add focused tests for enablement filtering, config normalization, and local lifecycle risk points.

Frontend/UI:

- Show enablement state, driver, status, URLs, logs, and disabled reasons from real data.
- Keep local lifecycle controls visible only where actions are implemented.
- Distinguish stop-now from disable-for-future-starts.

QA/Security:

- Run clean workspace smoke.
- Test disabled app skip, port conflict, or app crash failure path.
- Verify local binding and secret/log exposure expectations.

Exit: local registry and enablement behavior is verified without private context.

## Slice 2: Dashboard-First App Operations

Goal: normal app setup and operations can be driven from a simple dashboard instead of manual config editing.

Backend:

- Confirm create/update/start/stop/logs/status API contracts for dashboard app operations.
- Return actionable errors for daemon offline, unsupported driver, disabled app, port conflict, auth missing, and server readiness blockers.

Frontend/UI:

- Implement or verify app creation/editing for name, path/source, command or Compose metadata, port, dependencies, healthcheck, domains, env/secrets, and enablement.
- Provide a Start All action for enabled resources where the backend contract supports it, or mark the action deferred with honest copy.
- Show per-app stop/disable controls with clear state language.
- Keep the information architecture Dokploy-inspired but light, low-ceremony, and solo-operator focused.

QA/Security:

- Smoke dashboard app setup and local lifecycle flows on desktop/tablet/mobile.
- Review untrusted text rendering in app names, commands, logs, domains, and branch names.

Exit: the dashboard can complete the local demo path or honestly documents any current CLI fallback.

## Slice 3: One-VPS Operations

Goal: one app can operate on one VPS with honest production state across domain/proxy, env/secrets, logs, deploy history, health, database, and backup surfaces.

Backend:

- Verify server init/doctor and production data directory behavior.
- Harden the verified deploy path toward Compose-backed operation; keep Dockerfile-only behavior labeled as a bridge if Compose parity is incomplete.
- Harden domain verification, proxy route generation, and conservative TLS status.
- Verify production mutation auth.
- Verify env/secrets save/list/redaction/redeploy-needed behavior.
- Verify database records, local backup jobs/runs, retention, and sensitive-file assumptions.
- Persist deploy phases, logs, latest successful deployment where practical, and failure diagnosis metadata.

Frontend/UI:

- Show server readiness, deployment phases, deploy history, domain/DNS/proxy/HTTPS state, env/secrets metadata, database/backup state, health, and logs from real data.
- Disable, hide, or mark unsupported production actions as deferred.
- Avoid success colors/copy for generated proxy config, pending TLS, or unverified domains.

QA/Security:

- Run disposable VPS smoke with dated environment details.
- Audit auth, Docker/Compose/proxy exposure, secrets, DNS, HTTPS truthfulness, backups, and outbound notifications.

Exit: one-VPS demo passes with a real domain and no fake deploy/proxy/HTTPS success.

## Slice 4: GitHub Redeploy Diagnosis

Goal: push to a configured branch redeploys the intended app; broken deploys are diagnosable.

Backend:

- Verify GitHub App setup docs and env requirements.
- Preserve signature validation, delivery dedupe, repo mapping, and branch filtering.
- Persist commit/deploy metadata, trigger source, failure phase, and log links.

Frontend/UI:

- Show GitHub connection status, repo/branch, latest delivery/deploy, ignored events, failure phase, deploy history, and log path.

QA/Security:

- Run one successful push and one intentional broken push.
- Audit webhook trust boundary, secret exposure, replay/dedupe, repo authorization assumptions, and untrusted text rendering.

Exit: GitHub demo passes and broken deploy logs identify the failure phase.

## Slice 5: Release Docs

Goal: public alpha docs are executable by a new solo developer.

PM:

- Rewrite README around the three demos and verified limitations.
- Keep docs index and docs map current.
- Document deferred scope and implementation gaps clearly.

Backend/Frontend:

- Provide verified command/API/dashboard route details.

QA/Security:

- Attach final smoke and security reports under `docs/qa/` and `docs/security/` through Routely Lead.

Exit: public docs match verified behavior.

## Verification Policy

Use the narrowest checks that cover the touched work. Minimums:

- docs-only: `git diff --check` plus targeted reference searches
- CLI/shared: `npm run lint`, `npm run test --workspace apps/cli`
- daemon: `node --check apps/daemon/src/server.js` plus relevant API tests
- web: read Next.js docs first, then `npm run lint`, `npm run test --workspace apps/web`, and `npx tsc --noEmit --project apps/web/tsconfig.json`
- broad release: `npm run build --workspaces --if-present` when practical

Commit only after verification passes and only for owned changes.
