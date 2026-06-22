---
type: reference
title: Routely Compose-First Remediation Manifest
created: 2026-06-22
tags:
  - maestro-playbook
  - remediation
  - compose-first
  - public-alpha
related:
  - '[[Routely Compose-First E2E QA Validation]]'
  - '[[Compose-First Trust-Boundary Security Validation]]'
  - '[[Routely Product Brief]]'
  - '[[Routely Alpha Plan]]'
---

# Routely Compose-First Remediation Manifest

This folder is a task-based remediation playbook set: each checkbox task in the owner documents is self-contained and can run in a fresh Maestro agent context.

## Source Reports

- QA source: `docs/qa/compose-first-e2e-validation-2026-06-22.md`.
- Security source: `docs/security/compose-first-trust-boundary-2026-06-22.md`.
- Prior implementation handoffs: `.maestro/playbooks/2026-06-22-Routely-Compose-First-Execution/BACKEND-01.md` and `.maestro/playbooks/2026-06-22-Routely-Compose-First-Execution/FRONTEND-01.md`.

## Owner Documents

- Backend remediation: `.maestro/playbooks/2026-06-22-Routely-Compose-First-Remediation/BACKEND-FIX-01.md`.
- Frontend remediation: `.maestro/playbooks/2026-06-22-Routely-Compose-First-Remediation/FRONTEND-FIX-01.md`.
- QA verification: `.maestro/playbooks/2026-06-22-Routely-Compose-First-Remediation/QA-VERIFY-01.md`.
- Security verification: `.maestro/playbooks/2026-06-22-Routely-Compose-First-Remediation/SECURITY-VERIFY-01.md`.

## Finding Map

| Finding ID | Severity | Primary owner document | Required outcome |
| --- | --- | --- | --- |
| `FE-QA-2026-06-22-01` | High | `FRONTEND-FIX-01.md` | Mobile/tablet/desktop dashboard content and actions stay readable/reachable with no viewport overflow. |
| `SEC-COMPOSE-01` | High | `FRONTEND-FIX-01.md`, `BACKEND-FIX-01.md` | Dashboard route auth cannot be disabled by env mismatch while route handlers forward the daemon admin token; daemon/dashboard production-mode contract is documented consistently. |
| `SEC-COMPOSE-02` | High | `BACKEND-FIX-01.md`, `FRONTEND-FIX-01.md` | URL/DSN/URI env values are secret by default, redacted in DTOs/logs, and never rendered raw in dashboard/API responses. |
| `SEC-COMPOSE-03` | Medium | `BACKEND-FIX-01.md` | Notification delivery rejects unsafe redirects and DNS-rebinding/private-address targets. |
| `SEC-COMPOSE-04` | Low | `BACKEND-FIX-01.md` | Unauthenticated production health/status responses do not expose absolute filesystem metadata. |
| `SEC-COMPOSE-05` | Low | `BACKEND-FIX-01.md`, `FRONTEND-FIX-01.md` | Backup DTOs and dashboard views expose file names/status/storage class, not full host paths; restore remains explicitly deferred. |
| `SEC-COMPOSE-06` | Low | `BACKEND-FIX-01.md` | Health/metric retention is bounded in SQLite or explicitly documented as deferred alpha behavior. |

## Execution Order

1. Run `BACKEND-FIX-01.md` for backend-owned trust-boundary fixes and backend tests.
2. Run `FRONTEND-FIX-01.md` for dashboard auth, redaction/display, backup display, and responsive visual remediation.
3. Run `QA-VERIFY-01.md` after Backend/Frontend fixes land; QA writes a new `docs/qa/` report and does not commit it.
4. Run `SECURITY-VERIFY-01.md` after Backend/Frontend fixes land; Security writes a new `docs/security/` report and does not commit it.
5. Routely Lead reviews and commits QA/Security reports when appropriate.

## Release Honesty

- The remediation plan only targets the completed local Compose-first QA/Security findings from 2026-06-22.
- Real one-VPS, DNS, TLS, and GitHub provider validation remains Lead/user-environment blocked unless credentials, endpoints, a disposable VPS, a real domain/DNS provider, and a test GitHub repository are available.
- Until that environment exists, QA/Security reports must mark provider-backed acceptance as blocked rather than passed.
- Unsupported future scope remains deferred: teams/RBAC, public multi-server UX, external backup storage, destructive restore automation, broad VPS administration, and public app catalog behavior.

## PM Verification

- PM plan verification command: `git diff --check -- .maestro/playbooks docs`.
- PM ownership: this manifest and the owner playbooks in `.maestro/playbooks/2026-06-22-Routely-Compose-First-Remediation/`.
