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

## 2026-06-22 Coordinated QA/Security Bug Routing

Status: Agent-ready bug instructions from Routely Lead's coordinated QA/Security findings after report commit `51a7268`.

Source reports:

- `docs/qa/end-to-end-local-demo-2026-06-22.md`
- `docs/qa/end-to-end-vps-demo-2026-06-22.md`
- `docs/qa/end-to-end-github-demo-2026-06-22.md`
- `docs/security/end-to-end-local-dashboard-trust-boundary-2026-06-22.md`
- `docs/security/end-to-end-vps-github-trust-boundary-2026-06-22.md`

Use these briefs as the owner handoff until GitHub has the canonical triage labels. Publish each code/docs item as `ready-for-agent` once `needs-triage`, `needs-info`, `ready-for-agent`, and `ready-for-human` exist. Keep the source reports unchanged.

### Frontend Owner Instructions

#### Bug: Mobile dashboard clips demo-critical content

Severity: High release blocker.

Source finding: `FE-QA-2026-06-22-LOCAL-01` in `docs/qa/end-to-end-local-demo-2026-06-22.md`.

Current behavior: At 375px and 390px widths, the dashboard visually clips demo-critical content even after responsive fix `700ee5f`. The page can report no document-level horizontal overflow while parent containers hide clipped content. QA observed the workspace heading clipped, top status row off-screen, Start All scope text cut off, some actions unreachable, and bottom navigation labels truncated.

Desired behavior: The local dashboard demo remains readable and operable at 375px, 390px, tablet, and desktop widths. Top status chips, module headers, Start All copy, app rows, database rows, action buttons, and bottom navigation labels must stay inside the viewport without hidden left/right clipping.

Key interfaces:

- Dashboard shell/header/module layout and bottom navigation responsive behavior.
- Apps/Services dashboard state rendering for local demo data.
- Responsive test coverage that inspects element bounding boxes against the viewport, not only `documentElement.scrollWidth`.

Acceptance criteria:

- [ ] At 375px and 390px widths, no demo-critical dashboard element starts left of the viewport or ends right of the viewport.
- [ ] Top status chips, Start All controls, app/database rows, and primary actions remain readable and reachable on mobile.
- [ ] Existing desktop and tablet dashboard layouts keep their current information hierarchy.
- [ ] A frontend test or Playwright check fails when any required element's bounding box is clipped by a hidden-overflow parent.

Verification:

- [ ] Run the focused web checks for the touched dashboard surface.
- [ ] Capture or regenerate responsive evidence at 375px, 390px, 768px, and 1280px.
- [ ] QA reruns the local demo responsive check and closes `FE-QA-2026-06-22-LOCAL-01`.

Out of scope:

- Redesigning the dashboard information architecture beyond the minimum layout changes needed to prevent clipping.
- Hiding demo-critical controls on mobile instead of making them readable and reachable.

#### Bug: Same-origin dashboard routes proxy admin token without caller auth

Severity: High release blocker, shared with Backend.

Source findings: `SEC-E2E-LOCAL-02` and `SEC-E2E-VPS-02` in the Security reports.

Current behavior: Dashboard route helpers can forward the server-side `ROUTELY_ADMIN_TOKEN` to private daemon mutation/admin paths when `ROUTELY_ENV` is missing, even if the incoming dashboard caller is unauthenticated. The deployment log stream route has a separate token-forwarding path with the same trust-boundary risk.

Desired behavior: Same-origin dashboard route handlers must require caller auth before proxying the server-side admin token whenever production mode, an admin token, or daemon auth status indicates private control-plane access. Unauthenticated callers must never cause the web process to perform privileged daemon mutations.

Key interfaces:

- Dashboard caller-auth guard and token-forwarding helper.
- Deployment log stream route guard.
- Same-origin API route families for apps, deployments, domains, proxy, GitHub, env/secrets, databases, backups, metrics, health refreshes, and notifications.
- Daemon `/auth/status` or equivalent safe auth-status contract supplied by Backend.

Frontend acceptance criteria:

