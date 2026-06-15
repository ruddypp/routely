<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Routely Agent Workflow

When implementing a feature or checkpoint from `docs/14-implementation-plan.md`, finish the work with a git commit after verification passes.

Auto-commit rules:

- Commit only the files changed for the current feature/checkpoint.
- Do not include unrelated user changes from the dirty worktree.
- Run the relevant checks first. At minimum, prefer `npm run lint` and the narrow build/test command for touched workspaces. For broad changes, run `npm run build --workspaces --if-present` when practical.
- If a relevant check cannot be run or fails for an unrelated reason, document that in the final response and do not hide it in the commit message.
- Use concise commit messages, for example `feat: add local app logs` or `docs: add implementation checkpoint plan`.
- If the user explicitly asks not to commit, follow the user's latest instruction.
- Never use destructive git commands to prepare a commit. Preserve existing user changes.
