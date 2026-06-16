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
51005c1 feat: implement Routely dashboard with Spotify-inspired theme and API integration
8c48766 feat: add local runner lifecycle commands
bde6da9 feat: stabilize workspace root resolution
0d3dfd8 docs: add implementation checkpoint plan
725c532 feat: add initial documentation and feature specifications for Routely
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

## Current Checkpoint Status

Checkpoint 0 is complete.

Checkpoint 1 is partially complete. Remaining items:

- Implement `depends_on` dependency ordering for local apps/services.
- Add stronger stale PID reconciliation on daemon/CLI startup.
- Harden `down`/`restart` behavior for detached and long-running managed app processes.
- Consider improving `routely down` to coordinate with the running supervisor/daemon when available.

Recommended next step:

```text
Finish Checkpoint 1 before moving to Checkpoint 2.
```

After Checkpoint 1 is fully complete, continue to Checkpoint 2: dashboard local controls.

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
- Checkpoint 1 local runner first slice is committed.
- Recent commits include:
  - 51005c1 feat: implement Routely dashboard with Spotify-inspired theme and API integration
  - 8c48766 feat: add local runner lifecycle commands
  - bde6da9 feat: stabilize workspace root resolution
  - 0d3dfd8 docs: add implementation checkpoint plan

Your next task:
Finish the remaining Checkpoint 1 work from docs/14-implementation-plan.md:
1. Implement depends_on dependency ordering for local apps/services.
2. Add stale PID reconciliation so old runtime_instances do not leave apps incorrectly marked running.
3. Harden down/restart behavior for managed app processes.
4. Add/adjust tests for the risky logic.
5. Update docs/13-current-setup-status.md and README.md if behavior changes.
6. Run relevant verification commands.
7. Commit only the files changed for this checkpoint with a concise commit message.

Do not start Checkpoint 2 until Checkpoint 1 exit criteria are met or any remaining gap is documented.
Preserve unrelated user changes in the worktree. Do not use destructive git commands.
```

## Immediate Next Checklist

- [ ] Check `git status --short`.
- [ ] Read the latest `apps/cli/src/index.ts`, `packages/core/src/index.js`, `packages/db/src/index.js`, and `packages/drivers/src/index.js`.
- [ ] Implement dependency sort utility with cycle detection.
- [ ] Add tests for dependency ordering and cycle errors.
- [ ] Add stale PID reconciliation helper.
- [ ] Run CLI tests/build/lint.
- [ ] Smoke test local runner.
- [ ] Update docs.
- [ ] Commit checkpoint changes.