- [ ] With `ROUTELY_ADMIN_TOKEN` configured and `ROUTELY_ENV` unset, unauthenticated dashboard requests to private mutation/admin route handlers return an auth failure and do not forward the admin token.
- [ ] With production/auth-required daemon status, unauthenticated dashboard requests cannot trigger deploys, domain/proxy changes, env/secrets changes, GitHub connection changes, database operations, backup runs, notification mutations, log streams, health refreshes, or metrics refreshes.
- [ ] Authenticated callers can still use the same dashboard APIs when they supply the expected token/session.
- [ ] The deployment log stream route uses the same auth decision as the rest of the dashboard proxy surface.

Verification:

- [ ] Add or update web route-handler tests for `ROUTELY_ADMIN_TOKEN` set with `ROUTELY_ENV` unset.
- [ ] Add or update tests for production/auth-required daemon status and unauthenticated mutation attempts.
- [ ] Security reruns the dashboard trust-boundary checks for `SEC-E2E-LOCAL-02` and `SEC-E2E-VPS-02`.

Out of scope:

- Building a new multi-user auth system.
- Changing public health/auth-status responses beyond what is needed for safe dashboard gating.

### Backend Owner Instructions

#### Bug: Non-loopback local daemon bind can expose unauthenticated control plane

Severity: High release blocker.

Source finding: `SEC-E2E-LOCAL-01` in `docs/security/end-to-end-local-dashboard-trust-boundary-2026-06-22.md`.

Current behavior: A local operator can configure the daemon host to a non-loopback address such as `0.0.0.0` while local-mode authorization still allows private routes without production auth. The CLI launcher can pass this environment through to the daemon.

Desired behavior: Local daemon startup must reject non-loopback binds unless production auth is active or an explicit unsafe local override is present. If the unsafe override exists, startup output must make the risk obvious.

Key interfaces:

- Daemon host/bind configuration.
- Local versus production authorization mode.
- CLI local launcher environment handling.
- Private daemon route families for apps, deployments, domains, env, GitHub, databases, backups, notifications, logs, health, and metrics.

Acceptance criteria:

- [ ] Default local daemon startup binds only to loopback.
- [ ] Local startup with a non-loopback daemon host fails before listening when production auth is not active and no unsafe override is set.
- [ ] Production-authenticated startup can bind according to the production deployment contract.
- [ ] Any explicit unsafe local bind override requires a scary, documented env var and emits clear warning copy.
- [ ] CLI/daemon tests cover default loopback, non-loopback rejection, production-auth allowance, and unsafe override behavior.

Verification:

- [ ] Run focused daemon/CLI tests for startup binding and auth behavior.
- [ ] Security confirms `SEC-E2E-LOCAL-01` is closed without opening a live unsafe listener during review.

Out of scope:

- Changing the trusted solo-operator local app execution model.
- Making local command or Compose apps themselves untrusted sandboxes.

#### Bug: Same-origin admin-token proxy needs backend contract and regression coverage

Severity: High release blocker, shared with Frontend.

Source findings: `SEC-E2E-LOCAL-02` and `SEC-E2E-VPS-02` in the Security reports.

Current behavior: The daemon correctly protects production private routes, but the web process can become a confused deputy if it has `ROUTELY_ADMIN_TOKEN` and its route handlers do not require caller auth before token forwarding.

Desired behavior: Backend-owned daemon auth signals and private mutation contracts must support the Frontend fix. The daemon must keep private mutation/admin paths token-protected in production, expose only safe auth-status metadata publicly, and provide testable semantics that dashboard routes can use to decide whether caller auth is required.

Key interfaces:

- Daemon public auth-status and health/status metadata.
- Daemon private mutation/admin route authorization.
- Dashboard-to-daemon proxy contract for admin-token forwarding.

Backend acceptance criteria:

- [ ] Public auth-status metadata is sufficient for the dashboard to detect production/auth-required daemon state without exposing token material.
- [ ] Private daemon mutations remain rejected without a valid admin token in production mode.
- [ ] Shared or integration tests cover production/auth-required daemon state plus unauthenticated dashboard mutation attempts, in coordination with Frontend.
- [ ] No backend change weakens public health/status redaction already verified by QA.

Verification:

- [ ] Run focused daemon auth tests and the cross-surface web route-handler tests touched by the fix.
- [ ] Security reruns the same-origin proxy trust-boundary checks.

Out of scope:

- Introducing a new auth provider or role model for public alpha.

