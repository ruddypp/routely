---
type: reference
title: Routely End-to-End Product Execution Manifest
created: 2026-06-22
tags:
  - maestro-playbook
  - product-execution
  - routely
  - public-alpha
related:
  - '[[Routely Product Brief]]'
  - '[[Routely Alpha Plan]]'
  - '[[Routely Team Execution Plan]]'
---

# Routely End-to-End Product Execution Manifest

## Product North Star

Routely is a lightweight solo-operator control plane for running, stopping, routing, observing, and deploying many reasonable app stacks from one command and one dashboard.

The operator experience should feel as simple as 9Router for local use: run `routely`, open a clear dashboard, click `Start All`, and every enabled managed app starts with reachable routes, logs, health, and per-app controls.

The full operating concept should follow Dokploy's useful solo-developer workflows without copying enterprise/team scope: app setup, deploys, domains/proxy, env/secrets, logs, health, databases, backups, notifications, and GitHub redeploys on one VPS.

## Core Product Promises

1. Single command: `routely` starts Routely itself, finds the workspace, starts the daemon/dashboard, and presents useful next actions.
2. App registry: the operator can register apps/services from the dashboard without editing config for the normal path.
3. Start All: one action starts every enabled managed app in dependency order, while disabled apps stay registered but skipped.
4. Per-app operations: each app can start, stop, restart, disable, view logs, view health, and expose a local/prod route.
5. Proxy mental model: Routely is the control-plane/proxy layer that connects many apps to predictable routes locally and on one VPS.
6. Local-to-VPS continuity: the same app registry and operational concepts work locally and on one VPS, with production-only auth/secrets/hardening.
7. Lightweight UX: UI copy and layout should be simple, obvious, responsive, and understandable without needing Dokploy-level expertise.

## Execution Principles

- Build in vertical slices that are demoable end-to-end.
- Prefer Compose as the shared runtime bridge for most stacks, with command-driver local apps and Dockerfile deploys supported where already proven.
- Keep public alpha honest: only document workflows that QA and Security have verified.
- Keep the product solo-operator scoped: no teams/RBAC, public catalog, Kubernetes, multi-server control plane, billing, or enterprise scope.
- Preserve existing remediation work; do not revert unrelated dirty worktree changes.

## Milestones

| Milestone | Outcome | Primary roles |
| --- | --- | --- |
| M0 Baseline Safety | Current repo state, remediation leftovers, docs, and tests are reconciled so execution starts from a known baseline. | Lead, PM, Backend, Frontend |
| M1 Product/UX North Star | Product brief, glossary, acceptance criteria, IA, and lightweight UI spec align to 9Router simplicity + Dokploy operations. | PM, UI/UX, Lead |
| M2 Single-Command Local Control Plane | `routely` reliably starts daemon/dashboard for a workspace and communicates local state clearly. | Backend, Frontend, QA |
| M3 Dashboard App Registry | Dashboard creates/edits enabled apps and common services without manual config editing for normal paths. | UI/UX, Frontend, Backend |
| M4 Start All And Per-App Lifecycle | Start All, per-app start/stop/restart/disable, logs, health, and dependency ordering work locally. | Backend, Frontend, QA, Security |
| M5 Local Proxy And Routes | Multiple apps get predictable local routes/proxy status, route conflicts are understandable, and UI explains what is reachable. | Backend, Frontend, UI/UX, QA |
| M6 Stack Templates | Reasonable stack presets cover common apps/databases/jobs while unsupported stacks are clearly framed. | PM, UI/UX, Backend, Frontend |
| M7 One-VPS Routely Runtime | Routely can be installed/run on one VPS with production auth, daemon service guidance, data dir, and doctor checks. | Backend, Frontend, Security, QA |
| M8 Production App Operations | One app deploys on VPS with domains/proxy/TLS state, env/secrets, logs, health, database, backup, notifications. | Backend, Frontend, Security, QA |
| M9 GitHub Redeploy | GitHub push redeploys the intended app and broken deploy logs are diagnosable. | Backend, Frontend, Security, QA |
| M10 Release Readiness | Docs, QA reports, Security reports, demo scripts, and current-status page match verified behavior. | Lead, PM, QA, Security |

## Owner Documents

- Lead: `.maestro/playbooks/2026-06-22-Routely-End-to-End-Product-Execution/LEAD-01.md`.
- PM: `.maestro/playbooks/2026-06-22-Routely-End-to-End-Product-Execution/PM-01.md`.
- UI/UX: `.maestro/playbooks/2026-06-22-Routely-End-to-End-Product-Execution/UIUX-01.md`.
- Backend: `.maestro/playbooks/2026-06-22-Routely-End-to-End-Product-Execution/BACKEND-01.md`.
- Frontend: `.maestro/playbooks/2026-06-22-Routely-End-to-End-Product-Execution/FRONTEND-01.md`.
- QA E2E: `.maestro/playbooks/2026-06-22-Routely-End-to-End-Product-Execution/QA-01.md`.
- Security: `.maestro/playbooks/2026-06-22-Routely-End-to-End-Product-Execution/SECURITY-01.md`.

## Execution Order

1. Lead runs M0 baseline coordination and makes sure prior remediation leftovers are either committed, intentionally preserved, or turned into explicit follow-up work.
2. PM runs product/acceptance planning and issues a role-ready PRD/update plan.
3. UI/UX creates the lightweight dashboard flow/spec before broad UI implementation.
4. Backend and Frontend execute vertical slices in the milestone order, coordinating contracts before each slice.
5. QA E2E runs local, responsive, VPS, and GitHub smoke reports after implementation checkpoints.
6. Security runs trust-boundary reviews after local lifecycle, VPS operations, notification/webhook, and release-readiness checkpoints.
7. Lead collects QA/Security reports, commits reports when appropriate, and reports final status to the user.

## Blocking Questions To Resolve Early

- Which stacks are in the first “reasonable stack” preset list: Node/Next, Dockerfile, Compose service, Postgres, Redis, background worker?
- Should local proxy use localhost ports only for alpha, or also friendly local hostnames?
- What is the first VPS target environment for verification: OS, domain/DNS provider, GitHub test repo, and whether Docker/Traefik are preinstalled?

