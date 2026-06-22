# Routely MVP Implementation Slices

## How To Use This Document

This is the execution guide for specialists. Each slice is intentionally small enough for one agent to own without loading the entire codebase. Work in dependency order. Do not start a feature slice if its blocker is unfinished.

Every slice must end with:

- Relevant tests/checks.
- A concise commit containing only owned files.
- Push after commit through SSH when push access is available and the user has requested push-on-change: `git@github.com:ruddypp/routely.git`.
- Final handoff that states what changed, what passed, and what remains blocked.

## Global Rules

- Read `docs/blueprint.md`, `docs/architecture.md`, and the role-specific doc before coding.
- Before editing `apps/web`, read relevant Next.js docs under `node_modules/next/dist/docs/`.
- Do not reintroduce local-vs-VPS product split. Use runtime host language.
- Docker/Compose is required for the primary MVP path.
- Do not expose backup/restore as an enabled feature.
- Do not mark apps ready without setup verification.
- Do not create broad rewrites that mix unrelated modules.
- Dependencies are allowed when they improve quality; explain why, keep them focused, and include package/lockfile changes in the same slice commit.
- Do not use HTTPS push in agent sessions. If needed, run `git remote set-url origin git@github.com:ruddypp/routely.git` before pushing.

## Slice 0 — Documentation Reset

Owner: PM/Lead.

Status: This slice is the current docs reset.

What to build:

- Replace stale alpha docs with the new placement-neutral MVP blueprint.
- Capture decisions in `CONTEXT.md` and ADRs.
- Provide frontend/backend specialist guidance.
- Provide small execution slices.

Acceptance criteria:

- Docs use runtime host and Routely server session language.
- Docs define Docker/Compose primary runtime.
- Docs defer backup/restore.
- Docs include frontend, backend, architecture, and verification guidance.

## Slice 1 — Prefactor Dashboard Shell

Owner: Frontend.

Blocked by: Slice 0.

What to build:

- Extract the existing dashboard shell into feature modules without changing behavior.
- Introduce Server Rail, sidebar, page layout, loading/error/empty primitives.
- Keep existing data sources working.

Acceptance criteria:

- Dashboard renders the same existing data after refactor.
- `dashboard-client` no longer owns shell, navigation, all sections, and all operations in one large component.
- UI tests or smoke tests cover page render and navigation.

## Slice 1A — Visual Operations Dashboard Redesign

Owner: Frontend.

Blocked by: Slice 1.

Why this exists:

- Slice 1 modularized the shell but intentionally preserved much of the old dashboard look.
- The product now needs a visible redesign pass before deeper frontend feature work.

What to build:

- Redesign the dashboard home into a polished operations dashboard, not a renamed version of the old alpha layout.
- Install and use `recharts` for chart primitives if it is not already installed.
- Optionally install `lucide-react` for focused operational icons.
- Build reusable chart modules for host resources, disk usage, app status distribution, traffic, and activity timeline.
- Use real backend data where available; use honest empty/pending states where data does not exist.
- Keep Backups/Restore hidden from active UI.

Acceptance criteria:

- The dashboard has a visibly new composition and no longer reads as the previous alpha dashboard.
- Server Rail is visually prominent and useful.
- At least three chart/visualization components are rendered on the dashboard path: host resources, disk usage, and app status or traffic.
- Charts use Routely palette tokens and accessible labels.
- No fake healthy/running/traffic values are invented.
- Relevant web lint, tests, and build pass.
- Final handoff includes files changed, dependency changes, checks, commit hash, push status, and screenshot/visual QA note.

## Slice 1B — Spotify-Inspired Dashboard Correction

Owner: Frontend.

Status: Accepted as the dashboard visual baseline in commit `779afaa`.

Blocked by: Slice 1A.

Why this exists:

- Slice 1A introduced charts but still produced a light command-board layout that did not match the requested Spotify-inspired Routely UI.
- Slice 1B corrected the dashboard into the dark operations-deck baseline future FE work must preserve.

Accepted baseline:

- Muted fixed sidebar with active green navigation.
- Minimal dashboard deck header, not a tall Server Rail/banner.
- `Connect GitHub` CTA in the top-right of the control deck.
- Runtime controls stacked near the top and spanning the deck width.
- Operational summary and Activity sit beneath runtime controls.
- Fewer larger cards replace many tiny metric cards.
- Host resources, disk, app status, and traffic panels use dark chart styling.
- Empty/auth states stay honest but visually subordinate.
- Backups/Restore remain hidden from active UI.

