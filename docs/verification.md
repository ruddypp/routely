# Routely Verification Guide

## Verification Philosophy

Routely must be proven by behavior, not by configuration existing on disk. A feature is accepted only when it can be demonstrated through the dashboard/API/CLI surface that a user actually uses.

## Required Checks By Work Type

### Documentation-only changes

- Validate links and read order manually.
- Run `git diff --check`.
- If docs mention commands, verify the command names still exist where practical.

### Frontend changes

- Run the relevant app/web tests.
- Run lint for `apps/web` when practical.
- Run `npm run build --workspace apps/web` for dashboard-shell, dependency, chart, route, or layout changes.
- Run a browser smoke or provide a screenshot/visual QA note for touched UI flows when practical.
- Verify loading, empty, error, and failure states.
- For visual checkpoints, verify the result does not preserve the old alpha layout with only renamed components.
- For the Spotify-inspired baseline, verify the dashboard is dark, compact, chart-friendly, keeps the top-right GitHub CTA, has no tall Server Rail/banner, and has no large light stale-data panel above the fold.

### Backend changes

- Run the relevant package/app tests.
- Run targeted tests for touched modules.
- Run an integration smoke against Docker/Compose when runtime behavior changes.
- Verify failure states and logs, not only happy paths.

### Full MVP slices

- Run `npm run lint --workspaces --if-present` when practical.
- Run `npm run test --workspaces --if-present` when practical.
- Run `npm run build --workspaces --if-present` for broad changes when practical.
- Run manual smoke for the affected end-to-end flow.

## MVP Acceptance Smoke

A clean MVP smoke should prove:

1. Docker and Compose prerequisites are detected.
2. `routely` starts the server session.
3. Dashboard loads.
4. Empty state invites Add App.
5. Local folder app can be added, detected, verified, started, stopped, restarted, disabled, and enabled.
6. GitHub app can be added when credentials exist.
7. Failed setup does not become ready.
8. Enabled ready apps auto-start on next server session.
9. App logs and health are visible.
10. Host disk, CPU, memory, and uptime are visible.
11. Database service can be created and attached to an app.
12. Domain can be added, DNS verification result is shown, and proxy route status is visible.
13. Backup/restore controls are not present.
14. Terminal requires explicit user action and shows scope.
15. Secrets are masked after save.

## Frontend Acceptance Checklist

- Navigation is clear on desktop and mobile.
- Server Rail is always understandable.
- Actions use consistent verbs.
- Failure copy says what failed and what to do next.
- Disabled controls explain why.
- Status is not communicated by color alone.
- No UI claims an app is ready unless backend state says ready.
- Deferred features are hidden or explicitly marked unavailable.

## Backend Acceptance Checklist

- Route handlers are thin and call module seams.
- Docker/Compose commands are centralized behind runtime modules.
- Setup verification captures phase, logs, and actionable error.
- Readiness gate prevents broken apps from auto-starting.
- Shutdown stops session-scoped apps.
- Domain/proxy generation validates hostnames.
- Webhook signatures are validated before dedupe/state mutation.
- Secrets are not returned raw after save.
- Metric/log retention is bounded.

## Security Acceptance Checklist

- Browser cannot call private daemon directly in normal operation.
- Public/exposed runtime host requires auth for privileged actions.
- Terminal is explicit and scoped.
- Local folder paths are treated as privileged host access.
- Database services are internal-only by default.
- Logs avoid known secret exposure where feasible.
- Destructive actions require confirmation.

## Commit And Push Rule

After each completed slice:

1. Run relevant checks.
2. Commit only files owned by the slice.
3. Push the commit over SSH when remote access is configured and the user requested push-on-change: `git@github.com:ruddypp/routely.git`.
4. If push fails, report the exact error and leave the local commit intact.

Do not use HTTPS push in non-interactive agent sessions. If the remote is HTTPS, switch it first:

```bash
git remote set-url origin git@github.com:ruddypp/routely.git
```
