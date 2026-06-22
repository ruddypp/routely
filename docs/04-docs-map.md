# Routely Docs Map

Status: Canonical docs reset map
Owner: PM
Last updated: 2026-06-22

## Reset Outcome

The legacy docs have been collapsed into a smaller source-of-truth set. Draft PRD/spec/roadmap/checkpoint docs and scattered feature specs were deleted after their durable facts were moved into canonical PM docs and replacement reference docs.

The 2026-06-22 Compose-first replan updates the source of truth around a dashboard-first solo-operator control plane: local plus one-VPS operation, Start All for enabled apps, per-app stop/disable, Compose-backed runtime direction, and Dokploy-inspired operational surfaces with 9Router-like simplicity.

## Canonical Docs Structure

New agents and contributors should read these files first:

1. `docs/00-product-brief.md` - product vision, target user, Compose-first positioning, MVP promise, non-goals.
2. `docs/01-alpha-plan.md` - public alpha objective, three demos, vertical slices, execution order, risks, deferred scope.
3. `docs/02-team-execution-plan.md` - role definitions, handoff flow, edit permissions, escalation, verification.
4. `docs/03-demo-acceptance-plan.md` - exact demo acceptance criteria, smoke steps, automated checks, QA/Security checklists, release gate.
5. `docs/04-docs-map.md` - this map, legacy disposition, and future reading order.

Implementation references:

- `README.md` for public user quickstarts and limitations.
- `CONTEXT.md` for stable domain glossary.
- `docs/05-architecture.md` for technical shape and ownership.
- `docs/06-interfaces.md` for CLI, API, config, and data-model surface.
- `docs/07-security-and-risks.md` for trust boundaries and risk register.
- `docs/08-development-setup.md` for contributor setup.
- `docs/09-current-status.md` for current implementation status.
- `docs/10-implementation-backlog.md` for implementation slices.
- `docs/11-feature-scope.md` for feature-area alpha scope and deferred scope.
- `docs/12-prd.md` for canonical product requirements.
- `docs/13-end-to-end-execution-plan.md` for the role-by-role execution plan derived from the latest user direction.
- `docs/adr/*` for accepted architecture decisions.
- `docs/agents/*` for agent workflow support docs referenced by `AGENTS.md`.

## Files Created Or Rewritten In This Pass

| File | Purpose |
| --- | --- |
| `docs/00-product-brief.md` | Canonical product brief for Routely's Compose-first direction. |
| `docs/01-alpha-plan.md` | Canonical public alpha plan centered on the three demos. |
| `docs/02-team-execution-plan.md` | Canonical team execution plan for PM, Backend, Frontend, UI/UX, QA E2E, Security, and Routely Lead. |
| `docs/03-demo-acceptance-plan.md` | Canonical demo acceptance and release-readiness gate. |
| `docs/04-docs-map.md` | Canonical docs audit, structure, and legacy disposition map. |
| `docs/README.md` | Canonical docs index updated to the final read-first order. |
| `docs/05-architecture.md` | Replacement technical reference. |
| `docs/06-interfaces.md` | Replacement CLI/API/config/data reference. |
| `docs/07-security-and-risks.md` | Replacement security and risk reference. |
| `docs/08-development-setup.md` | Replacement contributor setup guide. |
| `docs/09-current-status.md` | Replacement current implementation status. |
| `docs/10-implementation-backlog.md` | Replacement implementation backlog keyed to the Compose-first alpha plan. |
| `docs/11-feature-scope.md` | Replacement consolidated feature scope. |
| `docs/12-prd.md` | Canonical product requirements document. |
| `docs/13-end-to-end-execution-plan.md` | PM execution plan for role-by-role delivery of the local-to-VPS Routely direction. |

## Legacy Disposition Table

User decision on 2026-06-21: use `docs/01-alpha-plan.md` as the execution source and delete obsolete legacy docs after preserving durable facts. Do not archive.