Acceptance criteria for future changes that touch this area:

- Screenshot still clearly reads as a dark Spotify-inspired operational console.
- No large white/cream stale-data panels appear on the dashboard home.
- No tall Server Rail/banner returns.
- At least three visual/chart components remain present and dark-theme styled.
- Empty/unavailable states are honest but do not dominate the layout.
- Relevant web lint, tests, and build pass.
- Final handoff includes screenshot path or image, files changed, checks, commit hash, and push status.

## Slice 2 — Prefactor Daemon Route Modules

Owner: Backend.

Blocked by: Slice 0.

What to build:

- Extract daemon routes into route groups without behavior changes.
- Separate app, lifecycle, domain, database, metrics, GitHub, and server-status route registration.
- Keep existing API responses compatible while introducing module seams.

Acceptance criteria:

- Existing daemon tests pass.
- Route grouping is visible in code structure.
- No feature behavior changes are mixed into the refactor.

## Slice 3 — Server Session Bootstrap

Owner: Backend.

Blocked by: Slice 2.

What to build:

- Create a server-session module that owns `routely` startup/shutdown orchestration.
- Check Docker/Compose, ports, and data directory.
- Start daemon/API, dashboard, proxy placeholder, and observability collector lifecycle hooks.
- Return structured session status.

Acceptance criteria:

- `routely` still starts the dashboard and daemon.
- Missing Docker/Compose reports a clear blocking error.
- Session status is visible to dashboard API.
- Shutdown path stops session-scoped apps.

## Slice 4 — App Registry V2 State Model

Owner: Backend.

Blocked by: Slice 2.

What to build:

- Add registry state for managed apps, managed services, source references, recipes, readiness, enablement, and lifecycle.
- Preserve existing app data through migration or compatibility adapter.
- Enforce readiness transitions at the registry seam.

Acceptance criteria:

- Apps can be listed with source, recipe, readiness, enablement, and lifecycle state.
- Failed/needs setup apps cannot be treated as ready.
- Existing apps still appear in the dashboard.

## Slice 5 — Compose Runtime Foundation

Owner: Backend.

Blocked by: Slice 3 and Slice 4.

What to build:

- Centralize Compose project naming, file writing, build/start/stop/restart, inspect, and logs behind RuntimeOrchestrator.
- Move existing Docker/Compose command construction behind this module.
- Support session ownership metadata.

Acceptance criteria:

- One existing Compose app can start/stop/restart through RuntimeOrchestrator.
- Logs can be fetched through RuntimeOrchestrator.
- Route handlers no longer construct Docker commands directly for this path.

## Slice 6 — Source Providers

Owner: Backend.

Blocked by: Slice 4.

What to build:

- Implement local folder source provider.
- Implement GitHub source provider using existing GitHub integration foundations.
- Store source metadata in registry.
- Provide source validation errors.

Acceptance criteria:

- Local folder source can be validated and scanned.
- GitHub source can list/select/fetch configured repositories in an environment with credentials.
- Source failures are distinguishable from recipe/build failures.

## Slice 7 — Recipe Engine MVP

Owner: Backend.

Blocked by: Slice 5 and Slice 6.

What to build:

- Detect Compose, Dockerfile, Node/package project, and manual fallback.
- Produce recipe candidates with confidence and missing fields.
- Generate/adopt Compose-backed definitions.

Acceptance criteria:

- A Compose repo produces a Compose recipe.
- A Dockerfile repo produces a Dockerfile-backed Compose recipe.
- A Node package repo produces a guided Node recipe requiring explicit port/start data when ambiguous.
- Unsupported projects produce manual fallback, not fake readiness.

## Slice 8 — Setup Verification

Owner: Backend.

Blocked by: Slice 7.

What to build:

- Run prepare, Compose validation, build, start, inspect, health/port probe, logs capture, and cleanup where appropriate.
- Store verification runs and results.
- Promote app to ready only on pass.

Acceptance criteria:

- Passing app becomes ready.
- Failing app remains draft/needs-fix/failed with logs and message.
- Verification result is available to the dashboard.

