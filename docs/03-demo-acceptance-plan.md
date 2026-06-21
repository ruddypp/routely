# Routely Demo Acceptance Plan

Status: Canonical acceptance plan
Owner: PM, QA, Security
Last updated: 2026-06-22

## Acceptance Model

Public alpha readiness is accepted through three demos that prove the Compose-first, dashboard-first Routely direction for a solo operator:

1. Local dashboard-first demo: three apps and one database are registered, bulk-started, and managed individually.
2. One-VPS operations demo: one app runs on one VPS with honest domain/proxy, env/secrets, deploy history, logs, health, database, and backup state.
3. GitHub redeploy demo: a configured branch push redeploys the intended app, and a broken deploy exposes phase and logs.

Each demo must pass manual smoke steps, relevant automated checks, QA review, and Security review before release readiness is marked green. Public docs must describe only verified behavior; unimplemented dashboard controls or production Compose paths must be hidden, disabled, or explicitly marked deferred.

## Demo 1: Local Dashboard-First Start All

### Acceptance Criteria

- A clean workspace can be initialized with `routely init`.
- Three app entries can be registered or edited with names, paths, commands or Compose metadata, ports, dependencies, health metadata, and enablement state. Use verified CLI commands until the dashboard creation/editing path is fully implemented.
- One database service can be registered with `routely db add` or equivalent documented config using an implemented Compose-backed preset.
- App enablement is preserved in `routely.yml`, SQLite, daemon DTOs, same-origin `/api/*` routes, CLI output, and dashboard state where those surfaces are implemented.
- Bulk start starts every enabled local `command` or `compose` app/service in dependency order and skips disabled apps without deleting them from the registry.
- Disabled apps remain visible and editable with clear copy explaining that they are excluded from future bulk starts.
- Per-app stop affects the current running instance without changing app enablement.
- Port conflicts are reported before causing confusing partial startup where practical.
- CLI output prints useful status, skipped-disabled counts where implemented, and URLs.
- `routely ps` shows registered workloads with human-readable status, driver, port, and enablement.
- `routely logs <app>` shows recent logs; follow mode works if documented.
- `routely down` stops managed local workloads cleanly where practical.
- Dashboard shows real app/service status, URLs, lifecycle controls, enablement, and logs through same-origin `/api/*` routes.
- Intentional app failure leaves a visible failed/crashed state and useful log output.
- No dashboard module shows mock success, placeholder readiness, or enabled controls for unsupported actions.

### Manual Smoke Steps

Use the final README commands when available. Until then, validate this shape:

```bash
npm install
npm run build --workspace apps/cli
mkdir -p /tmp/routely-local-demo
cd /tmp/routely-local-demo
routely init
routely add /path/to/app-a --name app-a --command "npm run dev" --port 3101
routely add /path/to/app-b --name app-b --command "npm run dev" --port 3102
routely add /path/to/app-c --name app-c --command "npm run dev" --port 3103
routely db add postgres --name postgres --port 5432
routely doctor
routely
routely ps
routely logs app-a
routely down
```

Then verify the dashboard path:

- Create or edit app entries from the dashboard where implemented; otherwise confirm the dashboard explains that the CLI/config path is the current alpha fallback.
- Mark one app disabled where implemented, run bulk start, and confirm the disabled app is skipped but still visible.
- Start all enabled apps, stop one running app individually, and confirm the other running apps stay up.

The exact example app paths, enable/disable flow, and dashboard creation path must be replaced with verified public alpha behavior before release.

### Automated Checks If Available

- `npm run lint`
- `npm run test --workspace apps/cli`
- Local lifecycle, workspace resolution, enablement filtering, port detection, dependency ordering, config normalization, and log access tests.
- `npm run test --workspace apps/web` for dashboard route handlers or UI state touched by local lifecycle and enablement.

## Demo 2: One-VPS Compose Operations

### Acceptance Criteria

- A documented Linux VPS baseline is available: OS assumption, Node/npm, Docker, Docker Compose, open ports, DNS/domain access, admin auth, and data directory requirements.
- `routely server init --data-dir <path>` prepares production state or the alpha bootstrap alternative is documented honestly.
- `routely server doctor` reports actionable checks for Docker, Compose where required, Node/npm, data directory, disk, memory, public IP, auth, and required ports.
- Production private mutation APIs require admin token/auth.
- A verified deploy path exists for one app on one VPS. The target model is Compose-backed app operation; Dockerfile-only deploy foundations may be used as an implementation bridge only if public docs label that honestly.
- Deployment records include phase, status, trigger, timestamps, latest successful deployment where practical, and log links.
- Deployment logs are persisted and inspectable from CLI and dashboard.
- Build/start/healthcheck failures mark the deployment failed with a failing phase and relevant logs.
- Domain/proxy state distinguishes missing DNS, DNS mismatch, generated route, pending TLS, verified TLS, failed TLS, and not configured states where implemented.
- DNS verification checks against `ROUTELY_SERVER_PUBLIC_IP` when possible.
- Routely does not fake certificate success or route success just because config was generated.
- Env/secrets can be saved, listed in redacted form, and reflected in restart/redeploy-needed state where implemented.
- Databases are internal-only by default; database records, backup jobs/runs, local backup file metadata, and retention state are represented honestly where implemented.
- Health checks and narrow metrics support demo diagnosis without implying a full observability product.

