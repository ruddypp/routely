# Routely Specialist Team Workflow

Status: Active
Owner: Routely Lead, PM
Last updated: 2026-06-22

## Source Of Truth

Use the new MVP blueprint docs as the canonical workflow source:

1. `docs/blueprint.md`
2. `docs/architecture.md`
3. `docs/frontend.md`
4. `docs/backend.md`
5. `docs/implementation-slices.md`
6. `docs/verification.md`

This file remains because `AGENTS.md` references it as the specialist coordination contract.

## Active Roles

- Routely Lead
- PM
- Backend
- Frontend
- UI/UX
- QA E2E
- Security

## Routing Contract

The user talks to Routely Lead. Lead keeps product direction aligned with the blueprint and routes implementation work by slice.

PM owns product docs, issue breakdowns, acceptance criteria, and slice sequencing. PM uses `grill-with-docs`, `to-prd`, and `to-issues` style outputs when new planning is needed, but the current MVP execution should start from `docs/implementation-slices.md`.

UI/UX owns dashboard experience, visual direction, copy, responsive behavior, and accessibility criteria. UI/UX should work from `docs/frontend.md` and must preserve the operations-dashboard model.

Frontend owns dashboard implementation, same-origin route consumption, UI states, and frontend tests. Frontend must read relevant Next.js docs under `node_modules/next/dist/docs/` before editing `apps/web`.

Backend owns server session, daemon/API, app registry, RuntimeOrchestrator, RecipeEngine, SourceProvider adapters, ProxyManager, DatabaseManager, ObservabilityCollector, LogsGateway, TerminalGateway, storage, and backend tests.

QA E2E validates user flows against `docs/verification.md` and reports findings to Lead. QA does not commit reports unless acting as Lead.

Security validates trust boundaries from `docs/architecture.md` and `docs/verification.md` and reports findings to Lead. Security does not commit reports unless acting as Lead.

## Commit And Push Contract

- Each role commits only owned files for the current slice after relevant checks pass.
- Preserve unrelated dirty worktree changes.
- Push after committing through SSH when remote access is available and the user requested push-on-change: `git@github.com:ruddypp/routely.git`.
- Do not attempt HTTPS push in agent sessions; switch `origin` to SSH first if needed.
- If checks fail for unrelated reasons or push fails, report exact commands and errors.
