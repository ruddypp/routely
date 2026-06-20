# Routely Frontend Redesign Plan And Agent Prompt

Version: 0.2  
Status: Current frontend priority  
Scope: Full dashboard UI/UX redesign  

## 1. Purpose

This document is the single source of truth for the current Routely frontend checkpoint.

The immediate priority is a deep dashboard redesign. Do not treat this as a visual polish pass. The current UI must be reworked into a product shell that clearly communicates Routely's concept:

```text
9Router-like operation:
  one command, one daemon/server, one always-on local control plane.

Dokploy-like production management:
  deployments, domains, HTTPS, GitHub, Docker, databases, backups, logs, metrics, notifications, and server readiness.
```

Routely should feel like a compact app command center for solo developers who run many apps locally and deploy them to one VPS.

## 2. Current Product Understanding

Routely is an open source local-to-production app orchestrator for solo developers.

The product promise:

```text
Run `routely` locally or on a VPS.
All registered apps, services, proxy routes, logs, metrics, and deployments become manageable from one place.
```

The frontend must immediately make this visible:

- local apps are first-class;
- production operations are available but not visually confused with local mode;
- every module is an operational workflow, not a marketing section;
- status, next action, and failure reason should be easy to scan;
- routine controls must be small, calm, and comfortable.

## 3. Required Skill Stack

Before implementation, the agent must use the relevant skills:

- `frontend-design`: design read, visual direction, taste checks, anti-generic UI judgment.
- `ckm:design-system`: primitive/semantic/component tokens, component state definitions, buttons, badges, forms, panels, row systems.
- `playwright`: browser automation, responsive screenshots, interaction QA.
- `playwright-interactive`: optional for persistent browser debugging.
- `screenshot`: fallback for OS-level capture only.

Optional Figma skills are installed for future work, but should only be used if a Figma file or Figma MCP context exists. Do not force a Figma workflow into this code-first redesign.

Do not use `design-taste-frontend`. That skill is for landing pages, portfolios, and marketing redesigns. Routely is a dense operational product dashboard.

## 4. Required Reading

Read these files before editing:

1. `AGENTS.md`
2. `README.md`
3. `DESIGN.md`
4. `docs/01-prd.md`
5. `docs/02-technical-architecture.md`
6. `docs/03-functional-specification.md`
7. `docs/04-user-flows.md`
8. `docs/13-current-setup-status.md`
9. `docs/14-implementation-plan.md`
10. `docs/17-ui-redesign-agent-prompt.md`
11. `apps/web/src/app/dashboard-client.tsx`
12. `apps/web/src/app/globals.css`
13. `apps/web/src/app/layout.tsx`
14. `apps/web/src/lib/daemon.ts`
15. Relevant `apps/web/src/app/api/*` route handlers for any workflow touched.

Before editing `apps/web`, read the relevant Next.js docs in `node_modules/next/dist/docs/`. This repository explicitly warns that this Next.js version may differ from assumptions.

## 5. External References

Use these as product references, not copy targets:

- 9Router: `https://github.com/decolua/9router`
- 9Router architecture model: local Next.js gateway, dashboard, one command, one local endpoint, local persisted state.
- Dokploy: `https://github.com/Dokploy/dokploy`
- Dokploy docs: `https://docs.dokploy.com/`

Interpretation:

- From 9Router, borrow the command-center feeling: compact, local-first, fast, left navigation, live status, endpoint/process mental model, one always-running service.
- From Dokploy, borrow the production operating model: deploy status, domains, GitHub, Docker, databases, backups, logs, monitoring, server readiness, dense resource rows, operational workflows.
- Do not mechanically clone either product. Routely needs its own identity: local-to-production app orchestration.

## 6. Current UI Problems

The current dashboard has useful backend/API coverage, but needs a full product-shell redesign:

- `apps/web/src/app/dashboard-client.tsx` is too large and mixes data fetching, layout, forms, rows, modules, inspectors, and utility functions in one file.
- The visual system is currently Spotify-inspired, but Routely needs a stronger 9Router + Dokploy operational identity.
- Existing modules are functional but the hierarchy does not yet feel like an app orchestration cockpit.
- Buttons and routine actions need to be smaller, more consistent, and more comfortable.
- Button text must not be large and must not wrap.
- The dashboard should make local/server mode, daemon state, workspace, and production readiness visible at all times.
- Production workflows should feel connected: deploy -> domain -> health -> logs -> GitHub -> backup/notify.
- Empty/loading/error states need to be deliberate and actionable.
- Mobile must be usable, not just compressed desktop.

## 7. Design Read

Reading this as: a developer operations dashboard for solo developers, with a 9Router-like local command center and Dokploy-like VPS operations language, leaning toward a compact dark product shell with precise status density, small controls, and one functional green accent.

Design dials:

```text
Visual density: 8/10
Motion intensity: 3/10
Visual variance: 5/10
```

This is a daily tool. Prefer speed, scanability, clear hierarchy, and reliable controls over decorative impact.

## 8. Visual System

### 8.1 Mood

The UI should feel like:

- local daemon control panel;
- app launcher for many projects;
- deployment operations cockpit;
- compact server switchboard;
- self-hosted PaaS for one person running many apps.

It should not feel like:

- a marketing landing page;
- a generic SaaS analytics dashboard;
- a decorative AI dashboard;
- a giant-card bento layout;
- a Spotify clone.

### 8.2 Palette

Use a dark operational palette. Suggested tokens:

```text
base-950:       #090b0a  page background
base-900:       #0d100f  app shell background
base-850:       #121614  primary panel surface
base-800:       #171c19  raised surface
base-700:       #202821  selected/hover surface
line-subtle:    #263029  hairline dividers
line-strong:    #354238  active borders
text-primary:   #f4f7f3
text-secondary: #aeb8ae
text-muted:     #6f7b71
accent:         #27d86f  primary functional green
accent-soft:    rgba(39, 216, 111, 0.13)
info:           #64a8ff
warning:        #f6b24b
danger:         #ff6b7d
```

Rules:

- Green is functional only: running, healthy, connected, primary action, active nav.
- Blue is information/in-progress.
- Orange is warning/pending.
- Red is failure/destructive.
- Avoid purple gradients, beige palettes, decorative blobs, glassmorphism, and saturated multi-color backgrounds.

### 8.3 Typography

Use compact, stable UI typography. Existing Geist and Geist Mono are acceptable.

Scale:

```text
Page title:       20px-24px, 700
Section title:    15px-18px, 700
Row title:        13px-14px, 650/700
Body:             12px-14px, 400/500
Meta/data:        11px-12px, mono or regular
Badge:            10px-11px, 650/700
Button text:      11px-13px, 650/700
```

Rules:

- Button text must not be oversized. Default button text should be `12px` or `13px`.
- Avoid huge panel headings.
- Avoid uppercase everywhere. Use uppercase only for micro labels/status when useful.
- Use monospace for command, path, port, SHA, URL, and log content.

### 8.4 Geometry And Controls

Controls must be compact:

```text
Icon buttons:     28px-32px
Small buttons:    28px-32px height
Normal buttons:   32px-36px height
Inputs/selects:   34px-38px height
Panel radius:     6px-8px
Badge radius:     pill
```

Rules:

- Do not use large pill buttons for routine actions.
- Routine actions should be short: `Start`, `Stop`, `Restart`, `Open`, `Logs`, `Deploy`, `Save`, `Verify`.
- Use icon buttons for obvious repeated actions, with accessible label/title.
- Button labels must fit on one line at desktop and mobile.
- Hover/active states must not move layout.

### 8.5 Motion

Use motion sparingly:

- 120ms-180ms transitions;
- active press state via `translateY(1px)` or small scale;
- skeletons shaped like final UI;
- no decorative ambient animation;
- respect `prefers-reduced-motion`.

## 9. Information Architecture

Desktop shell target:

```text
+--------------------------------------------------------------------------------+
| Top status bar: workspace, daemon, mode, refresh, command hint                  |
+------------+------------------------------+------------------------------------+
| Sidebar    | Primary module content        | Context inspector / live detail     |
|            |                              |                                    |
| Control    | Resource list / workflow      | Selected app, logs, health, env     |
| Deploy     |                              |                                    |
| Data       |                              |                                    |
| System     |                              |                                    |
+------------+------------------------------+------------------------------------+
```

Mobile shell target:

```text
+--------------------------------+
| Compact top status             |
+--------------------------------+
| Module content                 |
| Selected detail as tabs/drawer |
+--------------------------------+
| Bottom module rail             |
+--------------------------------+
```

Navigation groups:

```text
Control
  Overview
  Apps
  Logs
  Health
  Metrics

Deploy
  Deployments
  Domains
  GitHub
  Env

Data
  Databases
  Backups

System
  Settings
```

## 10. Module Requirements

### 10.1 Overview

Overview is a command center, not a welcome screen.

Show:

- daemon connection;
- workspace root;
- server mode: local/production;
- app counts: running/stopped/crashed/disabled;
- latest deployment state;
- domain/proxy readiness;
- GitHub webhook state;
- database/backup state;
- urgent next actions.

Do not put full workflows in Overview. Overview links to modules.

### 10.2 Apps

Apps is the local-first core.

Resource rows must show:

- app name/type;
- driver/preset;
- path/port/domain;
- status;
- pending restart/redeploy;
- row-local actions.

Selected app inspector tabs:

- Overview
- Runtime
- Env
- Logs
- Health
- Deployments
- Domains

### 10.3 Deployments

Show:

- latest deployment per app;
- status and phase;
- source/repo/branch/commit where available;
- image/container metadata;
- host/container port;
- log action;
- clear failed state with exact message.

### 10.4 Domains

Make the readiness chain visible:

```text
root domain -> hostname -> DNS verification -> proxy route -> HTTPS/TLS state -> app target
```

The user should know why a hostname is not ready.

### 10.5 GitHub

Show:

- GitHub App configured/missing;
- webhook secret/signature state;
- connected repositories;
- selected branch;
- auto-deploy flag;
- recent deliveries.

### 10.6 Env

Show stored env variables with:

- key;
- masked secret display;
- scope;
- restart/redeploy pending state;
- compact set/unset controls.

Never expose raw secret values after save.

### 10.7 Logs

Use a terminal-like surface:

- monospace;
- compact line-height;
- stable scroll area;
- selected app/deployment source;
- refresh/follow affordance if available.

### 10.8 Health And Metrics

Keep scanning-first:

- status summary;
- latest check;
- response time;
- CPU/RAM/disk/network samples;
- no fake charts without real data.

### 10.9 Databases And Backups

Show operational resource state:

- database type/image;
- internal/public state;
- compose service;
- volume;
- backup schedule;
- retention;
- last run;
- run/toggle actions.

### 10.10 Settings

Keep settings functional:

- notifications;
- server readiness/auth state where relevant;
- disabled future capabilities must be inert and clearly marked.

## 11. Component Architecture

Refactor `apps/web/src/app/dashboard-client.tsx` into smaller components.

Recommended structure:

```text
apps/web/src/app/
  dashboard-client.tsx              # orchestration/data wiring only
  globals.css

apps/web/src/components/ui/
  button.tsx
  badge.tsx
  field.tsx
  select.tsx
  switch.tsx
  panel.tsx
  table-list.tsx
  empty-state.tsx
  alert.tsx
  skeleton.tsx
  status-dot.tsx

apps/web/src/components/dashboard/
  shell.tsx
  sidebar.tsx
  top-status-bar.tsx
  mobile-nav.tsx
  module-header.tsx
  overview-module.tsx
  apps-module.tsx
  deployments-module.tsx
  domains-module.tsx
  github-module.tsx
  env-module.tsx
  logs-module.tsx
  health-module.tsx
  metrics-module.tsx
  databases-module.tsx
  backups-module.tsx
  settings-module.tsx
  app-inspector.tsx
  app-form.tsx
  types.ts
  utils.ts
```

Rules:

- Keep browser requests same-origin through `/api/*`.
- Do not call daemon directly from browser code.
- Do not remove working actions during refactor.
- Keep props typed.
- Keep components deterministic and testable.

## 12. UI Primitive Requirements

### 12.1 Button

Variants:

- `primary`: green; one dominant action per local area.
- `secondary`: raised dark surface.
- `ghost`: utility action.
- `danger`: destructive.
- `icon`: compact icon-only action.

Sizes:

- `xs`: 28px height, 11px text.
- `sm`: 32px height, 12px text.
- `md`: 36px height, 13px text.

Default size: `sm`.

### 12.2 Badge And Status

Status mapping:

```text
running/succeeded/healthy/ready -> green
queued/starting/preparing/building/issuing -> blue or orange
pending/stopped/unknown -> muted/orange
failed/crashed/error/unhealthy -> red
disabled -> muted
```

### 12.3 Rows

Resource rows are the core repeated pattern:

- left: identity and primary metadata;
- middle: status, port/domain/source data;
- right: compact actions;
- selected state is obvious;
- hover does not shift layout.

### 12.4 Forms

- Label above input.
- Helper/error below input.
- No placeholder-only labels.
- Inputs 34px-38px tall.
- Submit labels short.
- Inline errors where possible.

## 13. Implementation Checkpoints

### UI-0: Audit And Baseline

- Read all required docs and code.
- Run or inspect the dashboard.
- Capture baseline desktop/tablet/mobile screenshots if practical.
- List current navigation, module, button, text, and responsive issues before editing.

Exit criteria:

- Agent understands current structure and risks.
- Baseline screenshots or reason they could not be captured are documented.

### UI-1: Tokens And Primitives

- Replace the Spotify-like theme with Routely operational tokens.
- Add/replace reusable UI primitives.
- Implement compact button variants and states.
- Replace repeated local button/badge/input styles where practical.

Exit criteria:

- Buttons are compact and consistent.
- Button text is not oversized.
- Focus, hover, disabled, loading, and active states exist.

### UI-2: Shell And Navigation

- Build desktop shell with grouped sidebar and top status bar.
- Build mobile shell with compact top status and bottom module rail.
- Make daemon, workspace, mode, and refresh state visible.

Exit criteria:

- First viewport reads as a live Routely control plane.
- Navigation exposes all modules without overflow.

### UI-3: Overview And Apps

- Rebuild Overview as command center.
- Rebuild Apps as dense local-first resource list.
- Rebuild app inspector tabs.
- Preserve lifecycle/log/deploy/env/health/domain actions.

Exit criteria:

- User can understand fleet state within 5 seconds.
- User can operate local apps without hunting through the UI.

### UI-4: Production Modules

- Rebuild Deployments, Domains, GitHub, Env, Logs, Health, Metrics.
- Make dependency chains and failure reasons clear.
- Make logs readable and terminal-like.

Exit criteria:

- Production operations feel dense, clear, and backed by real data.
- Domain readiness chain is understandable.

### UI-5: Data And Settings

- Rebuild Databases and Backups.
- Rebuild Settings/Notifications.
- Keep schedule, retention, last-run, and delivery attempts visible.

Exit criteria:

- Data/backup/notification workflows are understandable without crowding Overview.

### UI-6: Responsive And Accessibility QA

