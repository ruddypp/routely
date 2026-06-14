# ADR 003: Use GitHub App For Repository Access

Status: Accepted for MVP

## Decision

Routely will use a GitHub App for repository access and webhooks.

## Rationale

- Better permission model than personal access tokens.
- Supports private repositories.
- Supports installation-scoped repository access.
- Webhooks integrate cleanly with auto deploy.

## Consequences

- Users must install the GitHub App before private repo deploy.
- Self-hosted open source users need configuration for GitHub App credentials.
- A simpler repo URL flow can exist for public repositories later.