#### Bug: Production app ports publish on all interfaces

Severity: High release blocker.

Source finding: `SEC-E2E-VPS-01` in `docs/security/end-to-end-vps-github-trust-boundary-2026-06-22.md`.

Current behavior: Dockerfile deployments and generated Compose configs publish non-internal app ports without a host IP, which Docker treats as all-interface binds. Proxy route generation assumes localhost targets, so direct host-port exposure can bypass domain verification, TLS, proxy headers, and future proxy controls.

Desired behavior: Production app traffic should be reachable through the intended loopback/proxy path only. Dockerfile and generated Compose app ports must bind to loopback or use a proxy-only Docker network without public host publishing.

Key interfaces:

- Dockerfile deployment port publishing.
- Generated Compose port/network configuration for non-internal app services.
- Proxy route target generation and deployment host-port metadata.

Acceptance criteria:

- [ ] Dockerfile production deploys do not publish app ports on all interfaces.
- [ ] Generated Compose production configs bind app ports to loopback or place apps behind a proxy-only network without public host publishing.
- [ ] Database/internal services remain internal-only by default.
- [ ] Proxy route generation continues to target the local/proxy-reachable address that matches the deployment metadata.
- [ ] Tests assert Dockerfile and generated Compose app ports are not all-interface binds.

Verification:

- [ ] Run focused driver/proxy/daemon deployment tests for Dockerfile and Compose paths.
- [ ] Security reruns one-VPS static review and, after Lead provides environment, confirms no direct public host-port exposure in live smoke.

Out of scope:

- Claiming public proxy/TLS safety before this fix lands and a real one-VPS smoke confirms it.
- Implementing a full service-mesh or multi-host networking model.

#### Bug: Invalid-signature GitHub deliveries can poison dedupe

Severity: Medium, not a release blocker by itself but required before GitHub demo confidence.

Source finding: `SEC-E2E-VPS-03` in `docs/security/end-to-end-vps-github-trust-boundary-2026-06-22.md`.

Current behavior: The webhook handler can record an invalid-signature delivery using the caller-supplied delivery ID in the same dedupe keyspace used for valid deliveries. A later valid delivery with the same ID can be treated as a duplicate and suppressed.

Desired behavior: Invalid-signature attempts must not prevent a later valid GitHub delivery with the same delivery ID from being processed. Rejected attempts can be logged or recorded, but not in a way that poisons valid delivery dedupe.

Key interfaces:

- GitHub webhook signature validation and raw-body handling.
- GitHub delivery persistence/dedupe contract.
- Public daemon and same-origin GitHub webhook routes.

Acceptance criteria:

- [ ] An invalid-signature request followed by a valid signed request with the same delivery ID processes the valid request according to repo/branch mapping.
- [ ] Valid duplicate deliveries remain deduped where practical.
- [ ] Rejected invalid-signature attempts remain observable enough for diagnostics without sharing the valid-delivery dedupe keyspace incorrectly.
- [ ] Tests cover invalid-first then valid-same-delivery-ID behavior.

Verification:

- [ ] Run focused GitHub webhook tests.
- [ ] Security reruns the GitHub trust-boundary dedupe check.

Out of scope:

- Replacing GitHub App installation/repository authorization beyond the existing solo-operator alpha contract.
- Adding broad rate limiting unless needed for the minimal fix.

### PM/Docs Owner Instructions

#### Bug: Public docs make local DB port and VPS prerequisites fragile

Severity: Medium docs readiness issue.

Source findings: `DOC-QA-2026-06-22-LOCAL-01` in `docs/qa/end-to-end-local-demo-2026-06-22.md` and `DOC-QA-2026-06-22-VPS-01` in `docs/qa/end-to-end-vps-demo-2026-06-22.md`.

Current behavior: The README local quick start hardcodes `routely db add postgres --name postgres --port 5432`, which failed on QA's Fedora host because local Postgres already occupied `127.0.0.1:5432`. The VPS docs name broad ingredients but do not consolidate the exact OS, SSH/sudo, firewall, DNS, public IP, dashboard access, cleanup, and 80/443 capability/systemd expectations needed for a new solo operator or QA rerun.

Desired behavior: Public docs should provide copy-pasteable local setup with alternate-port guidance and a concrete one-VPS prerequisite checklist before the release gate is attempted.

