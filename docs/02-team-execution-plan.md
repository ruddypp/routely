# Routely Team Execution Plan

Status: Canonical team operating plan
Owner: PM
Last updated: 2026-06-21

## Role Definitions

### Routely Lead

Routely Lead is the user-facing coordinator. Lead owns setup, env, permission, credentials, VPS, DNS, GitHub App, destructive-operation approval, and unclear product trade-off escalation.

Lead asks the user only when repo context is not enough. Other roles should route blockers to Lead instead of guessing.

### PM

PM owns product planning, documentation, acceptance criteria, issue breakdown, handoffs, release narrative, and team assignments.

PM may edit docs and planning artifacts. PM must not edit production code.

### Backend

Backend owns CLI, daemon, SQLite, package boundaries, runtime drivers, production deploy behavior, GitHub integration, proxy/domain helpers, env/secrets, logs, health, metrics, database/backups, notifications, API contracts, and backend tests.

### Frontend

Frontend owns the Next.js dashboard, same-origin `/api/*` route handlers, UI state integration, dashboard data fetching, and browser-side behavior. Browser code must not call the daemon directly.

Before editing `apps/web`, Frontend must follow `AGENTS.md` and read the relevant Next.js docs in `node_modules/next/dist/docs/`.

### UI/UX

UI/UX owns operational workflows, copy, empty/loading/error states, status semantics, responsive behavior, accessibility criteria, visual QA criteria, and dashboard information architecture.

UI/UX should keep Routely as a dense operational tool, not a marketing landing page.

### QA E2E

QA E2E owns end-to-end demo validation. QA writes substantial findings under `docs/qa/` with reproduction steps, expected behavior, actual behavior, severity, evidence, and concrete Backend/Frontend bug instructions.

### Security

Security owns trust-boundary validation: production auth, secrets, GitHub webhook signatures, SSRF/outbound notifications, Docker/Compose exposure, browser/daemon boundaries, XSS/injection, dependency risk, backups, and unsafe operations.

Substantial findings should go under `docs/security/`.

## Handoff Flow

For public alpha work, use this flow:

1. Routely Lead clarifies user constraints and routes scope to PM.
2. PM writes the vertical slice, acceptance criteria, team assignments, and verification plan.
3. UI/UX defines workflow/copy/state criteria for dashboard-facing work.
4. Backend implements or hardens storage/API/CLI/runtime behavior and tests.
5. Frontend implements dashboard/API route integration and UI states against real data.
6. QA E2E runs the demo smoke and writes bug instructions.
7. Security audits trust boundaries and writes remediation instructions.
8. Backend and Frontend patch findings.
9. QA E2E and Security re-test.
10. PM updates canonical docs, release status, and handoff notes.
11. Routely Lead asks the user for approval before destructive cleanup, credential actions, or public release steps. Legacy docs identified in `docs/04-docs-map.md` have user approval for deletion after true facts are merged.

For small bugs, Lead may route directly to Backend or Frontend, then QA/Security as needed.

## Edit Permissions By Role

| Role | May edit | Must not edit without explicit assignment |
| --- | --- | --- |
| Routely Lead | Coordination docs, prompts, setup notes, user-facing decision records | Production code unless acting as implementer for a scoped task |
| PM | `docs/`, planning artifacts, acceptance criteria, issue breakdowns, release notes | Production code under `apps/`, `packages/`, build config, generated runtime files |
| Backend | `apps/cli`, `apps/daemon`, `packages/*`, backend tests, behavior docs for touched surfaces | Frontend UI redesign beyond integration needs |
| Frontend | `apps/web`, web route handlers, frontend tests, dashboard docs for touched surfaces | Daemon/CLI/package behavior unless assigned |
| UI/UX | Design specs, copy/state docs, QA criteria, optionally frontend styles/components when assigned | Backend behavior and production infrastructure |
| QA E2E | `docs/qa/`, smoke scripts/docs when assigned | Large product fixes unless explicitly asked |
| Security | `docs/security/`, security test notes, remediation instructions, narrow security fixes when assigned | Broad feature implementation unless explicitly asked |

All roles must preserve unrelated worktree changes. Do not use destructive git commands. Do not delete legacy docs until their true facts have been merged into the canonical docs or current status docs. The user has approved deletion, not archival, for legacy prompt/handoff docs once that merge is complete.

## Escalation Rules

Escalate to Routely Lead for:

- VPS provider, SSH access, firewall access, DNS provider access, domain ownership, GitHub App ownership, repository access, credentials, tokens, and webhook secrets.
- Product decisions that expand beyond the three public alpha demos.
- Destructive operations, legacy-doc deletion cleanup, public release steps, or dependency upgrades with broad risk.
- Mismatches where docs promise behavior that implementation cannot support for public alpha.
- Environment failures that block verification and cannot be reproduced locally.

PM can decide docs scope and acceptance criteria. Routely Lead decides user-facing trade-offs and asks the user when needed.

## Verification Rules

Minimum verification by work type:

| Work type | Required verification |
| --- | --- |
| Docs only | `git diff --check`; file existence check; targeted `rg` for legacy/confusing terms in new docs. |
| CLI/backend/shared package change | `npm run lint`; relevant workspace tests such as `npm run test --workspace apps/cli`; build or syntax checks for touched runtime. |
| Daemon change | `node --check apps/daemon/src/server.js`; relevant daemon/API tests; auth/security smoke where production paths are touched. |
| Web/dashboard change | Read relevant Next.js docs first; `npm run lint`; `npm run test --workspace apps/web`; `npx tsc --noEmit --project apps/web/tsconfig.json`; Playwright smoke/screenshots where UI behavior changes. |
| Broad behavior change | `npm run build --workspaces --if-present` when practical, plus manual smoke for affected demo path. |

If a required check cannot run or fails for an unrelated reason, document the exact command and reason in the final handoff. Do not hide failed verification.

## Commit Rules

When implementing a public alpha slice from `docs/01-alpha-plan.md`, finish with a git commit after verification passes, following `AGENTS.md`.

For documentation reset planning passes, PM may edit planning/docs artifacts but must not edit production code. Legacy docs should be deleted only in a dedicated cleanup pass after true facts are merged and verification passes.
