# Lead Phase 01: Execution Kickoff Guardrails

Playbook type: task-based. Each checkbox is self-contained and can run in a fresh agent context.

- [ ] Routely Lead: inspect `AGENTS.md`, `docs/00-product-brief.md`, `docs/01-alpha-plan.md`, `docs/02-team-execution-plan.md`, `docs/03-demo-acceptance-plan.md`, `docs/04-docs-map.md`, `docs/13-end-to-end-execution-plan.md`, and every file in `.maestro/playbooks/2026-06-22-Routely-End-To-End-Execution/`. Confirm the playbook launches in dependency order: PM, UI/UX, Backend, Frontend, QA, Security, then Lead closeout. Confirm QA and Security write reports only and do not commit reports. Confirm Frontend must read relevant Next.js docs under `node_modules/next/dist/docs/` before touching `apps/web`. Confirm all roles preserve unrelated dirty worktree changes and commit only their own task files after verification. If a blocker exists, update this file with a concise plain-text blocker note and do not launch downstream roles.
