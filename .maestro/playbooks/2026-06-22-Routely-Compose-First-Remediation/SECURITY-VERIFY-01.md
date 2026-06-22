---
type: reference
title: Routely Compose-First Security Verification Playbook
created: 2026-06-22
tags:
  - maestro-playbook
  - security
  - trust-boundary
  - compose-first
  - remediation
related:
  - '[[Compose-First Trust-Boundary Security Validation]]'
  - '[[Routely Compose-First E2E QA Validation]]'
  - '[[Routely Compose-First Remediation Manifest]]'
---

# Routely Compose-First Security Verification

Task-based playbook: each checkbox task must be executable in a fresh Security agent context. Security writes reports for Routely Lead and does not commit reports or source changes. Preserve unrelated dirty worktree changes.

- [ ] Security: rerun the Compose-first trust-boundary validation after Backend and Frontend remediation fixes and write a new dated report under `docs/security/` without committing it. Read `AGENTS.md`, `docs/agents/team-workflow.md`, `docs/00-product-brief.md`, `docs/01-alpha-plan.md`, `docs/02-team-execution-plan.md`, `docs/03-demo-acceptance-plan.md`, `docs/05-architecture.md`, `docs/06-interfaces.md`, `docs/07-security-and-risks.md`, `docs/09-current-status.md`, `.maestro/playbooks/2026-06-22-Routely-Compose-First-Remediation/REMEDIATION-MANIFEST.md`, `.maestro/playbooks/2026-06-22-Routely-Compose-First-Remediation/BACKEND-FIX-01.md`, `.maestro/playbooks/2026-06-22-Routely-Compose-First-Remediation/FRONTEND-FIX-01.md`, `docs/qa/compose-first-e2e-validation-2026-06-22.md`, and `docs/security/compose-first-trust-boundary-2026-06-22.md` before testing. Verify every original security finding: `SEC-COMPOSE-01` dashboard/daemon auth mismatch, `SEC-COMPOSE-02` URL/DSN env redaction, `SEC-COMPOSE-03` notification redirect/DNS-rebinding SSRF, `SEC-COMPOSE-04` public health/status path metadata, `SEC-COMPOSE-05` backup path DTO/display exposure, and `SEC-COMPOSE-06` health/metrics retention. Revalidate controls that were previously green: browser code uses same-origin `/api/*`, daemon production private paths require auth, GitHub webhook signatures/repo/branch/dedupe work, databases are not exposed by proxy by default, logs/deploy history redact secrets, backup files are not served, untrusted text is rendered safely, and no team/RBAC/multi-server claims are implied. Verification commands to run where available: `npm run lint`, `npm run test --workspace apps/cli`, `npm run test --workspace apps/web`, `npx tsc --noEmit --project apps/web/tsconfig.json`, `node --check apps/daemon/src/server.js`, focused auth/env/notification/health/backup/retention tests, `rg -n "dangerouslySetInnerHTML|\.innerHTML\b|insertAdjacentHTML|document\.write|eval\(|new Function" apps/web/src apps/daemon/src packages`, `rg -n "process\.env\.[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|PRIVATE_KEY|KEY)|ROUTELY_ADMIN_TOKEN|ROUTELY_GITHUB_WEBHOOK_SECRET|GITHUB_WEBHOOK_SECRET|GITHUB_PRIVATE_KEY" apps/web/src apps/daemon/src packages README.md docs/07-security-and-risks.md .env.example`, and a focused `node --input-type=module` DTO/redaction check for `DATABASE_URL`, `REDIS_URL`, and `SENTRY_DSN`. Write a structured Markdown report with YAML front matter under `docs/security/compose-first-trust-boundary-remediation-YYYY-MM-DD.md`, cite exact finding IDs and pass/fail status, include exact command output summaries, and state clearly that real VPS/DNS/GitHub provider validation remains Lead/user-environment blocked unless credentials, endpoints, domain, DNS provider, and test repository are available. Security does not commit its report; leave it for Routely Lead.
