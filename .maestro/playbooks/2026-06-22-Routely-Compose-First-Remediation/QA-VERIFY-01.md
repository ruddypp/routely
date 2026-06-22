---
type: reference
title: Routely Compose-First QA Verification Playbook
created: 2026-06-22
tags:
  - maestro-playbook
  - qa
  - e2e
  - compose-first
  - remediation
related:
  - '[[Routely Compose-First E2E QA Validation]]'
  - '[[Compose-First Trust-Boundary Security Validation]]'
  - '[[Routely Compose-First Remediation Manifest]]'
---

# Routely Compose-First QA Verification

Task-based playbook: each checkbox task must be executable in a fresh QA E2E agent context. QA E2E writes reports for Routely Lead and does not commit reports or source changes. Preserve unrelated dirty worktree changes.

- [ ] QA E2E: rerun the Compose-first E2E validation after Backend and Frontend remediation fixes and write a new dated report under `docs/qa/` without committing it. Read `AGENTS.md`, `docs/agents/team-workflow.md`, `docs/00-product-brief.md`, `docs/01-alpha-plan.md`, `docs/02-team-execution-plan.md`, `docs/03-demo-acceptance-plan.md`, `docs/05-architecture.md`, `docs/06-interfaces.md`, `docs/07-security-and-risks.md`, `docs/09-current-status.md`, `.maestro/playbooks/2026-06-22-Routely-Compose-First-Remediation/REMEDIATION-MANIFEST.md`, `.maestro/playbooks/2026-06-22-Routely-Compose-First-Remediation/BACKEND-FIX-01.md`, `.maestro/playbooks/2026-06-22-Routely-Compose-First-Remediation/FRONTEND-FIX-01.md`, `docs/qa/compose-first-e2e-validation-2026-06-22.md`, and `docs/security/compose-first-trust-boundary-2026-06-22.md` before testing. Verify the original QA blocker `FE-QA-2026-06-22-01`, and smoke the user-visible outcomes affected by `SEC-COMPOSE-01`, `SEC-COMPOSE-02`, and `SEC-COMPOSE-05`: dashboard route auth cannot be bypassed through env mismatch, URL/DSN secret values never render raw, backup paths do not render as full host paths, and responsive dashboard views at 375px/768px/1280px have no horizontal clipping. Also rerun the Compose-first local lifecycle coverage from the prior report: registry create/edit, Start All skip semantics, per-app stop, enable/disable non-destructive behavior, env/secrets, deploy history/logs, domains/proxy honesty, databases/backups, logs/health, GitHub diagnostics, and same-origin `/api/*` browser boundary. Verification commands to run where available: `npm run lint`, `npm run test --workspace apps/web`, `npm run test --workspace apps/cli`, `npx tsc --noEmit --project apps/web/tsconfig.json`, the focused Compose-first smoke script under `.maestro/playbooks/Working/` or an updated equivalent, and `ROUTELY_DASHBOARD_URL=http://127.0.0.1:13030 ROUTELY_DASHBOARD_SMOKE_DIR=/home/ruddypp/Documents/work/routely/.maestro/playbooks/Working/qa-compose-e2e-remediation-screenshots npm run test:dashboard-smoke --workspace apps/web` with valid token/seed setup. Write a structured Markdown report with YAML front matter under `docs/qa/compose-first-e2e-remediation-YYYY-MM-DD.md`, cite exact finding IDs and pass/fail status, embed or link new screenshots, and state clearly that real VPS/DNS/GitHub provider validation remains Lead/user-environment blocked unless credentials, endpoints, domain, DNS provider, and test repository are available. QA E2E does not commit its report; leave it for Routely Lead.
