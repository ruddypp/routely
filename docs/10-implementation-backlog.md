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

## 2026-06-22 GitHub Issue Fallback: End-To-End Vertical Slices

GitHub publishing status: blocked by missing canonical triage labels. `gh` is authenticated for `ruddypp/routely`, but label verification found only `wontfix` from the required Matt Pocock triage vocabulary. Missing labels to create before issue publishing: `needs-triage`, `needs-info`, `ready-for-agent`, and `ready-for-human`.

No substitute labels were used and no GitHub issues were created. When the missing labels exist, publish these issue bodies in dependency order with the `ready-for-agent` label.

### Issue: Public alpha slice 1 — One-command local bootstrap

Labels: `ready-for-agent` once available

Owner: Backend, Frontend, QA, Security

Blocked by: None — can start immediately

Source docs:

- https://github.com/ruddypp/routely/blob/main/docs/13-end-to-end-execution-plan.md#slice-1-one-command-local-bootstrap
- https://github.com/ruddypp/routely/blob/main/docs/01-alpha-plan.md#three-demos
- https://github.com/ruddypp/routely/blob/main/docs/03-demo-acceptance-plan.md#demo-1-local-dashboard-first-start-all

#### What to build

Harden the one-command local path so `routely` starts the local runtime and dashboard predictably from a clean workspace, reports real daemon/server readiness, and surfaces actionable startup failures without leaking raw secrets or unsafe logs.

#### Acceptance criteria

- [ ] `routely` starts the local runtime and dashboard path predictably.
- [ ] Dashboard readiness comes from real daemon/server status rather than placeholder state.
- [ ] Port binding and daemon startup failures return actionable errors.
- [ ] Local defaults bind privately and avoid raw secret/log leakage in user-facing surfaces.

#### Verification

- [ ] CLI lifecycle tests pass for local bootstrap and shutdown behavior.
- [ ] Web server-status route tests pass for readiness and failure states.
- [ ] QA can start from a clean workspace using public docs only.
- [ ] Security confirms local binding and leakage expectations.

### Issue: Public alpha slice 2 — App registry and stack presets

Labels: `ready-for-agent` once available

Owner: PM, UI/UX, Backend, Frontend

Blocked by: Public alpha slice 1 — One-command local bootstrap

Source docs:

- https://github.com/ruddypp/routely/blob/main/docs/13-end-to-end-execution-plan.md#slice-2-app-registry-and-stack-presets
- https://github.com/ruddypp/routely/blob/main/docs/01-alpha-plan.md#slice-1-compose-backed-registry-and-enablement
- https://github.com/ruddypp/routely/blob/main/docs/10-implementation-backlog.md#slice-1-compose-backed-registry-and-enablement

#### What to build

Make the managed app registry and bounded stack presets coherent across local and one-VPS setup so app metadata, enablement, and supported/deferred stack paths remain consistent and honest across config, runtime state, daemon DTOs, dashboard APIs, and UI copy.

#### Acceptance criteria

- [ ] Dashboard can create or edit a managed app with name, path/source, enablement, driver, command/Compose/Dockerfile metadata, ports, env metadata, dependencies, healthcheck, and optional domain metadata.
- [ ] Stack presets explain supported paths and unsupported/deferred paths honestly.
- [ ] Registry state stays consistent across `routely.yml`, SQLite/runtime state, daemon DTOs, and dashboard APIs.

#### Verification

- [ ] Registry normalization tests cover enabled and disabled app states.
- [ ] Dashboard API tests cover command apps, Compose-backed apps, and unsupported preset states.
- [ ] PM/UI review confirms unsupported stack paths are not presented as implemented.

### Issue: Public alpha slice 3 — Start All, stop, disable, logs, and health

Labels: `ready-for-agent` once available

Owner: Backend, Frontend, QA, Security

Blocked by: Public alpha slice 2 — App registry and stack presets

Source docs:

- https://github.com/ruddypp/routely/blob/main/docs/13-end-to-end-execution-plan.md#slice-3-start-all-stop-disable-logs-health
- https://github.com/ruddypp/routely/blob/main/docs/03-demo-acceptance-plan.md#demo-1-local-dashboard-first-start-all
- https://github.com/ruddypp/routely/blob/main/docs/12-prd.md#local-runner

#### What to build

