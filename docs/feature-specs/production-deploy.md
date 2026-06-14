# Feature Spec: Production Deploy

Version: 0.1  
Status: Draft

## English

Production deploy turns a GitHub repo, Dockerfile, Compose stack, or buildpack-compatible app into a running service on a VPS.

## Indonesia

Production deploy mengubah GitHub repo, Dockerfile, Compose stack, atau app yang kompatibel dengan buildpack menjadi service yang berjalan di VPS.

## Requirements

- Build from GitHub source.
- Support Dockerfile.
- Support Docker Compose.
- Support buildpack/Nixpacks/Railpack-style builder.
- Support static site build and serve.
- Store deployment history.
- Stream logs.
- Run healthcheck.
- Keep previous app available if new deploy fails where possible.

## Deployment Lifecycle

```text
queued
  ↓
cloning
  ↓
building
  ↓
starting
  ↓
healthchecking
  ↓
activating proxy route
  ↓
succeeded / failed
```

## Acceptance Criteria

- Next.js repo deploys to HTTPS domain.
- Docker Compose app deploys with internal services.
- Failed build does not get marked live.
- Dashboard shows deployment phase and logs.