## Slice 9 — Application Setup Wizard UI

Owner: Frontend.

Blocked by: Slice 1, Slice 6, Slice 7, Slice 8.

What to build:

- Implement source selection, detection, configuration, verification, and finish steps.
- Show live or polled verification logs.
- Save draft/needs-fix state on failure.

Acceptance criteria:

- User can add local folder app through wizard.
- User can add GitHub app through wizard where credentials exist.
- Failed verification cannot be marked ready.
- Wizard copy is beginner-friendly and actionable.

## Slice 9A — Beginner Project Services Correction

Owner: Frontend.

Status: Completed in commit `a7e4da4` on 2026-06-23. The previous Apps/Services polish kept the dark surface direction but did not follow Dokploy's project model and did not make first deployment obvious for beginners.

Blocked by: none; shipped as the current Apps / Services frontend baseline.

Completion notes:

- Sidebar service modules were collapsed into Apps / Services.
- Apps / Services now owns the project workspace, create-service menu, source-first Application setup, selected service inspector, and database service panel.
- Zero-service state no longer renders a right-side `No app selected` inspector.
- Verification passed: `npx tsc --noEmit --project apps/web/tsconfig.json`, `npm run lint --workspace apps/web`, `npm run test --workspace apps/web`, `npm run build --workspace apps/web`, and `git diff --check`.

What to fix:

- Redesign the Apps/Services empty state into a `Create your first service` onboarding surface.
- Redesign Apps/Services around the Dokploy-style mental model: `Default project` -> runtime-host environment -> services.
- Collapse service-specific sidebar modules into Apps/Services. Deployments, Domains, GitHub source, Env / Secrets, Logs, Health, Metrics, and Databases are not global navigation items in the MVP.
- Add a selected-service inspector inside Apps/Services so service operations live beside the project service list.
- Add a first-level `Create service` header menu with Application, Database, Compose, and deferred Template / import.
- Add Application source/stack logo tiles with GitHub repo, Local folder, Docker Compose, Dockerfile, Node/Next.js, Static site, and Custom.
- Do not render service-type cards and Application source cards together in the empty state.
- Keep API/auth/registry errors as compact inline warnings so the user can still understand the Create Service path.
- Remove confusing empty inspector states such as a large `No app selected` panel when there are zero apps.
- Show source path/repository, branch, detected stack/recipe, port, and URL/domain clearly on app cards and wizard context.
- Rewrite technical lifecycle copy into beginner language, especially Start All behavior and readiness blocking.
- Preserve the Spotify-inspired dark Routely baseline from Slice 1B.

Acceptance criteria:

- A first-time user can tell exactly where to click to create an Application, Compose stack, or Database service within five seconds of opening `Apps`.
- Local folder flow visibly asks for an absolute path on the runtime host and explains that the host is the machine running `routely`.
- GitHub flow visibly asks for repository, branch, and optional project subdirectory.
- Stack/source cards include recognizable icons/images and short, plain explanations.
- Existing apps expose source detail, stack/recipe, readiness, lifecycle state, local/public URL, and safe actions without hover-only disclosure.
- Selecting an app opens service workspace tabs/panels inside Apps/Services; users do not leave Apps to see logs, deployments, domains, env, health, or database service state.
- Failed or unavailable backend state is honest but visually secondary.
- No fake healthy/running/traffic/readiness data is introduced.
- Final handoff includes screenshot path, changed files, dependencies, checks, commit hash, and SSH push status.

## Slice 10 — Auto-Start And App Lifecycle Controls

Owner: Backend + Frontend.

Blocked by: Slice 5 and Slice 8.

What to build:

- Auto-start enabled ready apps on server session startup.
- Implement app Start, Stop, Restart, Enable, Disable actions.
- Surface lifecycle state in app list and detail.

Acceptance criteria:

- Enabled ready apps start when `routely` starts.
- Disabled apps do not auto-start.
- Failed/needs setup apps do not auto-start.
- User can stop one app while Routely server continues running.

## Slice 11 — Operations Dashboard MVP

Owner: Frontend + Backend.

Blocked by: Slice 1, Slice 3, Slice 10.

What to build:

- Server Rail with runtime host status.
- Host disk, CPU, memory, uptime cards.
- App state summary.
- Recent failures/logs.
- Basic traffic placeholders wired to real backend when available.

