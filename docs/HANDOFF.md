# Routely Agent Handoff

Last updated: 2026-06-16

This file preserves the current implementation context so another agent can continue without relying on chat history.

## Project Intent

Routely is an open source, self-hosted app orchestrator for solo developers.

Core direction:

- 9Router-like local experience: run `routely` and all registered local apps/services start.
- Dokploy-like VPS experience: use one VPS as a self-hosted control plane for deploys, domains, HTTPS, logs, metrics, databases, and backups.
- Main differentiator: local-to-production workflow using the same app registry and dashboard mental model.

## Read First

Before implementing, read:

1. `AGENTS.md`
2. `docs/HANDOFF.md`
3. `docs/14-implementation-plan.md`
4. `docs/13-current-setup-status.md`
5. `docs/05-cli-spec.md`
6. `docs/06-api-spec.md`
7. `docs/07-config-spec.md`
8. `docs/feature-specs/local-runner.md`
9. `docs/feature-specs/dashboard.md`

For Next.js changes, follow `AGENTS.md`: read the relevant guide in `node_modules/next/dist/docs/` before editing Next.js code.

## Recent Commits

Recent history at handoff time:

```text
8b296fb feat: finish local runner checkpoint
51005c1 feat: implement Routely dashboard with Spotify-inspired theme and API integration
8c48766 feat: add local runner lifecycle commands
bde6da9 feat: stabilize workspace root resolution
0d3dfd8 docs: add implementation checkpoint plan
```

Treat `docs/14-implementation-plan.md` as the canonical execution backlog unless a newer document explicitly replaces it.

## Completed Progress

### Documentation Baseline

Completed in `0d3dfd8`:

- Added `docs/14-implementation-plan.md` as the end-to-end checkpoint plan.
- Added auto-commit rules to `AGENTS.md`.
- Linked the implementation plan from `docs/README.md`.

Important workflow rule:

- After finishing a feature/checkpoint and passing verification, commit only files relevant to that feature/checkpoint.
- Preserve unrelated user changes.

### Checkpoint 0: Stabilize Foundations

Completed in `bde6da9`:

- Split CLI path handling into install root and workspace root.
- Added `apps/cli/src/paths.ts` and tests.
- `routely` uses the current working directory as workspace by default.
- `ROUTELY_WORKSPACE_ROOT` can override active workspace.
- `ROUTELY_REPO_ROOT` remains the Routely install/dev root override.
- Daemon reads workspace config/state from `ROUTELY_WORKSPACE_ROOT`.
- Dashboard server-side daemon URL uses `ROUTELY_DAEMON_URL`.
- Added `packages/core/src/config.js` for `routely.yml` loading.
- Added config sync helpers in `packages/db`.
- Updated README and setup status docs.

Verification was performed with CLI tests, CLI build, lint, temp workspace smoke tests, and daemon `/health` smoke test.

### Checkpoint 1: Local Runner v1, First Slice

Completed in `8c48766`:

- Added `routely down`.
- Added `routely logs [app] [--follow]`.
- Added `routely restart [app]`.
- Added `routely doctor`.
- Added app log persistence under `.routely/logs/<app>.log`.
- Added port conflict detection before `routely up`.
- Added `apps/cli/src/ports.ts` and tests.
- Added DB helper for running runtime instances.
- Updated command driver typing for richer stdio options.
- Updated README and setup status docs.

Verification was performed with CLI tests, CLI build, lint, local runner smoke tests, and port conflict tests on port `4173`.

### Checkpoint 1: Local Runner v1, Completion

Completed in `8b296fb`:

- Added `depends_on` support to config normalization, DTO/type declarations, and SQLite storage.
- Added `apps/cli/src/dependencies.ts` for dependency ordering with cycle detection.
- `routely up` starts enabled command apps in dependency order and rejects dependency cycles before starting anything.
- Added shared `reconcileStaleRuntimeInstances` DB helper.
- CLI commands reconcile stale runtime PIDs before status/lifecycle operations.
- Daemon boot reconciles stale runtime PIDs before serving app state to dashboard/API consumers.
- Hardened `routely down` and `routely restart` for detached managed processes: SIGTERM process group, wait briefly, then SIGKILL if still alive.
- Added tests for dependency ordering/cycles and stale PID reconciliation.
- Updated README and `docs/13-current-setup-status.md`.

Verification performed:

- `npm run lint` passed.
- `npm run build --workspace apps/cli` passed.
- `npm run test --workspace apps/cli` passed: 4 files, 12 tests.
- Temp workspace smoke test passed for `init`, `add`, `sync`, `ps`, `up`, Ctrl+C shutdown, `restart hello`, `logs hello`, `down`, and final `ps`.
- Final process check found no leftover Routely daemon/web/example processes.

