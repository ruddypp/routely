# Routely Demo Acceptance Plan

Status: Canonical demo acceptance criteria
Owner: PM
Last updated: 2026-06-21

## Acceptance Model

Public alpha readiness is accepted through three demos:

1. Local demo: three local apps and one database started by `routely`.
2. VPS demo: one Dockerfile app deployed to one VPS with domain and HTTPS.
3. GitHub demo: push to configured branch triggers auto-redeploy and broken deploy logs are inspectable.

Each demo must pass manual smoke steps, relevant automated checks, QA review, and Security review before release readiness is marked green.

## Demo 1: Local Runner

### Acceptance Criteria

- A clean workspace can be initialized with `routely init`.
- Three local command apps can be registered with names, paths, commands, ports, and health metadata where available.
- One database service can be registered with `routely db add` or equivalent documented config using an implemented Compose-backed preset.
- Running `routely` from the workspace starts the daemon, dashboard, database service, and all three apps.
- Services start before dependent apps.
- Port conflicts are reported before causing confusing partial startup where practical.
- CLI output prints useful status and URLs.
- `routely ps` shows all four workloads with human-readable statuses.
- `routely logs <app>` shows recent logs; follow mode works if documented.
- `routely down` stops managed local workloads cleanly where practical.
- Dashboard shows real app/service status, URLs, lifecycle controls, and logs through same-origin `/api/*`.
- Intentional app failure leaves a visible failed/crashed state and useful log output.

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

The exact example app paths and commands must be replaced with verified public alpha examples before release.

### Automated Checks If Available

- `npm run lint`
- `npm run test --workspace apps/cli`
- Local lifecycle, workspace resolution, port detection, dependency ordering, config normalization, and log access tests.
- `npm run test --workspace apps/web` for dashboard route handlers touched by local lifecycle.

## Demo 2: VPS Dockerfile Deploy With Domain/HTTPS

### Acceptance Criteria

- A documented Linux VPS baseline is available: OS assumption, Node/npm, Docker, Docker Compose, open ports, DNS/domain access, and data directory requirements.
- `routely server init --data-dir <path>` prepares production state or the alpha bootstrap alternative is documented honestly.
- `routely server doctor` reports actionable checks for Docker, Compose where required, Node/npm, data directory, disk, memory, public IP, and required ports.
- Production private mutation APIs require admin token/auth.
- A Dockerfile app can be registered and deployed with deployment phases recorded.
- Deployment logs are persisted and inspectable from CLI and dashboard.
- Build/start/healthcheck failures mark the deployment failed with a failing phase and relevant logs.
- A domain can be added for the latest successful deployment.
- DNS verification checks against `ROUTELY_SERVER_PUBLIC_IP` when possible.
- Proxy/HTTPS state is honest: generated route, pending, verified, failed, or not configured must be distinguishable.
- Routely does not fake certificate success.

### Manual Smoke Steps

Use a disposable VPS and domain. Final commands must be reconciled with actual CLI behavior before release:

```bash
routely server init --data-dir /var/lib/routely
routely server doctor
routely add /path/to/dockerfile-app --name web --driver dockerfile --port 3000 --health-path /health
routely deploy web --watch
routely domain root example.com
routely domain add web web.example.com
routely domain verify web.example.com
routely logs web
curl -I https://web.example.com
```

### Automated Checks If Available

- `npm run lint`
- `npm run test --workspace apps/cli`
- Docker helper tests.
- Deployment state transition tests.
- Domain/proxy/DNS verification tests.
- Env/secrets redaction tests.
- Production unauthenticated API rejection tests.
- `node --check apps/daemon/src/server.js` if daemon code changes.

## Demo 3: GitHub Push Auto-Redeploy

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
- Dashboard shows GitHub connection state, latest delivery/deploy, ignored/failing events, and a path to logs.

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

- [ ] Local demo run recorded with date, OS, Node/npm versions, Docker version, exact commands, expected/actual results, and screenshots if dashboard evidence is useful.
- [ ] Local failure case recorded: port conflict or app crash, including log evidence.
- [ ] VPS demo run recorded with provider, OS image, domain/DNS provider, public IP handling, exact commands, expected/actual results, and screenshots/log snippets where useful.
- [ ] VPS failure case recorded: broken Dockerfile, failed healthcheck, DNS mismatch, or HTTPS pending/failure.
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
- [ ] Docker/proxy exposure does not publish databases/internal services by default.
- [ ] Backup files are treated as sensitive and not publicly served.
- [ ] Untrusted log text, commit messages, branch names, app names, and domain names are safely rendered in the dashboard.

## Release Readiness Gate

Public alpha is not ready until all of the following are true:

- [ ] Local demo passes from public docs without private chat context.
- [ ] VPS demo passes on one disposable VPS with a real domain and honest HTTPS/proxy state.
- [ ] GitHub demo passes with one successful redeploy and one intentional failed deploy showing useful logs.
- [ ] Demo-critical dashboard views use real data and no mock-only control appears as implemented.
- [ ] QA E2E final reports exist under `docs/qa/`.
- [ ] Security final review exists under `docs/security/`.
- [ ] `npm run lint` passes or any exception is documented with exact command output and owner.
- [ ] Relevant workspace tests/builds pass or exceptions are documented with exact command output and owner.
- [ ] README limitations name deferred scope clearly.
- [ ] Routely Lead has approved any archive/delete cleanup with the user.