Complete the local dashboard-first operations loop: Start All starts every enabled app, disabled apps remain registered but skipped, individual stop affects only the current runtime instance, and logs/status/health/failure states are visible and actionable.

#### Acceptance criteria

- [ ] Start All starts every enabled app and skips disabled apps with clear reason copy.
- [ ] Stop affects the running app now; disable excludes the app from future Start All without deleting it.
- [ ] Logs, status, health, dependency, crash, and port conflict states are visible and actionable.

#### Verification

- [ ] CLI tests cover enabled filtering, stop versus disable semantics, port conflict, app crash, logs, and health unavailable states.
- [ ] Dashboard API tests cover the same local lifecycle and status behaviors.
- [ ] QA records local smoke results for desktop, tablet, and mobile.
- [ ] Security reviews local log rendering and secret exposure risk.

### Issue: Public alpha slice 4 — One-VPS bootstrap and auth

Labels: `ready-for-agent` once available

Owner: Backend, Frontend, QA, Security

Blocked by: Public alpha slice 2 — App registry and stack presets

Source docs:

- https://github.com/ruddypp/routely/blob/main/docs/13-end-to-end-execution-plan.md#slice-4-one-vps-bootstrap-and-auth
- https://github.com/ruddypp/routely/blob/main/docs/03-demo-acceptance-plan.md#demo-2-one-vps-compose-operations
- https://github.com/ruddypp/routely/blob/main/docs/12-prd.md#one-vps-production

#### What to build

Make the one-VPS bootstrap path trustworthy by reporting production readiness, enforcing admin auth for private mutation operations, and separating local, production-ready, production-blocked, and auth-missing dashboard states.

#### Acceptance criteria

- [ ] Production init/doctor reports server readiness with actionable checks.
- [ ] Private mutation operations require production auth/admin token.
- [ ] Dashboard server status separates local, production-ready, production-blocked, and auth-missing states.

#### Verification

- [ ] Auth tests reject unauthenticated production mutations.
- [ ] Doctor/status tests cover production-ready and production-blocked states.
- [ ] Dashboard route/UI tests cover auth-missing and server status rendering where touched.
- [ ] Security confirms unauthenticated mutations fail.

### Issue: Public alpha slice 5 — Deploy, domain, proxy, and HTTPS truth

Labels: `ready-for-agent` once available

Owner: Backend, Frontend, QA, Security

Blocked by: Public alpha slice 4 — One-VPS bootstrap and auth

Source docs:

- https://github.com/ruddypp/routely/blob/main/docs/13-end-to-end-execution-plan.md#slice-5-deploy-domain-proxy-https-truth
- https://github.com/ruddypp/routely/blob/main/docs/03-demo-acceptance-plan.md#demo-2-one-vps-compose-operations
- https://github.com/ruddypp/routely/blob/main/docs/01-alpha-plan.md#slice-3-one-vps-compose-operations

#### What to build

Verify one managed app can deploy on one VPS through the current supported runtime path while domain verification, proxy route generation, TLS/HTTPS state, deployment phases, latest successful deployment, and failure logs remain distinct and honest.

#### Acceptance criteria

- [ ] One managed app deploys on one VPS through the verified runtime path.
- [ ] Domain verification, generated proxy route, HTTPS/TLS, latest successful deployment, deploy phases, and failure logs are represented separately.
- [ ] UI avoids success copy/colors for generated, pending, failed, or unverified states.

#### Verification

- [ ] Deploy/domain/proxy tests pass.
- [ ] QA runs a disposable VPS smoke with a real domain.
- [ ] Security audits Docker/Compose/proxy exposure and TLS truthfulness.
- [ ] Public docs label any Dockerfile-only bridge honestly if production Compose parity is not verified.

### Issue: Public alpha slice 6 — GitHub redeploy diagnosis

Labels: `ready-for-agent` once available

Owner: Backend, Frontend, QA, Security

Blocked by: Public alpha slice 5 — Deploy, domain, proxy, and HTTPS truth

Source docs:

- https://github.com/ruddypp/routely/blob/main/docs/13-end-to-end-execution-plan.md#slice-6-github-redeploy-diagnosis
- https://github.com/ruddypp/routely/blob/main/docs/03-demo-acceptance-plan.md#demo-3-github-redeploy-and-diagnosis
- https://github.com/ruddypp/routely/blob/main/docs/01-alpha-plan.md#slice-4-github-redeploy-diagnosis

