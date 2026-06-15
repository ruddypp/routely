# Routely Documentation Index

Version: 0.1  
Status: Draft  
Language: English with Indonesian notes in each document

## English

Routely is an open source, self-hosted app orchestrator inspired by 9Router's single-command daemon model and Dokploy's VPS deployment platform. The product targets solo developers who maintain many applications and want one command for local development plus one VPS control plane for production deployments.

Core promise:

```text
Run `routely` locally or on a VPS.
All registered apps, services, proxy routes, logs, metrics, and deployments become manageable from one place.
```

## Bahasa Indonesia

Routely adalah app orchestrator open source dan self-hosted yang menggabungkan mental model 9Router dan Dokploy. Target awalnya solo developer yang punya banyak aplikasi dan ingin satu command untuk local development serta satu control plane untuk production di VPS.

Janji utama:

```text
Ketik `routely` di local atau VPS.
Semua app, service, proxy, log, metric, dan deployment bisa dikelola dari satu tempat.
```

## Documents

- [Agent Handoff](./HANDOFF.md)
- [Product Requirements Document](./01-prd.md)
- [Technical Architecture](./02-technical-architecture.md)
- [Functional Specification](./03-functional-specification.md)
- [User Flows](./04-user-flows.md)
- [CLI Specification](./05-cli-spec.md)
- [API Specification](./06-api-spec.md)
- [Configuration Specification](./07-config-spec.md)
- [Data Model](./08-data-model.md)
- [Security Model](./09-security-model.md)
- [MVP Roadmap](./10-mvp-roadmap.md)
- [Risks and Tradeoffs](./11-risks-and-tradeoffs.md)
- [Development Setup](./12-development-setup.md)
- [Current Setup Status](./13-current-setup-status.md)
- [End-to-End Implementation Plan](./14-implementation-plan.md)

## Feature Specs

- [Local Runner](./feature-specs/local-runner.md)
- [GitHub Integration](./feature-specs/github-integration.md)
- [Production Deploy](./feature-specs/production-deploy.md)
- [Domain and HTTPS](./feature-specs/domain-and-https.md)
- [Runtime and Build System](./feature-specs/runtime-and-build-system.md)
- [Database Services](./feature-specs/database-services.md)
- [Dashboard](./feature-specs/dashboard.md)
- [Logs and Monitoring](./feature-specs/logs-and-monitoring.md)
- [Backup System](./feature-specs/backup-system.md)

## Architecture Decision Records

- [ADR 001: Use Docker as Production Runtime](./adr/001-use-docker-as-production-runtime.md)
- [ADR 002: Use Traefik-Compatible Proxy Model](./adr/002-use-traefik-compatible-proxy-model.md)
- [ADR 003: Use GitHub App for Repository Access](./adr/003-use-github-app-for-repo-access.md)
- [ADR 004: Use SQLite for Single-Node State](./adr/004-use-sqlite-for-single-node-state.md)
