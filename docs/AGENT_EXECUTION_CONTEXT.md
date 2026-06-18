# Routely Agent Execution Context

Last updated: 2026-06-18  
Current completed checkpoint: Checkpoint 8, Environment, Secrets, and App Settings  
Next checkpoint: Checkpoint 9, Logs, Metrics, and Health

This file is a compact handoff and copy-paste prompt for another implementation agent. It intentionally repeats the most important context so the next agent does not treat the next task as frontend-only polish.

## Product Identity

Routely is an open source, self-hosted app manager for solo developers. The product direction is:

- Local-first command/control inspired by 9Router: one command starts local apps/services, the dashboard is fast, status is visible, and daily development is low-friction.
- Single-VPS production operations inspired by Dokploy: dense app/project management, deployments, domains, HTTPS/proxy, logs, health, metrics, environment variables, and safe operational controls.
- Routely must not clone either product. Routely's identity is bridging local development and single-VPS production through one app registry and dashboard mental model.

Future agents must read these product references before planning production/dashboard/backend work:

- `https://github.com/decolua/9router`
- `https://github.com/decolua/9router/blob/master/DOCKER.md`
- `https://github.com/Dokploy/dokploy`
- `https://dokploy.com/`
- `https://docs.dokploy.com/`
- `https://docs.dokploy.com/docs/core/applications/going-production`

Use 9Router for local-first workflow context and Dokploy for dense single-VPS operations context. Do not copy UI/code/features mechanically.

## Current Progress

Implemented checkpoints:

- Checkpoint 0: foundation/root resolution.
- Checkpoint 1: local runner lifecycle, logs, restart/down/doctor, dependency ordering.
- Checkpoint 2: dashboard local controls and same-origin app action routes.
- Checkpoint 2.5: cohesive 9Router-inspired frontend shell.
- Checkpoint 3: config, presets, Compose services, local database service templates.
- Checkpoint 4: production server foundation and admin token auth.
- Checkpoint 5: Dockerfile-first production deploy vertical slice.
- Checkpoint 6: proxy, domains, and HTTPS state.
- Checkpoint 7: GitHub integration and signed push-to-deploy.
- Checkpoint 8: environment, secrets, app settings, redaction, env injection, restart/redeploy-needed state.

Current important behavior:

- Browser code must call same-origin `/api/*` only. Do not call the daemon directly from browser components.
- Production mode requires admin bearer token auth for private daemon actions.
- Preserve manual Dockerfile deploy, domain/proxy/HTTPS state, signed GitHub push-to-deploy, stored env/secrets, redaction behavior, and restart/redeploy-needed flags.
- Keep secrets out of `routely.yml` by default. Stored secret values are hidden after save.
- Keep unsafe/future features inert unless the checkpoint explicitly asks for them.

Current CLI surface includes:

- `routely init`, `sync`, `add`, `up`, `down`, `ps`, `logs`, `restart`, `doctor`.
- `routely server init`, `routely server doctor`.
- `routely deploy <app> [--watch]`.
- `routely env <app> list`.
- `routely env <app> set KEY=value [--secret] [--scope all|local|production]`.
- `routely env <app> unset KEY`.
- `routely domain root/add/verify/ls`.
- `routely github status`, `installation add`, `repo add`, `connect`.

## Execution Standard For Next Work

Do not do a frontend-only redesign. For every checkpoint:

1. Make meaningful backend/storage/API/CLI progress first.
2. Add focused tests for the real behavior.
3. Then improve the dashboard around real daemon/API/storage data.
4. Make the production dashboard feel closer to Dokploy: operational, dense, readable, status-rich, easy to use, comfortable for daily VPS work, with clear hierarchy and inspector tabs.
5. Every visible production/env/deploy/domain/proxy/GitHub/log/health panel should be backed by real data where practical. If a feature is future scope, keep it disabled and label it as a later checkpoint.
6. Preserve Routely's local-first identity and the same app registry/dashboard mental model.

