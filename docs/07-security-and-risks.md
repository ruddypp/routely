# Routely Security And Risk Reference

Status: Canonical security and risk reference
Owner: PM, Security
Last updated: 2026-06-22

## Purpose

This document replaces the old separate security model and risks/tradeoffs drafts. It records the trust boundaries and public alpha risks that must guide Backend, Frontend, QA, and Security work.

## Primary Trust Boundaries

Trusted:

- the server owner/admin
- local workspaces controlled by the user
- repositories explicitly connected by the admin

Untrusted or semi-trusted:

- webhook payloads until signature validation passes
- repository code at build/runtime
- logs, commit messages, branch names, app names, and domain names rendered in the dashboard
- future app-catalog or imported Compose inputs if those features are ever added

## Required Security Rules

- Browser code must use same-origin `/api/*`; it must not call the daemon directly.
- Production private daemon/API mutation paths require admin token/auth.
- GitHub webhooks must validate `X-Hub-Signature-256` before acting.
- Webhook deliveries should be deduplicated where practical.
- Only configured repositories and branches should trigger deploys.
- Secrets must not be exported to `routely.yml` by default.
- API responses and dashboard state must hide secret values after save.
- Known secret values should be redacted from logs where practical.
- Production databases are internal-only by default.
- Public database exposure requires explicit confirmation before any future release exposes it.
- Backup files are sensitive and must not be publicly served.
- Notification targets and tokens are secrets; public DTOs must redact them.
- Outbound notification URLs should reject unsafe protocols, credentials, loopback/private/link-local targets, and use short timeouts where implemented.

## Public Alpha Risk Register

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Scope creep | Routely spans local runner, deploy, domains, GitHub, env, logs, databases, backups, notifications, and health. | Keep public alpha tied to the three demos in `docs/01-alpha-plan.md`. |
| Arbitrary code execution | Routely runs local commands and production builds from repos. | Require explicit app/repo connection, document the trust model, prefer containerized production builds. |
| Secret leakage | Env vars, GitHub keys, webhook secrets, database passwords, backups, and notification tokens can leak through logs/API/screenshots. | Mask values, redact logs where practical, keep GitHub secrets server-side. |
| SSRF/outbound abuse | Notification webhooks can target internal infrastructure. | Validate protocols/hosts, reject unsafe targets where implemented, use short timeouts. |
| DNS/HTTPS false positives | Generated proxy config is not certificate issuance. | Verify DNS against server IP and track TLS state conservatively. |
| SQLite overreach | SQLite is correct for one-node state but not distributed control-plane state. | Keep MVP single-VPS-first and do not design public distributed-control-plane behavior for alpha. |
| Dashboard XSS | Logs and GitHub metadata contain untrusted text. | Render as text, avoid unsafe HTML, test dashboard surfaces with untrusted strings. |
| Dirty worktree | Agent changes can accidentally include unrelated user work. | Commit only owned files after verification; never use destructive git commands. |

## Security Review Gate

Before public alpha, Security should produce a review under `docs/security/` covering:

- local binding and browser/daemon boundary
- production auth
- env/secrets storage, redaction, and log exposure
- GitHub webhook validation, branch filtering, and replay/dedupe behavior
- Docker/Compose/proxy exposure
- DNS/domain/HTTPS truthfulness
- backup file exposure
- notification SSRF/outbound behavior
- untrusted dashboard text rendering
