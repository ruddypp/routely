# Routely Implementation Backlog

Status: Canonical backlog for dev teams
Owner: PM
Last updated: 2026-06-21

## Source Of Execution

`docs/01-alpha-plan.md` is the execution source for public alpha work. This backlog expands that plan into implementable team slices.

## Slice 1: Local Demo Hardening

Goal: a new user can run three local apps and one database with `routely`.

Backend:

- Verify CLI commands used by the local demo.
- Provide or confirm example app paths.
- Harden workspace resolution, dependency ordering, port conflict handling, process lifecycle, and log access.
- Add focused tests for local lifecycle risk points.

Frontend/UI:

- Ensure overview, apps/services, and logs show real local data.
- Keep local lifecycle controls visible only where actions are implemented.
- Provide clear empty/error/crashed/blocked states.

QA/Security:

- Run clean workspace smoke.
- Test port conflict or app crash failure path.
- Verify local binding and secret/log exposure expectations.

Exit: local demo passes from public docs without private context.

## Slice 2: VPS Demo Hardening

Goal: a Dockerfile app deploys to one VPS with domain and honest HTTPS/proxy state.

Backend:

- Verify server init/doctor and production data directory behavior.
- Harden Dockerfile deploy phases and deployment logs.
- Harden domain verification, proxy route generation, and conservative TLS status.
- Verify production mutation auth.

Frontend/UI:

- Show server readiness, deployment phases, domain/DNS/proxy/HTTPS state, health, and logs from real data.
- Disable or hide unsupported production actions.

QA/Security:

- Run disposable VPS smoke with dated environment details.
- Audit auth, Docker/proxy exposure, secrets, DNS, HTTPS truthfulness, and backup file assumptions.

Exit: VPS demo passes with a real domain and no fake HTTPS success.

## Slice 3: GitHub Demo Hardening

Goal: push to configured branch redeploys; broken deploys are diagnosable.

Backend:

- Verify GitHub App setup docs and env requirements.
- Preserve signature validation, delivery dedupe, repo mapping, and branch filtering.
- Persist commit/deploy metadata and failure logs.

Frontend/UI:

- Show GitHub connection status, repo/branch, latest delivery/deploy, ignored events, failure phase, and log path.

QA/Security:

- Run one successful push and one intentional broken push.
- Audit webhook trust boundary, secret exposure, replay/dedupe, and untrusted text rendering.

Exit: GitHub demo passes and broken deploy logs identify the failure phase.

## Slice 4: Release Docs

Goal: public alpha docs are executable by a new user.

PM:

- Rewrite README around the three demos.
- Keep docs index and docs map current.
- Document limitations and deferred scope.

Backend/Frontend:

- Provide verified command/API/dashboard route details.

QA/Security:

- Attach final smoke and security reports under `docs/qa/` and `docs/security/`.

Exit: public docs match verified behavior.

## Verification Policy

Use the narrowest checks that cover the touched work. Minimums:

- docs-only: `git diff --check` plus targeted reference searches
- CLI/shared: `npm run lint`, `npm run test --workspace apps/cli`
- daemon: `node --check apps/daemon/src/server.js` plus relevant API tests
- web: read Next.js docs first, then `npm run lint`, `npm run test --workspace apps/web`, and `npx tsc --noEmit --project apps/web/tsconfig.json`
- broad release: `npm run build --workspaces --if-present` when practical

Commit only after verification passes and only when the user approves this docs reset.
