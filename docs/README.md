# Routely Documentation Index

Version: 0.2
Status: Canonical docs reset index
Last updated: 2026-06-22

## Read First

Routely is an open source, self-hosted, dashboard-first control plane for solo developers running Compose-backed apps locally and on one VPS.

Product promise:

```text
One dashboard to register and operate apps.
One Start action for every enabled app.
One Compose-backed model from laptop to VPS.
```

New agents should start here:

1. [Product Brief](./00-product-brief.md)
2. [Public Alpha Plan](./01-alpha-plan.md)
3. [Team Execution Plan](./02-team-execution-plan.md)
4. [Demo Acceptance Plan](./03-demo-acceptance-plan.md)
5. [Docs Map](./04-docs-map.md)

## Implementation References

- [Architecture Reference](./05-architecture.md)
- [Interfaces Reference](./06-interfaces.md)
- [Security And Risk Reference](./07-security-and-risks.md)
- [Development Setup](./08-development-setup.md)
- [Current Status](./09-current-status.md)
- [Implementation Backlog](./10-implementation-backlog.md)
- [Feature Scope](./11-feature-scope.md)
- [Product Requirements Document](./12-prd.md)
- [End-To-End Execution Plan](./13-end-to-end-execution-plan.md)

## Evidence And Operations

- [QA Reports](./qa/README.md) stores fresh public alpha QA reports.
- [Security Reports](./security/README.md) stores fresh public alpha security findings.
- `docs/agents/` stores agent workflow support docs that are referenced by `AGENTS.md`.

## Architecture Decision Records

- [ADR 001: Use Docker as Production Runtime](./adr/001-use-docker-as-production-runtime.md)
- [ADR 002: Use Traefik-Compatible Proxy Model](./adr/002-use-traefik-compatible-proxy-model.md)
- [ADR 003: Use GitHub App for Repository Access](./adr/003-use-github-app-for-repo-access.md)
- [ADR 004: Use SQLite for Single-Node State](./adr/004-use-sqlite-for-single-node-state.md)