### Manual Smoke Steps

Use a disposable VPS and domain. Final commands must be reconciled with actual CLI behavior before release:

```bash
routely server init --data-dir /var/lib/routely
routely server doctor
routely add /path/to/app --name web --driver <verified-driver> --port 3000 --health-path /health
routely deploy web --watch
routely domain root example.com
routely domain add web web.example.com
routely domain verify web.example.com
routely env web
routely health web
routely logs web
curl -I https://web.example.com
```

If `<verified-driver>` is still `dockerfile`, public docs must say production Compose parity is a hardening target and not present Dockerfile-only behavior as the final Compose-first model.

### Automated Checks If Available

- `npm run lint`
- `npm run test --workspace apps/cli`
- Docker/Compose helper tests.
- Deployment state transition tests.
- Domain/proxy/DNS verification tests.
- Env/secrets redaction tests.
- Database/backup state tests where touched.
- Production unauthenticated API rejection tests.
- `node --check apps/daemon/src/server.js` if daemon code changes.

## Demo 3: GitHub Redeploy And Diagnosis

### Acceptance Criteria

- GitHub App setup docs name required server-side env vars and webhook URL expectations.
- App/repo/branch mapping can be configured for an already deployed app.
- Webhook requests validate `X-Hub-Signature-256` before acting.
- Duplicate delivery IDs are ignored where practical.
- Pushes to unconfigured branches do not deploy the app.
- Pushes to the configured branch create a deployment for the intended app.
- Deployment records include repo, branch, commit SHA, trigger/source, status, and failure details where available.
- A deliberately broken build/start/healthcheck marks the deployment failed and exposes useful logs.
- The previous successful deployment remains identifiable and live where practical.
- Dashboard shows GitHub connection state, latest delivery/deploy, ignored/failing events, deploy history, and a path to logs.

### Manual Smoke Steps

Use a real test repo and branch:

```bash
routely github status
routely github installation add 123456 --account your-github-login
routely github repo add owner/repo --branch main --installation-id 123456
routely github connect web owner/repo --branch main
git push origin main
routely deployments web
routely logs web
# Push a deliberate Dockerfile/build/start/healthcheck failure.
git push origin main
routely deployments web
routely logs web
```

### Automated Checks If Available

- `npm run lint`
- `npm run test --workspace apps/cli`
- GitHub signature validation tests.
- Branch filtering tests.
- Delivery dedupe tests.
- Deployment creation and failure log persistence tests.
- Web route handler tests for GitHub status/repo/webhook paths if touched.

## QA Checklist

- [ ] Local dashboard-first demo run recorded with date, OS, Node/npm versions, Docker/Compose versions, exact commands, expected/actual results, enablement evidence, and screenshots if dashboard evidence is useful.
- [ ] Local failure case recorded: disabled app skip, port conflict, or app crash, including log evidence.
- [ ] One-VPS demo run recorded with provider, OS image, domain/DNS provider, public IP handling, exact commands, verified deploy driver, expected/actual results, and screenshots/log snippets where useful.
- [ ] VPS failure case recorded: broken build/start, failed healthcheck, DNS mismatch, HTTPS pending/failure, or env/secret misconfiguration.
- [ ] GitHub demo run recorded with repo/branch, delivery IDs, commit SHAs, expected/actual deploy behavior, and log availability.
- [ ] Dashboard smoke covers desktop, tablet, and mobile for demo-critical views.
- [ ] Any blocker is filed as concrete Backend or Frontend instructions with severity and reproduction steps.

## Security Checklist

- [ ] Local daemon/dashboard binding and same-origin access are verified.
- [ ] Production private daemon/API mutation paths require auth.
- [ ] Browser code does not call the daemon directly.
- [ ] Secrets are not exposed in `routely.yml`, API responses, logs, screenshots, or notification target DTOs beyond intentional redacted forms.
- [ ] GitHub webhooks require valid signatures and respect branch/repo mapping.
- [ ] Delivery dedupe/replay behavior is reviewed.
- [ ] Notification outbound URLs reject unsafe protocols, credentials, loopback/private/link-local targets where implemented.
- [ ] Docker/Compose/proxy exposure does not publish databases/internal services by default.
- [ ] Backup files are treated as sensitive and not publicly served.
- [ ] Untrusted log text, commit messages, branch names, app names, and domain names are safely rendered in the dashboard.

## Release Readiness Gate

Public alpha is not ready until all of the following are true:

- [ ] Local dashboard-first demo passes from public docs without private chat context.
- [ ] One-VPS demo passes on one disposable VPS with a real domain and honest domain/proxy/HTTPS state.
- [ ] GitHub demo passes with one successful redeploy and one intentional failed deploy showing useful logs.
- [ ] Demo-critical dashboard views use real data and no mock-only control appears as implemented.
- [ ] QA E2E final reports exist under `docs/qa/`.
- [ ] Security final review exists under `docs/security/`.
- [ ] `npm run lint` passes or any exception is documented with exact command output and owner.
- [ ] Relevant workspace tests/builds pass or exceptions are documented with exact command output and owner.
- [ ] README limitations name deferred scope clearly.
- [ ] Routely Lead has approved any destructive cleanup, credential action, or public release step.
