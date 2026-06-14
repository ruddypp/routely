# Routely API Specification

Version: 0.1  
Status: Draft

## 1. English Summary

The API powers the dashboard and CLI. It should be local-first, production-authenticated, and designed around app lifecycle operations.

## 1. Ringkasan Indonesia

API dipakai oleh dashboard dan CLI. API harus local-first, memakai auth di production, dan berpusat pada lifecycle aplikasi.

## 2. API Style

- REST for MVP.
- Server-sent events or WebSocket for logs and metrics streaming.
- JSON payloads.
- Local mode may use local token.
- Production mode requires authenticated session/API token.

## 3. Core Endpoints

```text
GET    /api/health
GET    /api/apps
POST   /api/apps
GET    /api/apps/:id
PATCH  /api/apps/:id
DELETE /api/apps/:id
POST   /api/apps/:id/start
POST   /api/apps/:id/stop
POST   /api/apps/:id/restart
GET    /api/apps/:id/logs
GET    /api/apps/:id/metrics
```

## 4. Deployment Endpoints

```text
GET    /api/deployments
POST   /api/apps/:id/deployments
GET    /api/deployments/:id
GET    /api/deployments/:id/logs
POST   /api/deployments/:id/cancel
POST   /api/deployments/:id/rollback
```

Rollback can be disabled until deployment history is stable.

## 5. GitHub Endpoints

```text
GET    /api/github/installations
GET    /api/github/repos
POST   /api/github/connect
POST   /api/github/webhook
```

Webhook endpoint must validate GitHub signature.

## 6. Domain Endpoints

```text
GET    /api/domains
POST   /api/domains
POST   /api/domains/:id/verify
DELETE /api/domains/:id
```

## 7. Environment Endpoints

```text
GET    /api/apps/:id/env
POST   /api/apps/:id/env
PATCH  /api/apps/:id/env/:key
DELETE /api/apps/:id/env/:key
```

## 8. Database And Backup Endpoints

```text
GET    /api/databases
POST   /api/databases
POST   /api/databases/:id/start
POST   /api/databases/:id/stop
GET    /api/backups
POST   /api/backups
POST   /api/backups/:id/run
PATCH  /api/backups/:id
```

