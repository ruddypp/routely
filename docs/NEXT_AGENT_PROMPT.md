# Next Agent Prompt

Last updated: 2026-06-18  
Latest completed commit: `58b75b7 feat: add domain proxy slice`

Use this prompt for the next implementation agent. It asks for the next full product/backend/frontend slice, not a frontend-only redesign.

```text
You are working in /home/ruddypp/Documents/work/routely.

Read AGENTS.md, docs/HANDOFF.md, docs/14-implementation-plan.md, docs/13-current-setup-status.md, DESIGN.md, and the relevant feature/spec docs before editing. Follow AGENTS.md strictly, including the Next.js docs rule and the auto-commit rule.

Before planning implementation, also read the current public reference products that inspired Routely:
- 9Router repository: https://github.com/decolua/9router
- 9Router Docker/runtime docs: https://github.com/decolua/9router/blob/master/DOCKER.md
- Dokploy repository: https://github.com/Dokploy/dokploy
- Dokploy product site: https://dokploy.com/
- Dokploy docs: https://docs.dokploy.com/
- Dokploy Going Production guide: https://docs.dokploy.com/docs/core/applications/going-production

Do not clone either product mechanically. Use them to understand product feel and operational shape:
- 9Router inspiration: local-first command/control experience, single local dashboard, fast status visibility, local data directory, practical one-command flow, and low-friction daily developer use.
- Dokploy inspiration: dense production control panel, projects/apps/databases mental model, deployment history, domain/HTTPS/proxy operations, logs, server readiness, readable status cards, and comfortable VPS operations.
- Routely's identity: bridge local development and single-VPS production through the same app registry and dashboard mental model.

Project intent:
Routely is a 9Router-inspired local app runner plus Dokploy-inspired single-VPS deployment platform. The differentiator is a local-to-production workflow for solo developers: local apps/services first, then one-server production operations using the same registry and dashboard mental model.

Current progress:
- Checkpoint 0 is complete and committed.
- Checkpoint 1 local runner is complete and committed.
- Checkpoint 2 dashboard local lifecycle controls are complete and committed.
- Checkpoint 2.5 frontend product shell is implemented and polished.
- Checkpoint 3 config, presets, and Compose services is complete and committed.
- Checkpoint 4 production server foundation is complete and committed.
- Checkpoint 5 production deploy vertical slice is complete and committed.
- Checkpoint 6 proxy, domains, and HTTPS is implemented and committed as `58b75b7 feat: add domain proxy slice`.
- Browser code must keep using same-origin `/api/*`; do not call the daemon directly from browser code.
- Local daemon should bind to `127.0.0.1` in local mode.
- `routely.yml` remains desired portable config; SQLite stores runtime state/history.
- Production mode requires admin bearer token auth for private daemon actions; local mode remains frictionless.

Current implemented surface:
- CLI supports workspace init/sync/add/up/down/ps/logs/restart/doctor.
- `routely add <path>` detects common local presets and writes editable config back to `routely.yml`.
- `routely db add <postgres|mysql|mariadb|redis|mongodb>` registers Compose-backed local database services.
- CLI supports `routely server init`, `routely server doctor`, `routely deploy <app> [--watch]`, and domain commands:
  - `routely domain root <domain>`
  - `routely domain add <app> <hostname>`
  - `routely domain verify <hostname>`
  - `routely domain ls`
- Config normalization and SQLite persistence cover install/dev/build/start commands, env, dependencies, healthchecks, domains/source metadata, Compose metadata, internal flags, images, and volumes.
- Presets exist for Next.js, Vite/React, Laravel, Express, NestJS, Django, FastAPI, Go, static HTML/CSS, and PHP custom.
- Compose driver generates local Compose files under `.routely/compose` and uses Docker Compose for local service start/stop.
- Daemon lifecycle endpoints support command and Compose resources through existing `/apps/:id/start|stop|restart|logs` paths.
- Production server foundation persists production mode, data directory, admin token hash/salt metadata, and latest server doctor result.
- Daemon exposes `/server/status`, `/auth/status`, and `/server/doctor`; production mode requires an admin bearer token for private app/registry/lifecycle/API actions.
- Checkpoint 5 added deployment state/log tables, Dockerfile deployment helpers, daemon deployment endpoints, CLI deploy commands, and same-origin Next.js deployment route handlers.
- Dockerfile deployments build from a local source path containing `Dockerfile`, start a container on a temporary `127.0.0.1:32xxx` host port, run configured HTTP healthcheck or container-running check, and store image/container/port metadata for future rollback.
- Checkpoint 6 added `domains` and `proxy_routes` tables plus DB helpers.
- `packages/proxy` now validates hostnames, generates wildcard DNS instructions, verifies DNS A records with injectable resolvers, creates Traefik-compatible dynamic config, generates route/service names, configures HTTP-to-HTTPS redirect and secure headers, and builds Docker labels.
- Daemon domain/proxy endpoints:
  - `GET /domains`
  - `POST /domains/root`
  - `POST /domains`
  - `GET /apps/:id/domains`
  - `POST /apps/:id/domains`
  - `POST /domains/:hostname/verify`
  - `DELETE /domains/:hostname`
  - `GET /proxy/routes`
  - `GET /proxy/config`
- Domain routes are tied to the latest successful Dockerfile deployment host port. Internal/database apps are rejected for public proxy exposure.
- DNS verification compares A records to `ROUTELY_SERVER_PUBLIC_IP` or `server.public_ip`; TLS state is conservative and does not fake certificate success.
- Next.js same-origin route handlers proxy deployment and domain/proxy endpoints under `/api/*`.
- Dashboard has local app/service resource separation, server foundation readiness, Dockerfile deploy panel, deployment phase rows, deployment logs, temporary URLs, domain/DNS/proxy/HTTPS controls, inspector tabs, desktop sidebar, mobile bottom nav, and inert placeholders for future features.

Your next task:
Implement Checkpoint 7 from docs/14-implementation-plan.md comprehensively: GitHub Integration and Auto Deploy.

This must be a full product/backend/frontend slice. Do not only polish CSS. Build the smallest end-to-end GitHub App/repository/webhook path, docs, tests, daemon/API/storage behavior, CLI/API where needed, and dashboard controls while reusing the Checkpoint 4 auth foundation, Checkpoint 5 deployments, and Checkpoint 6 domain/proxy state.

The implementation must be comprehensive and make real progress across the product:
- Backend first: schema, persistence, daemon endpoints, auth, helpers, deployment integration, and failure states.
- CLI/API where useful: commands or daemon-backed workflows that can be used without the browser.
- Frontend after backend exists: improve the Dokploy-like production panel around real data, not mock UI.
- Tests and docs: focused coverage for the new behavior and updated handoff/status docs.

Important execution bar:
- Make meaningful backend progress first: GitHub installation/repository tables, webhook delivery deduplication, signature validation helpers, daemon endpoints, auth enforcement, source metadata persistence, and tests.
- Then enhance the frontend around real data: repository connection/config status, selected repo/branch for an app, webhook delivery status, and auto-deploy settings backed by daemon/API/storage data.
- Improve the production dashboard so it feels closer to Dokploy: operational, dense, status-rich, readable, easy to use, and comfortable for daily VPS operations.
- Do not make this frontend-only. Every visible production/GitHub/deploy/domain/proxy panel should be backed by daemon/API/storage data where practical, or intentionally disabled with a clear future-checkpoint label.
- Keep unsafe or future production features inert. Do not implement backups, notifications, production database templates, full rollback, metrics collection, or broad VPS operations during Checkpoint 7.
- Preserve browser same-origin `/api/*` only.
- Preserve existing manual Dockerfile deploy and domain/proxy behavior.

Required reading before coding:
1. AGENTS.md
2. docs/HANDOFF.md
3. docs/14-implementation-plan.md, especially Checkpoint 7
4. docs/13-current-setup-status.md
5. docs/01-prd.md
6. docs/02-technical-architecture.md
7. docs/03-functional-specification.md
8. docs/04-user-flows.md
9. docs/05-cli-spec.md
10. docs/06-api-spec.md
11. docs/07-config-spec.md
12. docs/08-data-model.md
13. docs/09-security-model.md
14. docs/feature-specs/github-integration.md
15. docs/feature-specs/production-deploy.md
16. docs/feature-specs/domain-and-https.md
17. docs/feature-specs/dashboard.md
18. DESIGN.md

Before editing `apps/web`, read relevant Next.js docs in `node_modules/next/dist/docs/`. This repo uses Next.js 16.2.9 and AGENTS.md says this is not the Next.js you know.

Checkpoint 7 backend/product goals:
- Implement GitHub App configuration primitives in `packages/github` without leaking secrets.
- Add SQLite tables for GitHub installations, repositories, and webhook delivery deduplication as needed.
- Add webhook signature validation and event filtering tests.
- Add daemon endpoints for GitHub app status/config, repository listing/selection where practical, and webhook receiving.
- Store repo/branch source metadata per app and use it to trigger the existing Dockerfile deployment path on configured branch push.
- Deduplicate GitHub delivery IDs.
- Reject invalid signatures.
- Keep manual deploy usable even when GitHub is unconfigured.
- Do not implement broad GitHub automation beyond push-to-deploy for configured apps.

Frontend/product goals:
- Add a GitHub/repository section to the production panel and app inspector backed by real daemon/API/storage data.
- Show GitHub App configured/unconfigured state, installation/repo/branch selection where implemented, webhook delivery status, and auto-deploy enabled/disabled state.
- Make GitHub controls operational, dense, and Dokploy-like while keeping future features visibly inert.
- Keep Domains/Proxy/HTTPS and Deployments visible and stable.
- No landing page, no generic marketing UI, no browser daemon calls.
- Keep improving the main production panel as a full operational surface, not a collection of isolated cards:
  - clear server/app/project hierarchy
  - readable status rows and cards
  - dense but scannable deployment and domain state
  - obvious primary actions and safe disabled states
  - right-side inspector tabs for Overview, Deployments, Domains, Proxy/HTTPS, GitHub, Logs, and Config where feasible
  - responsive desktop/tablet/mobile layout without horizontal overflow or overlapping controls
- Design should be Dokploy-inspired for VPS operations while still respecting Routely's `DESIGN.md`: dark functional surfaces, compact typography, strong hierarchy, restrained green accent for active/primary actions, and no SaaS landing-page treatment.

Testing and verification:
- Add unit tests for GitHub signature validation, webhook event filtering, and delivery deduplication.
- Add DB/API tests for GitHub installation/repository/source metadata where implemented.
- Add route-handler tests for same-origin GitHub endpoints and daemon-unreachable/auth failures.
- Run at minimum:
  - npm run lint
  - npm run test --workspace apps/cli if CLI/shared code is touched
  - npm run build --workspace apps/cli if CLI/shared runtime code is touched
  - npm run test --workspace apps/web if web/API route handlers are touched
  - npx tsc --noEmit --project apps/web/tsconfig.json if apps/web is touched
  - node --check apps/daemon/src/server.js if daemon code is touched
  - relevant package tests/builds for touched workspaces
- Attempt `npm run build --workspace apps/web`, but note the known caveat: this tool may return only `Finished TypeScript...` with no final exit marker and no remaining build process. Treat this as pre-existing unless your changes produce a new explicit error.

Documentation and commit:
- Update docs if behavior, commands, config fields, verification status, known caveats, or deferred boundaries change.
- Update docs/HANDOFF.md and docs/13-current-setup-status.md at the end.
- Update docs/NEXT_AGENT_PROMPT.md at the end if the next checkpoint changes.
- Preserve unrelated user changes. Do not use destructive git commands.
- After verification, commit only files changed for Checkpoint 7 with a concise commit message such as `feat: add github auto deploy slice`.
```

## Execution Notes For The Next Agent

- Checkpoint 7 should build on existing deployment and domain state, not replace it.
- Keep the GitHub integration narrow: repository connection/source metadata plus signed webhook push-to-deploy.
- Do not start backups, notifications, production database templates, metrics, full rollback, or broad VPS operations.
- If GitHub App OAuth/setup is too large for one checkpoint, implement a conservative configured-state path with explicit environment/settings requirements, signature validation, webhook ingestion, source metadata, and tests.
- Before making UI decisions, inspect Dokploy and 9Router for product patterns, then adapt those patterns to Routely's local-to-production workflow instead of copying screens directly.
