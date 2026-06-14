# ADR 001: Use Docker As Production Runtime

Status: Accepted for MVP

## Decision

Routely will use Docker as the primary production runtime.

## Rationale

- Matches Dokploy-style deployment.
- Supports many stacks without installing every runtime on the host.
- Works well with Docker Compose and database services.
- Provides restart policies, logs, networks, volumes, and image lifecycle.

## Consequences

- VPS production requires Docker.
- Local mode can still run without Docker for command-based apps, but databases/Compose need Docker.
- Windows production is out of scope; production target is Linux VPS.

