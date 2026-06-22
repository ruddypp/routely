# Routely End-To-End Execution: Launch Manifest

Playbook type: task-based. Each checkbox is self-contained and can run in a fresh agent context.

Source plan: `docs/13-end-to-end-execution-plan.md`.

Launch order:

1. `LEAD-01.md`
2. `PM-01.md`
3. `UIUX-01.md`
4. `BACKEND-01.md`
5. `FRONTEND-01.md`
6. `QA-01.md`
7. `SECURITY-01.md`
8. `LEAD-02.md`

Guardrails:

- Preserve unrelated dirty worktree changes.
- Commit only files owned by the current task after verification passes, except QA and Security reports which are committed by Lead when appropriate.
- Keep all implementation tied to the three public alpha demos in `docs/01-alpha-plan.md`.
- Do not show fake success for DNS, proxy, HTTPS, deploys, health, backups, notifications, or secrets.

- [ ] Lead: read `AGENTS.md`, `docs/00-product-brief.md`, `docs/01-alpha-plan.md`, `docs/02-team-execution-plan.md`, `docs/03-demo-acceptance-plan.md`, and `docs/13-end-to-end-execution-plan.md`. Confirm this execution folder matches the latest user direction: one `routely` command, one Start action for enabled apps, per-app stop/disable, local plus one-VPS operation, stack presets within bounded scope, 9Router-light UX, and Dokploy-inspired operational surfaces. If launch order or scope is wrong, update only files in this playbook folder and stop before dispatching implementation roles. Verification: all role files contain `- [ ]` tasks and no role is asked to edit outside its ownership.
