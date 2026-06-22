# Routely End-to-End Security Plan

- [ ] Security: review local lifecycle and dashboard trust boundaries after local Start All and route slices land. Check same-origin `/api/*`, local daemon exposure, command/process execution boundaries, untrusted app/log text rendering, route/proxy assumptions, and secret/log redaction. Write a dated report under `docs/security/` and do not commit it.

- [ ] Security: review one-VPS production trust boundaries after production slices land. Check auth/session behavior, daemon/admin token handling, Docker/Compose/proxy exposure, env/secrets, backups, notifications SSRF/redirect/DNS rebinding, GitHub webhooks, host path leakage, and untrusted text. Write a dated report under `docs/security/` and do not commit it.

- [ ] Security: review release-readiness claims. Ensure public docs do not claim teams/RBAC, multi-server, public app catalog, broad VPS admin, external backup storage, or unsupported stacks. Confirm QA/Security blockers are represented honestly in `docs/09-current-status.md`. Write a dated report under `docs/security/` and do not commit it.
