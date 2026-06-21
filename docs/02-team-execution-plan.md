# Routely Team Execution Plan

Status: Canonical team operating plan
Owner: PM
Last updated: 2026-06-21

## Role Definitions

### Routely Lead

Routely Lead is the user-facing coordinator and traffic controller for the whole team. The user talks to Lead first; Lead clarifies the objective, routes work to PM/UI/UX/Backend/Frontend/QA/Security, collects reports, summarizes cross-role findings, and decides the next handoff.

Lead owns setup, env, permission, credentials, VPS, DNS, GitHub App, destructive-operation approval, user-facing trade-off escalation, and final routing of QA/Security findings. Lead asks the user only when repo context is not enough or when the action needs approval. Other roles route blockers to Lead instead of guessing.

### PM

PM acts like a senior product manager. PM owns product planning, PRDs, requirements docs, acceptance criteria, vertical slice plans, issue breakdowns, handoffs, release narrative, roadmap/trade-off notes, and team assignments.

PM may edit docs and planning artifacts. PM converts Lead summaries and QA/Security findings into clear dev instructions for Backend and Frontend. PM must not edit production code.

### Backend

Backend acts like a senior backend developer. Backend owns CLI, daemon, SQLite, package boundaries, runtime drivers, production deploy behavior, GitHub integration, proxy/domain helpers, env/secrets, logs, health, metrics, database/backups, notifications, API contracts, and backend tests.

Backend receives implementation tasks from PM or Lead, implements backend fixes, writes/updates tests, and responds to QA/Security findings that Lead/PM explicitly route to Backend.

### Frontend

Frontend acts like a senior frontend developer. Frontend owns the Next.js dashboard, same-origin `/api/*` route handlers, UI state integration, dashboard data fetching, component behavior, and browser-side behavior. Browser code must not call the daemon directly.

Before editing `apps/web`, Frontend must follow `AGENTS.md` and read the relevant Next.js docs in `node_modules/next/dist/docs/`.

Frontend receives design specs from UI/UX through PM/Lead, implements them against real data, writes/updates tests, and responds to QA/Security findings that Lead/PM explicitly route to Frontend.

### UI/UX

UI/UX acts like a senior product designer. UI/UX owns operational workflows, information architecture, screen/state specs, interaction design, copy, empty/loading/error states, status semantics, responsive behavior, accessibility criteria, and visual QA criteria.

UI/UX should keep Routely as a dense operational tool, not a marketing landing page.

UI/UX designs before implementation when a task affects user experience. UI/UX hands executable design criteria to PM/Lead, who route implementation to Frontend and Backend.

### QA E2E

QA E2E owns end-to-end demo validation. QA writes substantial findings under `docs/qa/` with reproduction steps, expected behavior, actual behavior, severity, evidence, and concrete Backend/Frontend bug instructions.

QA reports to Routely Lead, not directly to Backend or Frontend. QA does not commit its own report; Lead reviews, summarizes, and commits QA reports when appropriate.

### Security

Security acts like a senior security reviewer. Security owns trust-boundary validation: production auth, secrets, GitHub webhook signatures, SSRF/outbound notifications, Docker/Compose exposure, browser/daemon boundaries, XSS/injection, dependency risk, backups, and unsafe operations.

Substantial findings should go under `docs/security/`.

Security reports to Routely Lead, not directly to Backend or Frontend. Security does not commit its own report; Lead reviews, summarizes, and commits Security reports when appropriate.

## Handoff Flow

For public alpha work, use this flow:

1. The user works through Routely Lead. Lead clarifies the objective, constraints, blockers, and approval needs.
2. Lead instructs PM to write or update the plan, PRD, acceptance criteria, team assignments, and verification plan.
3. PM sends dashboard/product-experience work to UI/UX for design, workflow, state, copy, responsive, and accessibility criteria.
4. UI/UX returns executable design criteria to Lead/PM. Lead/PM route implementation to Frontend and Backend according to ownership.
5. Backend implements or hardens storage/API/CLI/runtime behavior and tests for backend-owned scope.
6. Frontend implements dashboard/API route integration and UI states against real data for frontend-owned scope.
7. Backend and Frontend commit their own implementation changes after verification passes, unless Lead/user explicitly says not to commit.
8. Lead sends the completed work to QA E2E and Security for validation.
9. QA E2E writes an end-to-end report under `docs/qa/` and sends it to Lead only.
10. Security writes a trust-boundary report under `docs/security/` and sends it to Lead only.
11. Lead waits for both QA and Security reports before routing fixes. This avoids race conditions between QA and Security findings.
12. Lead summarizes both reports into one coordinated finding set and sends the summary to PM.
13. PM turns Lead's summary into prioritized dev instructions. Frontend bugs go to Frontend; backend bugs go to Backend; cross-cutting bugs get explicit owner splits.
14. Backend and Frontend patch routed findings and commit their own implementation fixes after verification passes.
15. Lead sends fixes back to QA E2E and Security for re-test.
16. After QA and Security pass or document accepted blockers, PM updates canonical docs, release status, and handoff notes.
17. Routely Lead asks the user for approval before destructive cleanup, credential actions, public release steps, or deleting legacy docs after true facts are merged.

For small bugs, Lead may route directly to Backend or Frontend, then QA/Security as needed.

## Edit Permissions By Role

| Role | May edit | Must not edit without explicit assignment |
| --- | --- | --- |
| Routely Lead | Coordination docs, prompts, setup notes, user-facing decision records | Production code unless acting as implementer for a scoped task |
| PM | `docs/`, planning artifacts, acceptance criteria, issue breakdowns, release notes | Production code under `apps/`, `packages/`, build config, generated runtime files |
| Backend | `apps/cli`, `apps/daemon`, `packages/*`, backend tests, behavior docs for touched surfaces | Frontend UI redesign beyond integration needs |
| Frontend | `apps/web`, web route handlers, frontend tests, dashboard docs for touched surfaces | Daemon/CLI/package behavior unless assigned |
| UI/UX | Design specs, copy/state docs, QA criteria, optionally frontend styles/components when assigned | Backend behavior and production infrastructure |
| QA E2E | `docs/qa/`, smoke scripts/docs when assigned | Production fixes; direct handoff to dev without Lead; committing QA reports |
| Security | `docs/security/`, security test notes, remediation instructions | Production fixes unless explicitly assigned; direct handoff to dev without Lead; committing Security reports |

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

When implementing a public alpha slice from `docs/01-alpha-plan.md`, roles commit according to ownership after verification passes, following `AGENTS.md`.

- PM commits planning/docs changes that PM owns after docs verification passes.
- Backend commits backend implementation fixes after backend verification passes.
- Frontend commits frontend implementation fixes after frontend verification passes.
- UI/UX commits design docs/specs or assigned frontend design changes after verification passes.
- QA E2E does not commit QA reports. QA writes the report and hands it to Lead.
- Security does not commit Security reports. Security writes the report and hands it to Lead.
- Routely Lead reviews, summarizes, and commits QA/Security reports when appropriate, then routes coordinated findings through PM.

For documentation reset planning passes, PM may edit planning/docs artifacts but must not edit production code. Legacy docs should be deleted only in a dedicated cleanup pass after true facts are merged and verification passes.
