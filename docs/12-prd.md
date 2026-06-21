# Routely Product Requirements Document

Status: Canonical PRD
Owner: PM
Last updated: 2026-06-22

## 1. Product Summary

Routely is an open source, self-hosted, dashboard-first control plane for solo developers who want one app operations model locally and on one VPS.

Product promise:

```text
One dashboard to register and operate apps.
One Start action for every enabled app.
One Compose-backed model from laptop to VPS.
```

The product differentiator is one app/service registry that keeps local development and one-VPS production recognizable as the same operational workflow.

## 2. Target User

Primary public-alpha user:

- Solo developers managing multiple local and production apps.
- Indie hackers or contractors running several small apps on one VPS.
- Developers comfortable with a terminal, GitHub, Docker, Compose, and DNS, but tired of rebuilding deploy/log/domain/env/backup workflows per app.

Routely should not optimize public alpha around shared administration, teams, organizations, billing, SSO, or RBAC.

## 3. Problem

Solo developers usually manage app operations through disconnected tools:

- local apps run in many terminals;
- databases and services start separately;
- production deploys require manual VPS, Docker/Compose, env, proxy, DNS, HTTPS, logs, health, and backup setup;
- failure diagnosis requires jumping between terminal output, container logs, GitHub webhooks, DNS, proxy state, and the VPS shell.

The user needs one registry and one dashboard-first control surface from local development through one small production VPS.

## 4. Positioning

Routely is:

```text
A Compose-first app runner that becomes a one-VPS deployment and operations dashboard.
```

Reference positioning:

- 9Router inspires the local lifecycle: one memorable command, local daemon/server, dashboard, quick status loop, and low ceremony.
- Dokploy inspires one-VPS operations: Docker/Compose deploys, domains, HTTPS, GitHub integration, env, logs, health, metrics, databases, backups, and notifications.

Routely must not mechanically clone either product. The alpha remains solo-developer, one-registry, one-VPS, and demo-driven.

## 5. Product Goals

- The dashboard is the normal place to create, edit, start, stop, disable, observe, and diagnose managed apps once the relevant slice is implemented.
- `routely` and `routely up` start all enabled local apps and services for the active workspace.
- Disabled apps remain registered and editable but are skipped by bulk start.
- Per-app stop affects the current runtime instance without deleting the app or changing future bulk-start participation.
- `routely.yml` stores portable desired app/service config, including enablement and Compose metadata where verified.
- SQLite stores runtime state, deployment history, logs metadata, generated proxy/GitHub/backup/notification state, and secret-aware values where implemented.
- One app can operate on one VPS through the verified deploy path, moving toward Compose-backed production parity.
- Domain/proxy/HTTPS state is honest and distinguishes generated config, DNS state, TLS state, and failures.
- A configured GitHub branch push can trigger redeploy for the intended app.
- A failed deploy exposes phase, deploy history, and logs.
- Env/secrets, health, metrics, databases, backups, and notifications support demo diagnosis and operations.

## 6. MVP Demos

Public alpha is accepted through three demos:

1. Local dashboard-first demo: register three apps and one database, use Start All to run enabled apps, and stop or disable one app individually.
2. One-VPS operations demo: run one app on one VPS with domain/proxy, env/secrets, deploy history, logs, health, database, and backup state represented honestly.
3. GitHub redeploy demo: push to the configured branch, auto-redeploy the intended app, and inspect useful failure logs when a deploy breaks.

These demos define MVP readiness more strongly than a broad feature checklist.

## 7. Functional Requirements

### App Registry And Enablement

- Initialize a workspace.
- Register and edit managed apps with name, path/source, driver, command or Compose metadata, ports, dependencies, healthcheck, domains, env/secrets, and enablement where implemented.
- Preserve enablement across config, SQLite, API DTOs, CLI output, and dashboard state.
- Keep disabled apps visible and editable.
- Keep unsupported controls hidden, disabled, or marked deferred.

### Local Runner

- Register local command apps and Compose-backed database/services.
- Start enabled services before dependent enabled apps.
- Skip disabled apps during bulk start.
- Detect port conflicts where practical.
- Show status and logs in CLI and dashboard.
- Stop managed workloads without killing unrelated processes.

### Dashboard

- Use same-origin `/api/*` routes from browser code.
- Provide simple Dokploy-inspired operational surfaces with 9Router-like lightness.
- Show overview, apps/services, deployments, domains, GitHub, env, logs, health, metrics, databases, backups, notifications, and server status where real data exists.
- Explain disabled, deferred, missing, pending, failed, and generated states distinctly.
- Show failure states with next action and log path.

### One-VPS Production

- Initialize production state and data directory.
- Report server readiness through doctor/status checks.
- Require production auth/admin token for private mutation operations.
- Support one verified app deploy/operation path on one VPS.
- Move the production model toward Compose-backed parity; label current Dockerfile-only paths honestly until parity is verified.
- Track deployment phases, deploy history, logs, and latest successful deployment where practical.
- Keep TLS state conservative; generated proxy config is not certificate success.

### GitHub Deploy

- Configure GitHub App metadata server-side.
- Validate webhook signatures.
- Deduplicate deliveries where practical.
- Deploy only configured repo/branch mappings.
- Persist useful trigger/deploy/failure metadata.

### Operations

- Store secret values safely enough for alpha and hide raw values after save.
- Redact known secrets from logs where practical.
- Track health and narrow metrics for demo diagnosis.
- Support internal-by-default database services/records.
- Support local-file backup foundations.
- Support generic webhook, Discord, and Telegram notification foundations with redacted public targets.

## 8. Non-Goals

- Public app catalog as an alpha feature.
- Teams/RBAC, organizations, billing, or enterprise audit workflows.
- Kubernetes.
- Public multi-server UX.
- Managed cloud service.
- Broad VPS administration.
- External backup storage.
- Destructive restore automation.
- Email notifications.
- Preview deployments.
- Advanced rollback orchestration beyond preserving or identifying last successful deployments where practical.

## 9. Success Criteria

Routely is public-alpha ready when:

- the local dashboard-first demo passes from public docs without private chat context;
- the one-VPS demo passes on one disposable VPS with a real domain;
- the GitHub demo passes with one successful push and one intentional failed deploy;
- dashboard demo-critical surfaces use real data;
- unsupported controls are hidden, disabled, or clearly marked deferred;
- security review covers auth, secrets, GitHub webhooks, outbound notifications, Docker/Compose/proxy exposure, backups, and untrusted dashboard text;
- QA reports exist for local, one-VPS, GitHub, and responsive dashboard smoke;
- docs clearly state deferred scope and verified implementation gaps.

## 10. Source Documents

- `docs/00-product-brief.md`
- `docs/01-alpha-plan.md`
- `docs/02-team-execution-plan.md`
- `docs/03-demo-acceptance-plan.md`
- `docs/05-architecture.md`
- `docs/06-interfaces.md`
- `docs/07-security-and-risks.md`
- `docs/09-current-status.md`
- `docs/10-implementation-backlog.md`
- `docs/11-feature-scope.md`