Acceptance criteria:

- Dashboard shows host and app state at a glance.
- Empty state guides user to Create service.
- Metrics errors degrade gracefully.
- No fake traffic success is shown without backend data.

## Slice 12 — Service Detail Operations Workspace

Owner: Frontend.

Blocked by: Slice 9A, Slice 10, Slice 11.

What to build:

- Service detail shell inside Apps/Services with tabs: Overview, Services/Runtime, Logs, Deployments, Domains, Environment, Databases, Terminal, Settings.
- Wire available backend data progressively.
- Disabled/deferred tabs must explain what is unavailable.

Acceptance criteria:

- Service detail workspace is navigable and responsive inside the Apps/Services project page.
- Overview, Services, Logs, and Settings are functional for MVP apps.
- Deferred backup/restore controls are not present.

## Slice 13 — Logs And Health

Owner: Backend + Frontend.

Blocked by: Slice 5 and Slice 12.

What to build:

- Tail logs per app/service/run.
- Store and show health samples.
- Add log filters and failure-focused excerpts.

Acceptance criteria:

- App logs are visible after start/test run.
- Failed verification shows the relevant log excerpt.
- Health status appears on app cards and detail.
- Log reads are bounded.

## Slice 14 — Domains And Proxy

Owner: Backend + Frontend.

Blocked by: Slice 5 and Slice 12.

What to build:

- Domain add/edit/delete UI.
- DNS instructions and verification.
- Traefik-compatible route generation.
- HTTPS/TLS state tracking.
- Basic traffic signal plumbing where available.

Acceptance criteria:

- User can add a public domain to an app.
- DNS mismatch shows expected vs actual guidance.
- Proxy route is generated only for valid ready services.
- Domain state is visible in app detail.

## Slice 15 — Database Services

Owner: Backend + Frontend.

Blocked by: Slice 5 and Slice 12.

What to build:

- Database recipes for Postgres, MySQL, MariaDB, Redis, MongoDB.
- Create/start/stop/status/logs.
- Attach database to app via internal network and generated env values.
- Database service creation and status inside Apps/Services; no global Databases sidebar/page for MVP.

Acceptance criteria:

- User can create each supported database type.
- User can attach a database to an app.
- App receives generated env values.
- Database is not publicly exposed by default.
- Backup/restore controls are absent.

## Slice 16 — Environment And Secrets

Owner: Backend + Frontend.

Blocked by: Slice 12 and Slice 15.

What to build:

- App env var UI.
- Secret masking after save.
- Generated database env values.
- Redaction of known secrets in returned DTO/logs where feasible.

Acceptance criteria:

- User can add/update/delete env values.
- Saved secrets are never returned raw.
- Database attach creates visible masked env metadata.

## Slice 17 — Terminal MVP

Owner: Backend + Frontend.

Blocked by: Slice 12.

What to build:

- Scoped terminal UI.
- Backend terminal session gateway.
- Warning/confirmation before starting session.
- Auth enforcement on public/exposed runtime hosts.

Acceptance criteria:

- User can open a scoped terminal when permitted.
- Terminal clearly indicates scope.
- Terminal access is not available silently or by default.

## Slice 18 — GitHub Webhook Redeploy

Owner: Backend + Frontend.

Blocked by: Slice 6, Slice 8, Slice 12.

What to build:

- Validate GitHub webhook signatures before dedupe/state mutation.
- Match branch/repo to app.
- Fetch source and run verification/redeploy.
- Show deployment run and failure logs in app detail.

Acceptance criteria:

- Valid webhook can trigger redeploy for connected app.
- Invalid signature does not mutate delivery dedupe state.
- Failed redeploy leaves previous app state understandable and shows logs.

## Slice 19 — Final MVP Hardening

Owner: Lead + QA + Security + Specialists.

Blocked by: Slices 1-18.

What to build:

- End-to-end smoke from clean Docker host.
- Security review of daemon exposure, secrets, logs, terminal, webhooks, domains.
- UX review for beginner flow and failure copy.
- Docs update for actual behavior.

Acceptance criteria:

- MVP Done Definition in `docs/blueprint.md` passes.
- Known unsupported features are hidden or clearly deferred.
- README matches actual runnable behavior.
- Release blocker findings are routed to owners.
