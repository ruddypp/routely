# Security Guide

Security reports from the previous alpha direction were removed because the product blueprint changed. New security work should review the trust boundaries in `docs/architecture.md` and the checklist in `docs/verification.md`.

Primary review areas:

- Dashboard same-origin routes and daemon exposure.
- Auth requirements on public/exposed runtime hosts.
- Secret storage and masking.
- Log redaction.
- Terminal access and scope.
- Local folder access.
- Docker/Compose command generation.
- Domain/proxy config generation.
- GitHub webhook signature validation and dedupe order.
- Database network exposure.
- Destructive action confirmation.

Security agents should report findings to Routely Lead and should not commit reports unless acting as Lead.
