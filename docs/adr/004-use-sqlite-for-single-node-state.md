# ADR 004: Use SQLite For Single-Node State

Status: Accepted for MVP

## Decision

Routely will use SQLite for app registry and runtime state in MVP.

## Rationale

- Simple self-hosted installation.
- No required external database for Routely itself.
- Good fit for single-server and local workflows.
- Easy backup/export story.

## Consequences

- Multi-server support needs an agent/sync design later.
- Concurrent write patterns must be controlled.
- Metrics retention must be capped to avoid unbounded database growth.

