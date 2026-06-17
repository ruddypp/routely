# Routely Agent Handoff

Last updated: 2026-06-17

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
10. `DESIGN.md`

For Next.js changes, follow `AGENTS.md`: read the relevant guide in `node_modules/next/dist/docs/` before editing Next.js code.

## Recent Commits

Recent history at handoff time:

```text
d868b09 feat: add frontend product shell
0daf3e3 feat: add dashboard local controls
b5f62f0 docs: update checkpoint handoff
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

Checkpoint 2 has started. Implemented and committed in `0daf3e3`:

- Daemon local lifecycle endpoints:
  - `POST /apps/:id/start`
  - `POST /apps/:id/stop`
  - `POST /apps/:id/restart`
  - `GET /apps/:id/logs`
- Next.js same-origin proxy route for app actions at `/api/apps/:id/:action`.
- Dashboard app table controls for start, stop, restart, open local URL, manual refresh, and recent logs.
- Focused route-handler tests for happy-path start proxying and daemon-unreachable log access.

Additional Checkpoint 2 / 2.5 work implemented and committed in `d868b09`:

- Added daemon `PATCH /apps/:id` support for editing app registry entries by id.
- Added same-origin Next.js `PATCH /api/apps/:id` proxying.
- Reworked the browser UI into a dense local-first product shell with desktop sidebar, mobile bottom navigation, workspace/status header, local app control rows, app inspector, recent logs, and add/edit registry forms.
- Add/edit forms cover the current app registry schema: name, type, preset, driver, path, command, port, enabled, and dependencies.
- Future production sections are represented only as inert navigation placeholders; no production/VPS actions have been implemented.
- Added focused route-handler tests for app create/edit proxying and daemon-unreachable edit failures.

Verification for the current Checkpoint 2 / 2.5 work:

- `npm run lint` passed.
- `npm run test --workspace apps/web` passed: 3 files, 5 tests.
- `npx tsc --noEmit --project apps/web/tsconfig.json` passed.
- `node --check apps/daemon/src/server.js` passed.
- `npm run build --workspace apps/cli` passed.
- `npm run test --workspace apps/cli` passed: 4 files, 12 tests.
- Browser/API smoke passed with daemon and web dev server running locally: `/api/apps` returned `hello-command`, `/api/apps/3/logs` returned an empty log payload, and desktop/tablet/mobile headless Chrome screenshots showed the responsive shell without obvious overlap.

Web build caveat:

- `npm run build --workspace apps/web` was attempted twice, including once with an explicit exit marker. The tool returned only `Finished TypeScript in ...` and no final exit marker, and no `next build`/Turbopack process remained afterward. This matches the known pre-existing build-reporting failure from the handoff rather than a new checkpoint-specific error.

Recommended next step before moving on:

- Do one more frontend design enhancement pass on the existing Checkpoint 2.5 shell, focused on visual quality, responsive polish, app row/action ergonomics, inspector/log readability, and form states.
- After that, move to Checkpoint 3 only if the frontend remains stable and production/VPS work is still explicitly deferred.

Checkpoint 2.5 has been added to `docs/14-implementation-plan.md` as the explicit frontend polish checkpoint:

- Name: `9Router-Inspired Frontend Product Shell`.
- Scope: the whole Routely browser app, not only the dashboard home/table.
- Direction: make the UI/UX feel 9Router-inspired for local app runner workflows while respecting `DESIGN.md` for visual taste.
- `DESIGN.md` currently defines near-black Spotify-inspired taste: compact/dense app UI, functional green accent, pill/circular controls, heavy dark elevation, responsive sidebar/mobile navigation, and no generic SaaS landing-page treatment.
- Backend/product concept remains Dokploy-like for VPS deployment, domains, HTTPS, logs, metrics, databases, and backups, but production controls must wait for their checkpoints.

Recommended next step:

```text
Enhance the Checkpoint 2.5 frontend design polish, then move to Checkpoint 3 only after verification.
```

Do not start production/VPS work yet. The next frontend pass should improve the existing product shell quality, not rebuild lifecycle controls or implement production actions.

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
- Dashboard lifecycle controls currently call `/api/apps/:id/start`, `/api/apps/:id/stop`, `/api/apps/:id/restart`, and `/api/apps/:id/logs`; these are handled by a single Next dynamic action route and proxied to the daemon.
- Dashboard app registry forms call same-origin `/api/apps` and `/api/apps/:id`; those route handlers proxy create/edit mutations to the daemon.
- Frontend visual/product direction is now explicit: the whole UI should feel 9Router-inspired while following `DESIGN.md`. Do not build a generic admin dashboard or SaaS landing page.
- For frontend work, read `DESIGN.md` before editing UI and keep the first screen as the actual app control surface.
- Local daemon should bind to `127.0.0.1`.
- Do not start production/VPS work until local runner and dashboard lifecycle primitives are reliable.

## Suggested Verification Commands

Use as appropriate:

```bash
npm run test --workspace apps/cli
npm run build --workspace apps/cli
npm run test --workspace apps/web
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

