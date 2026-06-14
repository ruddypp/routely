# ADR 002: Use Traefik-Compatible Proxy Model

Status: Accepted for MVP

## Decision

Routely will follow a Traefik-compatible proxy model for production routing.

## Rationale

- Dokploy uses this general model successfully.
- Container labels/dynamic configuration fit app deployment well.
- Supports domain routing and automatic TLS patterns.
- Good fit for Docker-based production runtime.

## Consequences

- Proxy configuration must be carefully generated and validated.
- Routely should treat proxy as infrastructure that can continue serving even if dashboard restarts.
- Caddy can be reconsidered later if simplicity becomes more important than Dokploy alignment.

