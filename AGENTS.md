<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Routely Agent Workflow

When implementing a public alpha slice from `docs/01-alpha-plan.md`, finish the work with a git commit after verification passes.

Auto-commit rules:

- Commit only the files changed for the current feature/checkpoint.
- Do not include unrelated user changes from the dirty worktree.
- Run the relevant checks first. At minimum, prefer `npm run lint` and the narrow build/test command for touched workspaces. For broad changes, run `npm run build --workspaces --if-present` when practical.
- If a relevant check cannot be run or fails for an unrelated reason, document that in the final response and do not hide it in the commit message.
- Use concise commit messages, for example `feat: add local app logs` or `docs: add implementation checkpoint plan`.
- If the user explicitly asks not to commit, follow the user's latest instruction.
- Never use destructive git commands to prepare a commit. Preserve existing user changes.

## Agent skills

### Issue tracker

Agent-created work items use GitHub Issues for `ruddypp/routely`; external PRs are not a default triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default Matt Pocock triage label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Routely uses a single-context domain-doc layout with `CONTEXT.md` at the repo root and ADRs under `docs/adr/`. See `docs/agents/domain.md`.

### Local skills

Relevant local skills live under `.agents/skills/`: `setup-matt-pocock-skills`, `domain-modeling`, `codebase-design`, `tdd`, `diagnosing-bugs`, `to-issues`, `implement`, `frontend-design`, and `ckm-design-system`.

## Maestro team roles

Use `docs/agents/team-workflow.md` as the team coordination contract.

Role prompts for Maestro live under `.maestro/prompts/`:

- `routely-lead.md`: user-facing lead and coordinator for setup/env/permission blockers.
- `pm.md`: product planning, vertical slices, docs, handoffs, acceptance criteria.
- `backend.md`: CLI, daemon, packages, storage, API contracts, integrations, tests.
- `frontend.md`: dashboard, Next.js route handlers, UI state integration.
- `uiux.md`: operational dashboard flows, design specs, copy, responsive/accessibility criteria.
- `qa.md`: end-to-end QA, detailed bug docs, Frontend/Backend bug instructions.
- `security.md`: security QA, trust-boundary audits, remediation instructions.
