# Routely Product Requirements Document

Status: Canonical PRD
Owner: PM
Last updated: 2026-06-21

## 1. Product Summary

Routely is an open source, self-hosted app runner and single-VPS deployment platform for solo developers.

Product promise:

```text
One command local.
One VPS always-on.
One dashboard to deploy and operate every app.
```

The product differentiator is one app/service registry that spans local development and one-VPS production operations.

## 2. Target User

Primary user:

- Solo developers managing multiple local and production apps.
- Indie hackers or contractors running several small apps on one VPS.
- Developers comfortable with a terminal, GitHub, Docker, and DNS, but tired of rebuilding deploy/log/domain/backup workflows per app.

Secondary users after MVP:

- Small teams.
- Agencies.
- Open source maintainers publishing self-hosted deployment docs.

## 3. Problem

Solo developers usually manage app operations through disconnected tools:

- local apps run in many terminals;
- databases and services start separately;
- production deploys require manual VPS, Docker, env, proxy, DNS, HTTPS, logs, and backup setup;
- failure diagnosis requires jumping between terminal output, Docker logs, GitHub webhooks, DNS, and proxy state.

The user needs one registry and one control surface from local development through small production hosting.

## 4. Positioning

Routely is:

```text
A local-first app runner that becomes a one-VPS deployment dashboard.
```

Reference positioning:

- 9Router inspires the local lifecycle: one memorable command, local daemon/server, dashboard, quick status loop.
- Dokploy inspires VPS production operations: Docker deploys, domains, HTTPS, GitHub integration, env, logs, health, metrics, databases, backups, and notifications.

Routely must not mechanically clone either product. The alpha remains solo-developer, one-registry, one-VPS, and demo-driven.

## 5. Product Goals

- `routely` starts all enabled local apps and services for the active workspace.
- The dashboard shows real local and production state through same-origin `/api/*` routes.
- `routely.yml` stores portable desired app/service config.
- SQLite stores runtime state, deployment history, logs metadata, generated proxy/GitHub/backup/notification state, and secret-aware values where implemented.
- A Dockerfile app can deploy to one VPS.
- A domain can route to the latest successful deployment with honest DNS/proxy/HTTPS state.
- A configured GitHub branch push can trigger redeploy.
- A failed deploy exposes phase and logs.
- Env/secrets, health, metrics, databases, backups, and notifications support demo diagnosis and operations.

## 6. MVP Demos

Public alpha is accepted through three demos:

1. Local demo: register three local apps and one database, then run them all with `routely`.
2. VPS demo: deploy one Dockerfile app to one VPS with domain and HTTPS.
3. GitHub demo: push to the configured branch, auto-redeploy, and inspect useful failure logs when a deploy breaks.

These demos define MVP readiness more strongly than a broad feature checklist.

## 7. Functional Requirements

### Local Runner

- Initialize a workspace.
- Register local command apps.
- Register local Compose-backed database services.
- Start services before dependent apps.
- Detect port conflicts where practical.
- Show status and logs in CLI and dashboard.
- Stop managed workloads without killing unrelated processes.

### Dashboard

- Use same-origin `/api/*` routes from browser code.
- Show overview, apps/services, deployments, domains, GitHub, env, logs, health, metrics, databases, backups, notifications, and server status where data exists.
- Keep unsupported controls hidden, disabled, or marked deferred.
- Show failure states with next action and log path.

### VPS Production

- Initialize production state and data directory.
- Report server readiness through doctor/status checks.
- Require production auth/admin token for private mutation operations.
- Deploy Dockerfile apps first.
- Track deployment phases and logs.
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
- Support local-file backup foundations.
- Support generic webhook, Discord, and Telegram notification foundations with redacted public targets.

## 8. Non-Goals

- Public marketplace/templates as an alpha feature.
- Teams/RBAC.
- Kubernetes.
- Public multi-server UX.
- Managed cloud service.
- Broad VPS administration.
- External backup storage.
- Destructive restore automation.
- Email notifications.
- Preview deployments.
- Enterprise SSO, billing, organizations, or audit workflows.

## 9. Success Criteria

Routely is public-alpha ready when:

- the local demo passes from public docs without private chat context;
- the VPS demo passes on one disposable VPS with a real domain;
- the GitHub demo passes with one successful push and one intentional failed deploy;
- dashboard demo-critical surfaces use real data;
- security review covers auth, secrets, GitHub webhooks, outbound notifications, Docker/proxy exposure, backups, and untrusted dashboard text;
- QA reports exist for local, VPS, GitHub, and responsive dashboard smoke;
- docs clearly state deferred scope.

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