#### What to build

Harden the GitHub redeploy loop so only configured repo/branch mappings trigger deploys, signed webhook deliveries are validated and deduped where practical, and the dashboard shows delivery/deploy status, commit metadata, failures, and log paths.

#### Acceptance criteria

- [ ] GitHub App metadata is configured server-side.
- [ ] Webhook signatures are validated and deliveries are deduped where practical.
- [ ] Only configured repo/branch mappings trigger deploy.
- [ ] Dashboard shows latest delivery, ignored events, deploy phase, commit metadata, failure reason, and log path.

#### Verification

- [ ] GitHub route/webhook tests pass.
- [ ] QA records one successful push and one intentional failed deploy.
- [ ] Security audits webhook replay, repo authorization, and untrusted text rendering.

### Issue: Public alpha slice 7 — Operations surfaces

Labels: `ready-for-agent` once available

Owner: Backend, Frontend, QA, Security

Blocked by: Public alpha slice 5 — Deploy, domain, proxy, and HTTPS truth

Source docs:

- https://github.com/ruddypp/routely/blob/main/docs/13-end-to-end-execution-plan.md#slice-7-operations-surfaces
- https://github.com/ruddypp/routely/blob/main/docs/03-demo-acceptance-plan.md#demo-2-one-vps-compose-operations
- https://github.com/ruddypp/routely/blob/main/docs/12-prd.md#operations

#### What to build

Expose one-VPS operational surfaces with real or honestly unavailable data for env/secrets, internal databases, backup jobs/runs, metrics, health, logs, deploy history, and notifications without implying unsafe restore support or fake observability breadth.

#### Acceptance criteria

- [ ] Env/secrets store only redacted public metadata after save.
- [ ] Database services are internal-only by default.
- [ ] Backup jobs/runs expose status and local-file metadata without unsafe restore promises.
- [ ] Metrics, health, logs, deploy history, and notifications show real data or honest unavailable/deferred states.

#### Verification

- [ ] Env/database/backup/metrics/notifications tests pass for touched surfaces.
- [ ] Security validates redaction and outbound notification trust boundaries.
- [ ] UI avoids presenting deferred restore or unsupported operations as implemented.

### Issue: Public alpha slice 8 — Release docs and final gate

Labels: `ready-for-agent` once available

Owner: Routely Lead, PM, Backend, Frontend, QA, Security

Blocked by: Public alpha slices 1–7

Source docs:

- https://github.com/ruddypp/routely/blob/main/docs/13-end-to-end-execution-plan.md#slice-8-release-docs-and-final-gate
- https://github.com/ruddypp/routely/blob/main/docs/01-alpha-plan.md#slice-5-release-docs-and-onboarding
- https://github.com/ruddypp/routely/blob/main/docs/03-demo-acceptance-plan.md#release-readiness-gate

#### What to build

Reconcile public docs, QA/Security reports, and release-readiness status so a new solo operator can run the local, one-VPS, and GitHub demos from public instructions without private chat context or unsupported behavior presented as implemented.

#### Acceptance criteria

- [ ] Public docs let a new solo operator run local, one-VPS, and GitHub demos without private chat context.
- [ ] QA and Security reports exist and are routed.
- [ ] Known deferred scope is explicit and not shown as implemented.
- [ ] README commands match verified behavior.

#### Verification

- [ ] `npm run lint`, relevant workspace tests, and demo smoke checks pass or failures are documented with ownership.
- [ ] Local dashboard-first demo remains a release gate.
- [ ] One-VPS demo remains a release gate.
- [ ] GitHub redeploy demo remains a release gate.

## Verification Policy

Use the narrowest checks that cover the touched work. Minimums:

- docs-only: `git diff --check` plus targeted reference searches
- CLI/shared: `npm run lint`, `npm run test --workspace apps/cli`
- daemon: `node --check apps/daemon/src/server.js` plus relevant API tests
- web: read Next.js docs first, then `npm run lint`, `npm run test --workspace apps/web`, and `npx tsc --noEmit --project apps/web/tsconfig.json`
- broad release: `npm run build --workspaces --if-present` when practical

Commit only after verification passes and only for owned changes.
