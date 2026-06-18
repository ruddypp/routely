# Next Agent Prompt

Last updated: 2026-06-18  
Latest completed checkpoint: Checkpoint 8, Environment, Secrets, and App Settings  
Expected commit: `feat: add app env settings`

Use this prompt for the next implementation agent. It asks for the next full product/backend/frontend slice, not a frontend-only redesign. The agent should make significant backend/API/storage/CLI/test progress first, then improve the production dashboard with real data so the UX feels closer to Dokploy while preserving Routely's local-first identity.

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

Product/design execution rule:
- Do not make this a frontend-only redesign. Make real backend/storage/API/CLI progress first, with tests.
- After the backend slice exists, enhance the production dashboard so it feels more like a comfortable Dokploy-style VPS operations surface: dense, readable, status-rich, tabbed inspector, clear app/project hierarchy, deployment/domain/GitHub/env/log/health state, safe disabled states, and no horizontal overflow.
- Every visible production panel should be backed by real daemon/API/storage data where practical. If a future feature is shown, keep it inert and label it as a future checkpoint.
- The frontend should be better designed, but it must be a product surface for real operations, not decoration. Preserve DESIGN.md: dark functional surfaces, compact typography, restrained green accent, rounded controls, and no generic SaaS landing page.

Current progress:
- Checkpoint 0 through Checkpoint 8 are implemented.
- Browser code must keep using same-origin /api/*; do not call the daemon directly from browser code.
- Production mode requires admin bearer token auth for private daemon actions.
- Manual Dockerfile deploy, domain/proxy/HTTPS state, signed GitHub push-to-deploy behavior, stored env/secrets, secret redaction, and restart/redeploy-needed state must be preserved.

Current implemented surface:
- CLI supports workspace init/sync/add/up/down/ps/logs/restart/doctor.
- CLI supports routely server init, routely server doctor, routely deploy <app> [--watch], env commands, domain commands, and GitHub commands.
- Env commands are:
  - routely env <app> list
  - routely env <app> set KEY=value [--secret] [--scope all|local|production]
  - routely env <app> unset KEY
- Config normalization and SQLite persistence cover install/dev/build/start commands, portable env, dependencies, healthchecks, domains/source metadata, Compose metadata, internal flags, images, volumes, deployments, domains, proxy routes, GitHub state, webhook deliveries, stored app env/secrets, and app-level restart/redeploy-needed flags.
- Production Dockerfile deployments build from a local source path containing Dockerfile, start a container on a temporary 127.0.0.1:32xxx host port, run healthcheck/container-running checks, inject stored production env, and store deployment/log metadata.
- Domain routes target the latest successful Dockerfile deployment host port and generate Traefik-compatible HTTPS config after DNS verification.
- GitHub webhooks validate X-Hub-Signature-256, deduplicate X-GitHub-Delivery, filter unsupported events, and queue the existing Dockerfile deployment path for connected app repo/branch pushes.
- Dashboard has local app/service resource separation, server foundation readiness, Dockerfile deploy panel, deployment phase rows, deployment logs, temporary URLs, domain/DNS/proxy/HTTPS controls, GitHub repository/source/delivery controls, Env inspector, pending restart/redeploy indicators, desktop sidebar, and mobile bottom nav.

Your next task:
Implement Checkpoint 9 from docs/14-implementation-plan.md comprehensively: Logs, Metrics, and Health.

This must be a full product/backend/frontend slice. Do not only polish CSS. Build the smallest end-to-end logs/health path, docs, tests, daemon/API/storage behavior, CLI/API workflows where useful, and dashboard controls while reusing the existing production auth foundation, deployment pipeline, domain/proxy state, GitHub source metadata, and env/secret redaction helpers.

Important execution bar:
- Backend first: add metrics/health schema where useful, health evaluation helpers, daemon endpoints, auth enforcement, log/health redaction, runtime/container health refresh where practical, and tests.
- CLI/API where useful: add workflows such as health/status/log inspection only if they are backed by daemon/storage data.
- Frontend after backend exists: add logs/health sections to the app inspector and production panel backed by real daemon/API/storage data.
- Make meaningful progress across the whole system: schema, DB helpers, daemon endpoints, Next.js same-origin route handlers, CLI workflows where useful, dashboard UI, tests, and docs.
- Improve the production panel as one cohesive operational workspace, not a pile of disconnected cards. It should be readable, easy to use, comfortable for daily VPS operations, and closer to Dokploy's dense app management feel.
- Keep secret values redacted in logs and API responses by reusing Checkpoint 8 helpers.
- Preserve manual Dockerfile deploy, domain/proxy/HTTPS state, GitHub webhook behavior, stored env injection, restart/redeploy-needed state, and same-origin Next.js API proxy behavior.
- Keep unsafe/future features inert. Do not implement backups, notifications, production database templates, full rollback, or broad VPS operations during Checkpoint 9. Keep metrics collection narrow if implemented; do not build a broad VPS operations suite.

Required reading before coding:
1. AGENTS.md
2. docs/HANDOFF.md
3. docs/14-implementation-plan.md, especially Checkpoint 9
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
14. docs/feature-specs/dashboard.md
15. docs/feature-specs/production-deploy.md
16. docs/feature-specs/logs-and-monitoring.md
17. docs/feature-specs/github-integration.md
18. DESIGN.md

Before editing apps/web, read relevant Next.js docs in node_modules/next/dist/docs/. This repo uses Next.js 16.2.9 and AGENTS.md says this is not the Next.js you know.

Testing and verification:
- Add unit tests for healthcheck evaluation and log redaction/stream framing where implemented.
- Add DB/API tests for health/metric persistence and app/container status refresh where implemented.
- Add route-handler tests for same-origin logs/health endpoints and daemon-unreachable/auth failures.
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
- Update docs/HANDOFF.md and docs/13-current-setup-status.md at the end.
- Update docs/NEXT_AGENT_PROMPT.md at the end if the next checkpoint changes.
- Preserve unrelated user changes. Do not use destructive git commands.
- After verification, commit only files changed for Checkpoint 9 with a concise commit message such as feat: add app health logs.
```

## Execution Notes For The Next Agent

- Checkpoint 9 should build on existing deploy/domain/GitHub/env state, not replace it.
- Keep secrets hidden and reuse Checkpoint 8 redaction helpers for app/deployment/runtime logs.
- Keep logs/metrics/health narrow and operational: enough to explain failures and current app health without starting broad VPS management.
- Do not start backups, notifications, production database templates, full rollback, or broad VPS operations.
