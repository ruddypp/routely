# Next Agent Prompt

Last updated: 2026-06-18  
Latest completed checkpoint: Checkpoint 7, GitHub Integration and Auto Deploy
Expected commit: `feat: add github auto deploy slice`

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

Current progress:
- Checkpoint 0 through Checkpoint 7 are implemented.
- Browser code must keep using same-origin `/api/*`; do not call the daemon directly from browser code.
- Production mode requires admin bearer token auth for private daemon actions.
- Manual Dockerfile deploy, domain/proxy/HTTPS state, and signed GitHub push-to-deploy behavior must be preserved.

Current implemented surface:
- CLI supports workspace init/sync/add/up/down/ps/logs/restart/doctor.
- CLI supports `routely server init`, `routely server doctor`, `routely deploy <app> [--watch]`, domain commands, and GitHub commands:
  - `routely github status`
  - `routely github installation add <installation-id> --account <login>`
  - `routely github repo add <owner/repo> [--branch <branch>] [--installation-id <id>]`
  - `routely github connect <app> <owner/repo> [--branch <branch>] [--auto-deploy false]`
- Config normalization and SQLite persistence cover install/dev/build/start commands, env, dependencies, healthchecks, domains/source metadata, Compose metadata, internal flags, images, volumes, GitHub source metadata, deployments, domains, proxy routes, GitHub installations, GitHub repositories, and webhook deliveries.
- Production Dockerfile deployments build from a local source path containing `Dockerfile`, start a container on a temporary `127.0.0.1:32xxx` host port, run healthcheck/container-running checks, and store deployment/log metadata.
- Domain routes target the latest successful Dockerfile deployment host port and generate Traefik-compatible HTTPS config after DNS verification.
- GitHub webhooks validate `X-Hub-Signature-256`, deduplicate `X-GitHub-Delivery`, filter unsupported events, and queue the existing Dockerfile deployment path for connected app repo/branch pushes.
- Dashboard has local app/service resource separation, server foundation readiness, Dockerfile deploy panel, deployment phase rows, deployment logs, temporary URLs, domain/DNS/proxy/HTTPS controls, GitHub repository/source/delivery controls, inspector tabs, desktop sidebar, and mobile bottom nav.

Your next task:
Implement Checkpoint 8 from docs/14-implementation-plan.md comprehensively: Environment, Secrets, and App Settings.

This must be a full product/backend/frontend slice. Do not only polish CSS. Build the smallest end-to-end env/secret path, docs, tests, daemon/API/storage behavior, CLI/API workflows, and dashboard controls while reusing the existing production auth foundation, deployment pipeline, domain/proxy state, and GitHub source metadata.

Important execution bar:
- Backend first: add app env/secret tables or extend existing schema safely, persistence helpers, redaction helpers, daemon endpoints, auth enforcement, deployment/runtime integration where practical, and tests.
- CLI/API where useful: implement commands such as `routely env <app> list`, `routely env <app> set KEY=value`, and `routely env <app> unset KEY` if practical.
- Frontend after backend exists: add env/settings sections to the app inspector and production panel backed by real daemon/API/storage data.
- Hide secret values after creation. Do not export secrets into `routely.yml` by default.
- Redact configured secrets from logs where practical.
- Mark apps as needing restart/redeploy after env/settings changes.
- Preserve manual Dockerfile deploy, domain/proxy/HTTPS state, GitHub webhook behavior, and same-origin Next.js API proxy behavior.
- Keep unsafe/future features inert. Do not implement backups, notifications, production database templates, full rollback, metrics collection, or broad VPS operations during Checkpoint 8.

Required reading before coding:
1. AGENTS.md
2. docs/HANDOFF.md
3. docs/14-implementation-plan.md, especially Checkpoint 8
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
16. docs/feature-specs/github-integration.md
17. DESIGN.md

Before editing `apps/web`, read relevant Next.js docs in `node_modules/next/dist/docs/`. This repo uses Next.js 16.2.9 and AGENTS.md says this is not the Next.js you know.

Testing and verification:
- Add unit tests for secret redaction and env merge/visibility behavior.
- Add DB/API tests for app env/secret CRUD and restart/redeploy-needed state where implemented.
- Add route-handler tests for same-origin env/settings endpoints and daemon-unreachable/auth failures.
- Run at minimum:
  - npm run lint
  - npm run test --workspace apps/cli if CLI/shared code is touched
  - npm run build --workspace apps/cli if CLI/shared runtime code is touched
  - npm run test --workspace apps/web if web/API route handlers are touched
  - npx tsc --noEmit --project apps/web/tsconfig.json if apps/web is touched
  - node --check apps/daemon/src/server.js if daemon code is touched
- Attempt `npm run build --workspace apps/web`, but note the known caveat: this tool may return incomplete Turbopack output. Treat this as pre-existing unless your changes produce concrete diagnostics.

Documentation and commit:
- Update docs if behavior, commands, config fields, verification status, known caveats, or deferred boundaries change.
- Update docs/HANDOFF.md and docs/13-current-setup-status.md at the end.
- Update docs/NEXT_AGENT_PROMPT.md at the end if the next checkpoint changes.
- Preserve unrelated user changes. Do not use destructive git commands.
- After verification, commit only files changed for Checkpoint 8 with a concise commit message such as `feat: add app env settings`.
```

## Execution Notes For The Next Agent

- Checkpoint 8 should build on existing deployment/domain/GitHub state, not replace it.
- Keep secrets hidden and avoid exporting them to `routely.yml`.
- Keep the env/settings integration narrow: CRUD, redaction, restart/redeploy-needed state, and basic injection where safe.
- Do not start backups, notifications, production database templates, metrics, full rollback, or broad VPS operations.