Key interfaces:

- README local quick start and database setup guidance.
- Public alpha docs for one-VPS prerequisites and QA environment handoff.
- Backend-reviewed command behavior for database host ports and production server prerequisites.

Acceptance criteria:

- [ ] Local docs explain how to check whether `5432` is occupied and how to choose a safe alternate host port such as `55432` without changing internal database semantics.
- [ ] Local quick-start copy makes clear which ports the demo uses and how to resolve collisions before running `routely`.
- [ ] VPS docs include provider-neutral prerequisites: Linux host, public IP, SSH user/key, sudo/root expectations, Docker/Compose/Node/npm baseline, data directory, firewall/security group ports 80/443, dashboard/daemon access path, domain/subdomain, DNS control, `ROUTELY_SERVER_PUBLIC_IP`, admin token handling, and cleanup expectations.
- [ ] Backend reviews the documented commands and prerequisite claims for accuracy.
- [ ] Release-readiness docs continue to separate local simulation from real VPS/DNS/GitHub acceptance.

Verification:

- [ ] Run `git diff --check` for docs.
- [ ] PM/Docs performs targeted searches for `5432`, `55432`, `ROUTELY_SERVER_PUBLIC_IP`, VPS prerequisites, and release-gate language.
- [ ] Backend review confirms the docs match implemented command behavior.

Out of scope:

- Changing database port behavior in code unless Backend opens a separate implementation issue.
- Treating local simulation as satisfying the real VPS release gate.

### Lead/Environment Owner Instructions

#### Blocker: Real VPS/DNS and GitHub push demos need disposable external resources

Severity: Environment blocker for Demo 2 and Demo 3 release gates.

Source findings: `ENV-QA-2026-06-22-VPS-01` in `docs/qa/end-to-end-vps-demo-2026-06-22.md` and `ENV-QA-2026-06-22-GITHUB-01` in `docs/qa/end-to-end-github-demo-2026-06-22.md`.

Current behavior: QA could run local/static/API checks, but could not accept the one-VPS or real GitHub push demos because no disposable VPS, DNS/domain access, public webhook URL, deployed app, test repository details, or push credentials were provided.

Desired behavior: Routely Lead provides a disposable, explicitly authorized environment packet so QA can rerun Demo 2 and Demo 3 without private chat context or ambiguous credentials.

Prerequisites to provide:

- Disposable Linux VPS host/IP, SSH user/key or agent access, sudo/root permission, and cleanup permission.
- `ROUTELY_SERVER_PUBLIC_IP`, open inbound 80/443, and an explicit dashboard/daemon access path.
- Disposable domain or subdomain, DNS provider credentials or manual DNS control, and target A/AAAA records.
- Admin token handling instructions that avoid printing secrets in reports.
- GitHub App installation/test repository, target branch, push credentials or explicit repo access, and public webhook URL configured in GitHub.
- Permission to create/remove Docker containers, routes, certificates, database/backup state, webhook deliveries, and test commits.

Acceptance criteria:

- [ ] QA can execute the one-VPS demo on a real host with real DNS/proxy/HTTPS state.
- [ ] QA can execute one successful GitHub push redeploy and one intentional failing push against a deployed app.
- [ ] Security can validate live port exposure, Docker networking, DNS/ACME/TLS behavior, webhook delivery behavior, backup assumptions, and untrusted dashboard text rendering.
- [ ] Release readiness remains blocked until the real environment reruns pass and reports are committed by Routely Lead.

Out of scope:

- Asking Backend, Frontend, or PM to fake acceptance with local/static checks.
- Reusing long-lived production credentials for disposable QA validation.

## Verification Policy

Use the narrowest checks that cover the touched work. Minimums:

- docs-only: `git diff --check` plus targeted reference searches
- CLI/shared: `npm run lint`, `npm run test --workspace apps/cli`
- daemon: `node --check apps/daemon/src/server.js` plus relevant API tests
- web: read Next.js docs first, then `npm run lint`, `npm run test --workspace apps/web`, and `npx tsc --noEmit --project apps/web/tsconfig.json`
- broad release: `npm run build --workspaces --if-present` when practical

Commit only after verification passes and only for owned changes.
