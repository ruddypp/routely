---
type: report
title: Routely Compose-First Execution Launch Manifest
created: 2026-06-22
tags:
  - maestro
  - auto-run
  - compose-first
  - routely-alpha
related:
  - '[[REPLAN-01]]'
  - '[[BACKEND-01]]'
  - '[[FRONTEND-01]]'
---

# Routely Compose-First Execution Launch Manifest

## Summary

PM launched the task-based Compose-first implementation Auto Run documents for Backend and Frontend on 2026-06-22. The generated documents are the execution handoff from [[REPLAN-01]] and are scoped to Backend and Frontend only.

## Agent Confirmation

Command run:

```bash
node /tmp/.mount_maestriig4I9/resources/maestro-cli.js list agents --json
```

Relevant IDs confirmed from the command output:

- Backend: `e2a663bf-0d9f-4cfb-9c03-3e49309356a5`
- Frontend: `fbd438a5-13ce-40ef-93fa-6d867d6a5b95`

## Documents Launched

- Backend document: `/home/ruddypp/Documents/work/routely/.maestro/playbooks/2026-06-22-Routely-Compose-First-Execution/BACKEND-01.md`
- Frontend document: `/home/ruddypp/Documents/work/routely/.maestro/playbooks/2026-06-22-Routely-Compose-First-Execution/FRONTEND-01.md`

## Compatibility Symlinks

Maestro CLI 0.17.1 stores absolute Auto Run document paths while the runner resolves them relative to `.maestro/playbooks`, so these compatibility symlinks were created before launch:

- `.maestro/playbooks/home/ruddypp/Documents/work/routely/.maestro/playbooks/2026-06-22-Routely-Compose-First-Execution/BACKEND-01.md.md` -> `/home/ruddypp/Documents/work/routely/.maestro/playbooks/2026-06-22-Routely-Compose-First-Execution/BACKEND-01.md`
- `.maestro/playbooks/home/ruddypp/Documents/work/routely/.maestro/playbooks/2026-06-22-Routely-Compose-First-Execution/FRONTEND-01.md.md` -> `/home/ruddypp/Documents/work/routely/.maestro/playbooks/2026-06-22-Routely-Compose-First-Execution/FRONTEND-01.md`

## Save-As Command Outputs

The requested `--save-as` commands were run first. CLI help for Maestro CLI 0.17.1 states `--save-as <name>` saves a playbook and does not launch it, so these outputs are recorded as saved-playbook evidence rather than launch evidence.

Backend save command:

```bash
node /tmp/.mount_maestriig4I9/resources/maestro-cli.js auto-run /home/ruddypp/Documents/work/routely/.maestro/playbooks/2026-06-22-Routely-Compose-First-Execution/BACKEND-01.md --launch --agent e2a663bf-0d9f-4cfb-9c03-3e49309356a5 --save-as "Routely Compose-First Backend Execution"
```

Output:

```text
Playbook 'Routely Compose-First Backend Execution' saved (ID: 21d644ef-dad0-4e35-afd2-58ddd38bb5f6)
```

Frontend save command:

```bash
node /tmp/.mount_maestriig4I9/resources/maestro-cli.js auto-run /home/ruddypp/Documents/work/routely/.maestro/playbooks/2026-06-22-Routely-Compose-First-Execution/FRONTEND-01.md --launch --agent fbd438a5-13ce-40ef-93fa-6d867d6a5b95 --save-as "Routely Compose-First Frontend Execution"
```

Output:

```text
Playbook 'Routely Compose-First Frontend Execution' saved (ID: ec23ac65-5ec7-442b-b5ba-e4d7b2ecc769)
```

## Launch Command Outputs

Because `--save-as` is save-only in this CLI version, the documents were then launched without `--save-as` so the Auto Run engine would actually start them.

Backend launch command:

```bash
node /tmp/.mount_maestriig4I9/resources/maestro-cli.js auto-run /home/ruddypp/Documents/work/routely/.maestro/playbooks/2026-06-22-Routely-Compose-First-Execution/BACKEND-01.md --launch --agent e2a663bf-0d9f-4cfb-9c03-3e49309356a5
```

Output:

```text
Auto-run launched with 1 document
```

Frontend launch command:

```bash
node /tmp/.mount_maestriig4I9/resources/maestro-cli.js auto-run /home/ruddypp/Documents/work/routely/.maestro/playbooks/2026-06-22-Routely-Compose-First-Execution/FRONTEND-01.md --launch --agent fbd438a5-13ce-40ef-93fa-6d867d6a5b95
```

Output:

```text
Auto-run launched with 1 document
```

Refresh command:

```bash
node /tmp/.mount_maestriig4I9/resources/maestro-cli.js refresh-auto-run
```

Output:

```text
Auto Run documents refreshed
```

## Expected Completion Checks

- Backend Auto Run should check every task in [[BACKEND-01]] and create backend-owned commits only after each task's verification passes.
- Frontend Auto Run should check every task in [[FRONTEND-01]] and create frontend-owned commits only after each task's verification passes.
- Backend tasks should preserve Compose-backed app model, enablement/bulk start semantics, API contracts, local runner plus one-VPS parity, domain/proxy, env/secrets, database/backups, logs/deploy history, health checks, and relevant lint/build/test checks.
- Frontend tasks should preserve required Next.js docs reading before editing `apps/web`, dashboard-first app creation/editing, Start All with per-app stop/disable, Dokploy-inspired 9Router-light IA, real-data operational screens, deferred-state honesty, tests, and web verification checks.
- Any blocker should remain visible in the Auto Run task output and should not be hidden in commit messages.

## Routely Lead Verification

Routely Lead should verify completion by checking:

1. Auto Run panel/history shows Backend ran `BACKEND-01.md` against `e2a663bf-0d9f-4cfb-9c03-3e49309356a5` and Frontend ran `FRONTEND-01.md` against `fbd438a5-13ce-40ef-93fa-6d867d6a5b95`.
2. Every checkbox in `BACKEND-01.md` and `FRONTEND-01.md` is checked or has a clear blocker note from the owning agent.
3. Git history contains only owner-appropriate Backend or Frontend commits for implementation work, plus this PM manifest/playbook commit.
4. Verification outputs for each implementation task include the required lint, test, build, syntax, or typecheck commands listed in the task text.
5. Any launch or execution blocker is routed back to Routely Lead rather than silently skipped.
