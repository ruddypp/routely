# Security Reports

Status: Empty after docs reset
Owner: Security
Last updated: 2026-06-21

## Purpose

Security should write fresh public alpha trust-boundary findings here.

## Expected Review Areas

- Local daemon/dashboard binding and same-origin boundary.
- Production auth and admin token handling.
- Env/secrets storage, API responses, logs, and screenshots.
- GitHub webhook signature validation, branch filtering, and replay/dedupe behavior.
- Docker/Compose/proxy exposure.
- DNS/domain/HTTPS state truthfulness.
- Backup file exposure.
- Notification SSRF/outbound safety.
- Untrusted dashboard text rendering.