Verification caveat:

- `npm run build --workspaces --if-present` and `npm run build --workspace apps/web` were attempted, but this tool only returned the Next.js progress line (`Finished TypeScript...`) and no final exit marker even though no build process remained afterward. Do not treat the broad/web build as a confirmed pass from this handoff.

## Current Checkpoint Status

Checkpoint 0 is complete.

Checkpoint 1 is complete for the documented remaining scope.

Recommended next step:

```text
Start Checkpoint 2: Dashboard Local Controls.
```

Do not start production/VPS work yet. Continue with dashboard local controls and daemon lifecycle endpoints.

## Current Known Environment

Previously verified local versions:

```text
Node.js:        v24.12.0
npm:            11.6.2
Git:            2.54.0
Docker:         29.5.3
Docker Compose: v5.1.4
```

Default ports:

```text
3030 dashboard
9977 daemon
4173 hello-command example
20128 reserved for 9Router, do not use
```

## Important Notes

- Always inspect `git status --short` before editing.
- Do not use destructive git commands.
- Stage only files related to the current checkpoint.
- Do not commit `apps/cli/node_modules/` if it appears.
- Browser code should call same-origin `/api/*` routes, not the daemon directly.
- Local daemon should bind to `127.0.0.1`.
- Do not start production/VPS work until local runner and dashboard lifecycle primitives are reliable.

## Suggested Verification Commands

Use as appropriate:

```bash
npm run test --workspace apps/cli
npm run build --workspace apps/cli
npm run lint
```

For Checkpoint 2, also verify the web/dashboard path after changes. Because Next.js APIs may differ from training data, read the relevant guide in `node_modules/next/dist/docs/` before editing `apps/web`.

Suggested smoke test shape:

```bash
tmp=$(mktemp -d /tmp/routely-smoke-XXXXXX)
cd "$tmp"
node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js init
node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js add /home/ruddypp/Documents/work/routely/examples/hello-command --name hello --command "npm run dev" --port 4173
node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js doctor
timeout 12s node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js up || test "$?" = "124"
node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js logs hello
node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js down
```

## Prompt For Next Agent

Copy this prompt into the next agent:

```text
You are working in /home/ruddypp/Documents/work/routely.

Read AGENTS.md, docs/HANDOFF.md, and docs/14-implementation-plan.md first. Follow AGENTS.md strictly, including the Next.js docs rule and auto-commit rule.

Project intent: Routely is a 9Router-inspired local app runner plus Dokploy-inspired VPS deployment platform. The core differentiator is local-to-production workflow for solo developers.

Current progress:
- Checkpoint 0 is complete.
- Checkpoint 1 local runner is complete and committed.
- Recent commits include:
  - 8b296fb feat: finish local runner checkpoint
  - 51005c1 feat: implement Routely dashboard with Spotify-inspired theme and API integration
  - 8c48766 feat: add local runner lifecycle commands
  - bde6da9 feat: stabilize workspace root resolution

Your next task:
Start Checkpoint 2 from docs/14-implementation-plan.md: Dashboard Local Controls.
1. Read the relevant Next.js docs in node_modules/next/dist/docs/ before editing apps/web.
2. Add daemon endpoints for app lifecycle/log access:
   - POST /apps/:id/start
   - POST /apps/:id/stop
   - POST /apps/:id/restart
   - GET /apps/:id/logs
3. Add matching Next.js API route handlers that keep browser calls same-origin under /api/*.
4. Add dashboard controls for start, stop, restart, open URL, and view logs.
5. Add useful loading, disabled, error, and refresh states.
6. Add or adjust tests for route handlers and daemon-unreachable behavior where practical.
7. Update docs if behavior changes.
8. Run relevant verification commands. At minimum prefer npm run lint, npm run build --workspace apps/cli if CLI is touched, and web build/checks for dashboard changes.
9. Commit only the files changed for this checkpoint with a concise commit message.

Do not start production/VPS work. Preserve unrelated user changes in the worktree. Do not use destructive git commands.
```

## Immediate Next Checklist

- [ ] Check `git status --short`.
- [ ] Read `AGENTS.md`, this handoff, and `docs/14-implementation-plan.md`.
- [ ] Read relevant Next.js docs from `node_modules/next/dist/docs/` before editing `apps/web`.
- [ ] Inspect `apps/daemon/src/server.js`, `apps/web/src/app/api`, and dashboard components.
- [ ] Implement daemon lifecycle/log endpoints for local command apps.
- [ ] Implement matching Next.js API route handlers.
- [ ] Add dashboard controls and log viewing UX.
- [ ] Add/adjust tests where practical.
- [ ] Run lint/build/tests/smoke checks.
- [ ] Update docs if behavior changes.
- [ ] Commit Checkpoint 2 changes only.