| File or folder | Disposition | Reason / next action |
| --- | --- | --- |
| `README.md` | Rewrite | Keep as public entry point. Reconcile to the three alpha demos after demo commands are verified. |
| `AGENTS.md` | Keep | Repo-level agent rules, Next.js warning, auto-commit rules, and Maestro references remain active. Update only if workflow changes. |
| `CONTEXT.md` | Keep | Stable glossary location. Add only implementation-independent domain terms. |
| `docs/README.md` | Rewrite | Replace old index with canonical reading order and links to the five new docs. |
| `docs/01-prd.md` | Deleted | Replaced by `docs/00-product-brief.md`. |
| `docs/02-technical-architecture.md` | Deleted | Replaced by `docs/05-architecture.md`. |
| `docs/03-functional-specification.md` | Deleted | Replaced by `docs/03-demo-acceptance-plan.md`, `docs/10-implementation-backlog.md`, and `docs/11-feature-scope.md`. |
| `docs/04-user-flows.md` | Deleted | Demo-critical flows moved into `docs/03-demo-acceptance-plan.md` and `docs/06-interfaces.md`. |
| `docs/05-cli-spec.md` | Deleted | Replaced by `docs/06-interfaces.md`. |
| `docs/06-api-spec.md` | Deleted | Replaced by `docs/06-interfaces.md`. |
| `docs/07-config-spec.md` | Deleted | Replaced by `docs/06-interfaces.md`. |
| `docs/08-data-model.md` | Deleted | Replaced by `docs/06-interfaces.md` and Backend-owned schema. |
| `docs/09-security-model.md` | Deleted | Replaced by `docs/07-security-and-risks.md`. |
| `docs/10-mvp-roadmap.md` | Deleted | Replaced by `docs/01-alpha-plan.md` and `docs/10-implementation-backlog.md`. |
| `docs/11-risks-and-tradeoffs.md` | Deleted | Replaced by `docs/07-security-and-risks.md`. |
| `docs/12-development-setup.md` | Deleted | Replaced by `docs/08-development-setup.md`. |
| `docs/13-current-setup-status.md` | Deleted | Replaced by `docs/09-current-status.md`. |
| `docs/14-implementation-plan.md` | Deleted | Replaced by `docs/10-implementation-backlog.md`; `docs/01-alpha-plan.md` remains the execution source. |
| `docs/15-public-alpha-demo-hardening-plan.md` | Deleted | Superseded by `docs/01-alpha-plan.md` and `docs/03-demo-acceptance-plan.md`. |
| `docs/17-ui-redesign-agent-prompt.md` | Deleted | Historical frontend prompt superseded by canonical alpha/team docs and UI/UX role ownership. |
| `docs/HANDOFF.md` | Deleted | Historical checkpoint handoff superseded by canonical docs and current setup status. |
| `docs/NEXT_AGENT_PROMPT.md` | Deleted | Historical next-agent prompt no longer guides the new team. |
| `docs/AGENT_EXECUTION_CONTEXT.md` | Deleted | Historical checkpoint context superseded by canonical docs and current setup status. |
| `docs/feature-specs/*` | Deleted | Replaced by consolidated `docs/11-feature-scope.md`. |
| `docs/adr/*` | Keep | Accepted ADRs remain valid: Docker runtime, Traefik-compatible proxy, GitHub App, SQLite single-node state. |
| `docs/agents/domain.md` | Keep | Agent workflow support doc. Keep unless team workflow moves elsewhere. |
| `docs/agents/issue-tracker.md` | Keep | GitHub issue tracker rules remain active. |
| `docs/agents/maestro-setup.md` | Keep | Maestro setup reference. Not product docs, but useful for team operations. |
| `docs/agents/pm-kickoff-routely-product-brief.md` | Deleted | Kickoff facts are merged into canonical docs. |
| `docs/agents/team-workflow.md` | Merge | Merged into `docs/02-team-execution-plan.md`; keep temporarily for Maestro contract compatibility. |
| `docs/agents/triage-labels.md` | Keep | Triage label vocabulary remains active. |
| `docs/qa/*` | Reset | Historical QA screenshots and audits were deleted. New reports start at `docs/qa/README.md`. |
| `docs/security/` | Created | New security report home starts at `docs/security/README.md`. |

## Deleted Legacy Docs

User approval was given to delete, not archive, obsolete prompt/handoff docs after useful facts were merged into canonical docs. Deleted files:

- `docs/HANDOFF.md`
- `docs/NEXT_AGENT_PROMPT.md`
- `docs/AGENT_EXECUTION_CONTEXT.md`
- `docs/15-public-alpha-demo-hardening-plan.md`
- `docs/17-ui-redesign-agent-prompt.md`
- `docs/agents/pm-kickoff-routely-product-brief.md`

No archive path is needed because the user explicitly chose deletion over archival.

## Remaining Docs Work

1. Rewrite root `README.md` around the verified local, one-VPS, and GitHub demos after QA confirms exact commands.
2. Add `docs/security/` findings after Security completes the public alpha review.
3. Add fresh `docs/qa/` reports after QA validates local, VPS, GitHub, and responsive dashboard demos.
4. Keep `docs/agents/*` only for active workflow contracts referenced by `AGENTS.md`.

## Team Assignments After Docs Reset

- Routely Lead: coordinate any destructive docs cleanup pass and resolve setup/env/VPS/GitHub/DNS blockers.
- PM: maintain the canonical docs, rewrite README/docs index, and keep acceptance criteria current.
- Backend: verify CLI, daemon, package, database, deploy, GitHub, domain, env, logs, backups, notification facts before docs claim public behavior.
- Frontend: verify dashboard route names, same-origin API behavior, and real-data-backed demo-critical views before README screenshots or user docs ship.
- UI/UX: define operational copy and state language for Start All, per-app stop/disable, one-VPS operations, GitHub, failure, and deferred states.
- QA E2E: create dated smoke reports for the local, one-VPS, GitHub, and responsive dashboard demos under `docs/qa/`.
- Security: create public alpha trust-boundary review under `docs/security/` and update security docs with verified findings.

## Future Agents: Read Order

For product/planning work:

1. `docs/00-product-brief.md`
2. `docs/01-alpha-plan.md`
3. `docs/02-team-execution-plan.md`
4. `docs/03-demo-acceptance-plan.md`
5. `docs/04-docs-map.md`

For implementation work, also read:

1. `AGENTS.md`
2. `CONTEXT.md`
3. `README.md`
4. `docs/09-current-status.md`
5. `docs/13-end-to-end-execution-plan.md` when planning or launching role work.
6. The relevant architecture/interface/security/feature-scope docs.
7. Relevant code before editing.

For web work, also read the relevant Next.js docs under `node_modules/next/dist/docs/` before editing `apps/web`, as required by `AGENTS.md`.

## Resolved Decisions

1. Legacy prompt/handoff docs should be deleted after true facts are merged. Do not archive them.
2. `docs/01-alpha-plan.md` is the public alpha execution source.
3. Public alpha targets solo developers only; shared administration workflows remain out of scope.
4. Local and one-VPS flows should converge on a Compose-backed model, but public docs must name only verified behavior.
5. No archive path is needed.
