# Lead Phase 02: Report Collection And Release Gate

Playbook type: task-based. Each checkbox is self-contained and can run in a fresh agent context.

- [ ] Routely Lead: read `AGENTS.md`, `docs/02-team-execution-plan.md`, `docs/03-demo-acceptance-plan.md`, `docs/13-end-to-end-execution-plan.md`, all reports under `docs/qa/` and `docs/security/` dated `2026-06-22`, and the latest role commits. Summarize QA and Security findings into owner-routed bug instructions: Backend for CLI/daemon/packages/storage/API/runtime issues, Frontend for dashboard/API route/UI state issues, PM for scope/docs/acceptance ambiguity, and UI/UX for copy/interaction/accessibility gaps. Commit QA/Security reports only if appropriate and only after preserving unrelated worktree changes. Verification: a release-gate summary exists in the task output with pass/fail for local demo, one-VPS demo, GitHub demo, responsive dashboard, and security review.
