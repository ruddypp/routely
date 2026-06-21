# Routely Agent Team Workflow

Status: Active pointer
Owner: Routely Lead, PM
Last updated: 2026-06-21

## Source Of Truth

Use `docs/02-team-execution-plan.md` as the canonical team workflow.

This file remains because `AGENTS.md` references it as the Maestro team coordination contract. Do not duplicate role rules here; update `docs/02-team-execution-plan.md` instead.

## Active Roles

- Routely Lead
- PM
- Backend
- Frontend
- UI/UX
- QA E2E
- Security

## Rule

All agents should read `docs/00-product-brief.md` through `docs/04-docs-map.md` first, then the relevant implementation reference docs for the task.

## Routing Contract

The user talks to Routely Lead. Lead instructs PM to produce plans, PRDs, acceptance criteria, and team assignments. For non-trivial planning, PM uses the installed Matt Pocock skills: `ask-matt` when the flow is unclear, `grill-with-docs` style self-interview before PRD synthesis, `to-prd` for the PRD, `to-issues` for vertical-slice execution issues, and `triage` for readiness/prioritization. PM routes product-experience work to UI/UX before implementation. UI/UX returns executable design criteria, then PM/Lead route implementation to Backend and Frontend.

After implementation, Lead sends work to QA E2E and Security. QA and Security report back to Lead only. Lead waits for both reports, summarizes them, and sends the coordinated finding set to PM. PM turns that summary into owner-specific bug instructions: frontend findings go to Frontend, backend findings go to Backend, and cross-cutting findings get explicit owner splits.

QA E2E and Security do not commit their own reports. Lead commits QA/Security reports when appropriate. PM, UI/UX, Frontend, and Backend commit their own owned changes after verification passes unless Lead or the user says otherwise.
