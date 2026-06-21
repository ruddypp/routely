# Routely Context

This file is the domain glossary for agents working on Routely. Keep it free of implementation details; specs and decisions belong in `docs/` and ADRs.

## Glossary

**Routely** — The product: a dashboard-first control plane for solo developers that runs Compose-backed apps locally and on one VPS.

**Solo operator** — The intended Routely user: one developer who owns the instance and manages their own apps without shared administration workflows.

**App registry** — The shared list of apps and services Routely manages. It is the mental model that connects local development and one-VPS operation.

**Managed app** — An app or service entry Routely can run, stop, disable, observe, and deploy through dashboard-first workflows.

**App enablement** — The user-controlled state that decides whether a managed app participates in bulk start operations while keeping the app registered for later use.

**Bulk start** — The operator action that starts every enabled managed app together while still allowing any app to be stopped or disabled individually afterward.

**Compose-backed app** — A managed app whose runtime is described as a Compose project so Routely can use one operational model locally and on one VPS.

**Local runner** — The local workflow started by `routely`, responsible for starting registered local apps/services, showing status, streaming logs, and stopping managed processes on exit.

**Workspace root** — The user's active app workspace where `routely.yml` and local `.routely/` state apply.

**Routely repo root** — The installed/development copy of Routely's source code. Do not confuse this with the workspace root.

**Daemon** — The private HTTP process that owns Routely runtime operations and state access. Browser code must not call it directly.

**Dashboard** — The Next.js web UI for local and production operations. Dashboard browser code calls same-origin `/api/*` route handlers.

**Dashboard-first management** — The product principle that app registration, lifecycle controls, deployment setup, and operational diagnosis should be doable from the dashboard without requiring manual config editing for normal use.

**Dokploy-inspired operation** — The Routely product shape for domain/proxy, env/secrets, databases/backups, logs, deploy history, and health checks, adapted for one solo-operated VPS.

**9router-light experience** — The Routely interaction style: simple, fast, and low-ceremony even when exposing production operations.

**Dashboard API route** — A same-origin Next.js route handler that proxies or adapts daemon behavior for the dashboard.

**One-VPS operation** — Routely mode for one Linux VPS where private infrastructure actions require admin auth and the same registry model should remain recognizable from local use.

**Deployment** — A production attempt to turn an app source into a running service. Deployment state includes phases, logs, health, and success/failure history.

**Proxy route** — The generated routing state that connects a verified domain to the latest successful deployment through the production proxy model.

**Domain verification** — The check that a DNS record points at the expected server IP before Routely creates or activates production routing.

**Stored secret** — A sensitive app value saved for runtime use. After save, Routely should expose only metadata such as key/name/status, never the raw value.

**Health sample** — A recorded observation of app health used by the dashboard, CLI, and production operators to understand current status.

**Metrics sample** — A recorded operational measurement for app or server visibility. Retention should stay bounded.

**Database service** — A managed database record/service, usually Compose-backed. Production databases are internal-only by default.

**Backup job** — The configured schedule and retention policy for backing up a database service.

**Backup run** — One execution attempt of a backup job, including status, message, file metadata, and retention outcome.

**Notification channel** — A configured outbound notification target such as generic webhook, Discord, or Telegram.

**Delivery attempt** — One audited attempt to send a notification event to a notification channel.

**Future scope** — A visible but intentionally inactive feature area that is deferred by the roadmap and must not be presented as implemented.
