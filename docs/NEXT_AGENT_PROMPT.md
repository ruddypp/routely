# Next Agent Prompt

Last updated: 2026-06-18  
Latest completed checkpoint: Checkpoint 9, Logs, Metrics, and Health  
Expected commit: `feat: add app health logs`

Use this prompt for the next implementation agent. It asks for the next full product/backend/frontend slice, not a frontend-only redesign.

```text
You are working in /home/ruddypp/Documents/work/routely.

Read AGENTS.md, docs/HANDOFF.md, docs/AGENT_EXECUTION_CONTEXT.md, docs/14-implementation-plan.md, docs/13-current-setup-status.md, DESIGN.md, and the relevant feature/spec docs before editing. Follow AGENTS.md strictly, including the Next.js docs rule and the auto-commit rule.

Before planning implementation, also read the current public reference products that inspired Routely:
- 9Router repository: https://github.com/decolua/9router
- 9Router Docker/runtime docs: https://github.com/decolua/9router/blob/master/DOCKER.md
- Dokploy repository: https://github.com/Dokploy/dokploy
- Dokploy product site: https://dokploy.com/
- Dokploy docs: https://docs.dokploy.com/
- Dokploy Going Production guide: https://docs.dokploy.com/docs/core/applications/going-production

Do not clone either product mechanically. Use them to understand product feel and operational shape.

You must read enough of those repositories/docs to understand the product model before planning. Routely is inspired by:
- 9Router's local-first command/control workflow, one-command local runner, local app registry, and quick dashboard status loop.
- Dokploy's dense single-VPS production operations: app pages, deployments, domains, HTTPS/proxy, logs, metrics, databases, backups, readable inspectors, and safe daily controls.
- Routely's own identity: bridge local development and single-VPS production through the same app registry and dashboard mental model.

Product/design execution rule:
- Do not make this a frontend-only redesign. Make real backend/storage/API/CLI progress first, with tests.
- After the backend slice exists, enhance the production dashboard so it remains dense, readable, status-rich, tabbed, safe, and backed by real daemon/API/storage data.
- Make the frontend more Dokploy-like in information architecture and usability: dense operational panels, readable rows, clear status cards, inspector tabs, and safe actions.
- Do not keep filling the dashboard home with every feature. The dashboard home should be overview only: fleet status, server readiness, recent deploys, health failures, backup status, and urgent next actions.
- Put feature-by-feature workflows in the sidebar/navigation: Apps, Deployments, Domains, GitHub, Env, Logs, Health, Metrics, Databases, Backups, Settings. Build or enhance those pages/panels only when backed by real backend/API/storage data.
- Keep future or unsafe features inert and labeled as later checkpoint work.
- Preserve DESIGN.md: dark functional surfaces, compact typography, restrained green accent, rounded controls, and no generic SaaS landing page.

Current progress:
- Checkpoint 0 through Checkpoint 9 are implemented.
- Browser code must keep using same-origin /api/*; do not call the daemon directly from browser code.
- Production mode requires admin bearer token auth for private daemon actions.
- Manual Dockerfile deploy, domain/proxy/HTTPS state, signed GitHub push-to-deploy behavior, stored env/secrets, secret redaction, restart/redeploy-needed state, runtime/deploy logs, app health, and metric samples must be preserved.

Current implemented surface:
- CLI supports workspace init/sync/add/up/down/ps/logs/restart/doctor.
- CLI supports routely server init, routely server doctor, routely deploy <app> [--watch], env commands, domain commands, GitHub commands, and routely health <app>.
- SQLite/config persistence covers apps, services, Compose metadata, deployments, deployment logs, domains, proxy routes, GitHub state, webhook deliveries, app env/secrets, restart/redeploy-needed flags, healthchecks, and metrics_samples.
- Dockerfile deployments build local Dockerfile apps, start containers on temporary 127.0.0.1:32xxx ports, inject stored production env, run healthcheck/container-running checks, persist deployment/log metadata, and refresh app health state.
- Domains target the latest successful Dockerfile deployment and generate Traefik-compatible HTTPS config after DNS verification.
- GitHub webhooks validate X-Hub-Signature-256, deduplicate X-GitHub-Delivery, filter unsupported events, and queue the existing Dockerfile deployment flow for connected repo/branch pushes.
- Dashboard has local app/service separation, server readiness, Dockerfile deploy panel, deployment phase/log panels, temporary URLs, domain/DNS/proxy/HTTPS controls, GitHub repository/source/delivery controls, Env inspector, Health inspector, pending restart/redeploy indicators, desktop sidebar, and mobile bottom nav.

Your next task:
Implement Checkpoint 10 from docs/14-implementation-plan.md comprehensively: Database Services and Backups.

Execution bar:
- Backend first: schema/DB helpers for production database and backup state, daemon endpoints, auth enforcement, safe command/runtime behavior, secret redaction, and tests.
- CLI/API where useful: add database/backup workflows only if backed by real daemon/storage data.
- Frontend after backend exists: add database/backup surfaces around real data, preferably as sidebar feature pages/panels rather than more content crammed into the dashboard overview. Future/unsafe actions must be inert and labeled as later scope.
- Improve the existing frontend structure while implementing the backend slice: make daily operations more readable and comfortable, with less dashboard clutter and clearer sidebar hierarchy.
- Keep database services and backups narrow. Do not build broad VPS management.
- Do not implement notifications, full rollback, marketplace templates, destructive restore automation, or broad VPS operations during Checkpoint 10.
- Preserve manual Dockerfile deploy, domain/proxy/HTTPS, GitHub webhook behavior, stored env injection, health/metrics/log state, restart/redeploy-needed state, and same-origin Next.js API proxy behavior.

Required reading before coding:
1. AGENTS.md
2. docs/HANDOFF.md
3. docs/AGENT_EXECUTION_CONTEXT.md
4. docs/14-implementation-plan.md, especially Checkpoint 10
5. docs/13-current-setup-status.md
6. docs/01-prd.md
7. docs/02-technical-architecture.md
8. docs/03-functional-specification.md
9. docs/04-user-flows.md
10. docs/05-cli-spec.md
11. docs/06-api-spec.md
12. docs/07-config-spec.md
13. docs/08-data-model.md
14. docs/09-security-model.md
15. docs/feature-specs/dashboard.md
16. docs/feature-specs/logs-and-monitoring.md
17. Relevant database/backup docs/specs if added
18. DESIGN.md

Before editing apps/web, read relevant Next.js docs in node_modules/next/dist/docs/. This repo uses Next.js with breaking changes and AGENTS.md says this is not the Next.js you know.

Testing and verification:
- Add focused unit tests for new database/backup helpers and safety/redaction behavior.
- Add DB/API tests for persistence and daemon route behavior.
- Add route-handler tests for same-origin database/backup endpoints and daemon-unreachable/auth failures.
- Run at minimum:
  - npm run lint
  - npm run test --workspace apps/cli if CLI/shared code is touched
  - npm run build --workspace apps/cli if CLI/shared runtime code is touched
  - npm run test --workspace apps/web if web/API route handlers are touched
  - npx tsc --noEmit --project apps/web/tsconfig.json if apps/web is touched
  - node --check apps/daemon/src/server.js if daemon code is touched
- Attempt npm run build --workspace apps/web, but note the known caveat: this tool may return incomplete Turbopack output. Treat this as pre-existing unless your changes produce concrete diagnostics.

Documentation and commit:
- Update docs if behavior, commands, config fields, verification status, known caveats, or deferred boundaries change.
- Update docs/HANDOFF.md, docs/13-current-setup-status.md, docs/NEXT_AGENT_PROMPT.md, and docs/AGENT_EXECUTION_CONTEXT.md at the end.
- Preserve unrelated user changes. Do not use destructive git commands.
- After verification, commit only files changed for Checkpoint 10 with a concise commit message such as feat: add database backups.
```
