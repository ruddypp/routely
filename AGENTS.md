<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Routely Agent Workflow

Routely's current source of truth is the MVP blueprint reset:

1. `docs/blueprint.md`
2. `docs/architecture.md`
3. `docs/frontend.md`
4. `docs/backend.md`
5. `docs/implementation-slices.md`
6. `docs/verification.md`

When implementing an MVP slice from `docs/implementation-slices.md`, finish owned implementation or planning work with verification, a git commit, and a push when remote access is available and the user has requested push-on-change. QA E2E and Security are exceptions: they write reports and hand them to Routely Lead; Lead commits QA/Security reports when appropriate.

Auto-commit rules:

- Commit only the files changed for the current feature/checkpoint.
- Do not include unrelated user changes from the dirty worktree.
- Run the relevant checks first. At minimum, prefer `npm run lint` and the narrow build/test command for touched workspaces. For broad changes, run `npm run build --workspaces --if-present` when practical.
- If a relevant check cannot be run or fails for an unrelated reason, document that in the final response and do not hide it in the commit message.
- Use concise commit messages, for example `docs: add mvp blueprint` or `feat: add app setup wizard shell`.
- If the user explicitly asks not to commit or push, follow the user's latest instruction.
- Never use destructive git commands to prepare a commit. Preserve existing user changes.

## Product Rules

- The machine running `routely` is the runtime host/server, whether local or VPS.
- Docker and Docker Compose are required for the primary MVP runtime.
- Compose is the primary internal runtime model.
- Apps must pass setup verification before being marked ready.
- Backup/restore is deferred until safe and production-grade.
- Dashboard UI must be an operations dashboard, not a static app list.
- Dependencies/libraries/frameworks are allowed when they materially improve quality; keep them focused, documented, tested, and committed with the slice that uses them.

## Agent Skills

### Issue tracker

Agent-created work items use GitHub Issues for `ruddypp/routely`; external PRs are not a default triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default Matt Pocock triage label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Routely uses a single-context domain-doc layout with `CONTEXT.md` at the repo root and ADRs under `docs/adr/`. See `docs/agents/domain.md`.

### Local skills

Relevant local skills live under `.agents/skills/`: `setup-matt-pocock-skills`, `ask-matt`, `grill-with-docs`, `to-prd`, `to-issues`, `triage`, `domain-modeling`, `codebase-design`, `tdd`, `diagnosing-bugs`, `implement`, `frontend-design`, and `ckm-design-system`.

PM uses the Matt Pocock planning flow for non-trivial new product work, but current MVP execution should start from `docs/implementation-slices.md`. See `docs/agents/team-workflow.md`.

## Specialist Roles

Use `docs/agents/team-workflow.md` as the coordination contract when splitting work between PM, UI/UX, Backend, Frontend, QA, and Security specialists.