Read AGENTS.md, docs/HANDOFF.md, docs/14-implementation-plan.md, docs/13-current-setup-status.md, and DESIGN.md first. Follow AGENTS.md strictly, including the Next.js docs rule and auto-commit rule.

Project intent:
Routely is a 9Router-inspired local app runner plus Dokploy-inspired VPS deployment platform. The differentiator is local-to-production workflow for solo developers.

Current progress:
- Checkpoint 0 is complete and committed.
- Checkpoint 1 local runner is complete and committed.
- Checkpoint 2 Dashboard Local Controls is mostly complete.
- Checkpoint 2.5 9Router-inspired frontend product shell has been implemented in commit d868b09 `feat: add frontend product shell`.
- The current browser UI has desktop sidebar navigation, mobile bottom navigation, workspace/status header, dense app/service rows, app inspector, recent log panel, and add/edit app registry forms.
- Browser code calls same-origin `/api/*` routes only; it must not call the daemon directly.
- Daemon lifecycle/log endpoints are already present. Do not redo them unless fixing a bug.
- Daemon app registry editing now uses `PATCH /apps/:id`, proxied by Next.js through `PATCH /api/apps/:id`.
- Future production sections are inert navigation placeholders only. Do not start production/VPS work yet.

Your next task:
Do a design enhancement pass on the existing Checkpoint 2.5 frontend before moving to Checkpoint 3 or production/VPS work.

Design direction:
- Keep the product experience 9Router-inspired: local-first, dense, fast, status/log oriented, and control-focused.
- Follow DESIGN.md for visual taste: near-black surfaces, compact typography, functional green accent, pill/circular controls, heavy dark elevation, responsive sidebar/mobile navigation, and no generic SaaS landing page.
- Make the UI feel more polished and premium without making it spacious, decorative, or marketing-like.
- The first screen must remain the actual product control surface.

Specific design enhancement goals:
1. Read relevant Next.js docs in `node_modules/next/dist/docs/` before editing `apps/web`.
2. Inspect `apps/web/src/app/dashboard-client.tsx` and `apps/web/src/app/globals.css` first.
3. Improve the frontend visual quality beyond the current shell:
   - Refine spacing density, alignment, row rhythm, and panel hierarchy.
   - Improve the app row/action layout on desktop, tablet, and mobile.
   - Improve the app inspector/log panel readability and affordances.
   - Improve add/edit form layout, validation display, disabled states, and focus states.
   - Make empty/loading/offline/error states feel native to the shell.
   - Establish clearer reusable UI primitives if it reduces duplication.
   - Use icons only if an existing icon library is already available; do not add unnecessary dependencies just for icons.
4. Keep browser calls same-origin under `/api/*`.
5. Do not implement production/VPS actions, deploy flows, domains, metrics, databases, backups, GitHub automation, auth, or server setup yet.
6. Add or adjust tests where practical if behavior changes. Pure CSS/layout polish may not need new route tests.
7. Run verification:
   - `npm run lint`
   - `npm run test --workspace apps/web`
   - `npx tsc --noEmit --project apps/web/tsconfig.json`
   - `node --check apps/daemon/src/server.js` if daemon is touched
   - `npm run build --workspace apps/cli` if shared packages or CLI-related code are touched
   - browser smoke/responsive screenshots for desktop, tablet, and mobile widths if frontend UI is changed
8. Attempt `npm run build --workspace apps/web`, but note the known caveat: the tool currently returns only `Finished TypeScript...` with no final exit marker and no remaining build process. Treat this as pre-existing unless your changes produce a new explicit error.
9. Update docs if behavior or verification status changes.
10. Commit only files changed for this design/frontend checkpoint with a concise commit message.

Preserve unrelated user changes. Do not use destructive git commands. Do not start production/VPS work.
```

## Immediate Next Checklist

- [ ] Check `git status --short`.
- [ ] Read `AGENTS.md`, this handoff, `docs/14-implementation-plan.md`, `docs/13-current-setup-status.md`, and `DESIGN.md`.
- [ ] Read relevant Next.js docs from `node_modules/next/dist/docs/` before editing `apps/web`.
- [ ] Inspect `apps/web/src/app/dashboard-client.tsx` and `apps/web/src/app/globals.css`.
- [ ] Do a focused frontend design enhancement pass on the existing Checkpoint 2.5 shell.
- [ ] Keep production/VPS sections inert; do not implement production actions.
- [ ] Run lint, web tests, web TypeScript, and browser smoke/responsive checks.
- [ ] Attempt/document the web build caveat.
- [ ] Update docs if behavior or verification notes change.
- [ ] Commit the design/frontend checkpoint changes only.