- Test 375x812, 768x1024, 1280x800, 1440x900.
- Check no overlapping text or controls.
- Check no button text wraps awkwardly.
- Check focus-visible states.
- Check loading, empty, error, disabled, offline, and connected states.
- Save useful screenshots under `docs/qa/`.

Exit criteria:

- Mobile/tablet/desktop are usable.
- Button and text sizing is comfortable.

### UI-7: Verification And Commit

Run:

```bash
npm run lint
npm run test --workspace apps/web
npx tsc --noEmit --project apps/web/tsconfig.json
npm run build --workspace apps/web
```

If a command cannot run or fails for unrelated/pre-existing reasons, document it clearly.

Exit criteria:

- Checks pass or blockers are documented.
- Docs are updated if behavior or structure changed.
- Commit only frontend redesign files with a concise message such as `feat: redesign dashboard shell`.

## 14. Non-Negotiable UX Rules

- No generic SaaS landing page.
- No oversized hero.
- No huge routine buttons.
- Button text should usually be 11px-13px.
- Button height should usually be 28px-36px.
- Button labels must fit on one line.
- Use icons for repeated utilities when practical.
- Visible text must not overlap on mobile/tablet/desktop.
- Do not use nested cards as the main layout pattern.
- Preserve same-origin `/api/*` browser access.
- Do not remove existing backend-backed workflows.
- Do not fake unimplemented production capabilities.

## 15. After The UI Redesign

After this redesign is complete, the next product priorities should be:

1. Fresh VPS install flow: make installing Routely on a new VPS clean and repeatable.
2. Real proxy runtime validation: ensure Traefik config is applied and HTTPS works end to end.
3. GitHub private repo deployment: finish practical install/repo/branch flow for private repos.
4. Production example: document and test Next.js + PostgreSQL + domain + HTTPS + push-to-deploy.
5. Rollback/restore slice: minimal rollback to last successful deploy and restore for backups.
6. Public alpha docs: install, local runner, VPS deploy, GitHub, domain, backup, troubleshooting.

## 16. Copy-Paste Agent Prompt

Use this prompt to execute the redesign:

```text
You are working in /home/ruddypp/Documents/work/routely.

Execute docs/17-ui-redesign-agent-prompt.md completely. This is the current frontend priority.

Use `frontend-design` for visual direction and taste, `ckm:design-system` for tokens/primitives/component states, and `playwright` for browser QA and responsive screenshots. Use `screenshot` only as fallback. Do not use `design-taste-frontend`; Routely is a dense operational product dashboard, not a landing page.

Read AGENTS.md, README.md, DESIGN.md, docs/01-prd.md, docs/02-technical-architecture.md, docs/03-functional-specification.md, docs/04-user-flows.md, docs/13-current-setup-status.md, docs/14-implementation-plan.md, docs/17-ui-redesign-agent-prompt.md, apps/web/src/app/dashboard-client.tsx, apps/web/src/app/globals.css, apps/web/src/app/layout.tsx, apps/web/src/lib/daemon.ts, and relevant apps/web/src/app/api/* route handlers before editing.

Before editing apps/web, read relevant Next.js docs in node_modules/next/dist/docs/ because this repo warns that this is not the Next.js you know.

Redesign Routely as a 9Router-like always-on local app command center mixed with Dokploy-like single-VPS operations. This is not a theme pass. Refactor the current massive dashboard-client.tsx into maintainable components, create compact UI primitives, rebuild the shell/navigation, rebuild Overview/Apps, rebuild Deployments/Domains/GitHub/Env/Logs/Health/Metrics, rebuild Databases/Backups/Settings, preserve all existing /api-backed workflows, keep buttons compact with 11px-13px text and 28px-36px height, avoid giant cards and generic SaaS layout, verify mobile/tablet/desktop with Playwright screenshots, run lint/test/typecheck/build, update docs, and commit only related frontend redesign files.

Final response must summarize changed files, verification results, screenshots/QA artifacts, and remaining gaps.
```