Frontend enhancement is required, but it must follow the backend slice. The dashboard should not be decorative. It should be a usable operations surface with dense rows, readable panels, tabbed inspectors, clear state labels, safe controls, and no horizontal overflow.

## Copy-Paste Prompt For The Next Agent

```text
You are working in /home/ruddypp/Documents/work/routely.

Read AGENTS.md, docs/HANDOFF.md, docs/AGENT_EXECUTION_CONTEXT.md, docs/NEXT_AGENT_PROMPT.md, docs/14-implementation-plan.md, docs/13-current-setup-status.md, DESIGN.md, and relevant feature/spec docs before editing. Follow AGENTS.md strictly, including the Next.js docs rule and the auto-commit rule.

Before planning implementation, read these references:
- https://github.com/decolua/9router
- https://github.com/decolua/9router/blob/master/DOCKER.md
- https://github.com/Dokploy/dokploy
- https://dokploy.com/
- https://docs.dokploy.com/
- https://docs.dokploy.com/docs/core/applications/going-production

Routely is inspired by 9Router's local-first command/control workflow and Dokploy's dense single-VPS production operations. Do not clone either product. Routely's identity is bridging local development and single-VPS production through one app registry and dashboard mental model.

Current progress:
- Checkpoint 0 through Checkpoint 8 are implemented.
- Browser code must call same-origin /api/* only.
- Production mode requires admin bearer token auth for private daemon actions.
- Preserve manual Dockerfile deploy, domain/proxy/HTTPS state, signed GitHub push-to-deploy, stored env/secrets, redaction behavior, and restart/redeploy-needed state.

Next task:
Implement Checkpoint 9 from docs/14-implementation-plan.md comprehensively: Logs, Metrics, and Health.

Execution bar:
- Do not make this frontend-only.
- Make meaningful backend progress first: schema/DB helpers where useful, daemon endpoints, auth enforcement, health evaluation, log redaction, app/container health state, and tests.
- Add CLI/API workflows where useful, but only if backed by real daemon/storage data.
- Then enhance the frontend around real daemon/API/storage data.
- Improve the production dashboard so it feels closer to Dokploy: operational, dense, readable, status-rich, easy to use, comfortable for daily VPS operations, with clear hierarchy and inspector tabs.
- Every visible production/log/health/deploy/domain/proxy/GitHub/env panel should be backed by real data where practical, or intentionally disabled with a future-checkpoint label.
- Keep unsafe/future features inert. Do not implement backups, notifications, production database templates, full rollback, or broad VPS operations.
- Keep metrics narrow if implemented; do not build a broad VPS management suite during Checkpoint 9.
- Reuse Checkpoint 8 redaction helpers so secret values are not leaked in logs or API responses.

Required checks:
- npm run lint
- npm run test --workspace apps/cli if CLI/shared code is touched
- npm run build --workspace apps/cli if CLI/shared runtime code is touched
- npm run test --workspace apps/web if web/API route handlers are touched
- npx tsc --noEmit --project apps/web/tsconfig.json if apps/web is touched
- node --check apps/daemon/src/server.js if daemon code is touched
- Attempt npm run build --workspace apps/web and document the known Turbopack output caveat if it appears.

At the end:
- Update docs/HANDOFF.md, docs/13-current-setup-status.md, docs/NEXT_AGENT_PROMPT.md, and docs/AGENT_EXECUTION_CONTEXT.md if behavior or next checkpoint direction changes.
- Commit only files changed for the checkpoint with a concise message, for example feat: add app health logs.
```

## Current Verification Notes

Checkpoint 8 verification passed:

- `npm run lint`
- `npm run test --workspace apps/cli`
- `npm run build --workspace apps/cli`
- `npm run test --workspace apps/web`
- `npx tsc --noEmit --project apps/web/tsconfig.json`
- `node --check apps/daemon/src/server.js`

Known caveat:

- `npm run build --workspace apps/web` may return only partial Turbopack output such as `Finished TypeScript...` with no final exit marker. Treat this as the existing build-reporting caveat unless new concrete diagnostics appear.
