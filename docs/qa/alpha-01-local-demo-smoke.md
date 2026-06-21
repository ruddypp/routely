# ALPHA-01 Local Demo Smoke Report

Status: FAIL - required failure-state acceptance does not pass
Owner: QA E2E
Run date: 2026-06-21
Repo commit under test: `1f4d3e9ecfd72bb0a56ffa2d40a83cc72795f5d2` (`test: cover local demo quickstart`)

## Scope

Validated Demo 1 from `docs/03-demo-acceptance-plan.md` using the README local quick start: initialize a clean workspace, register three local command apps and one Compose-backed Postgres service, start with `routely`, inspect CLI status/logs, inspect dashboard same-origin `/api/*` behavior, run an intentional app failure case, and stop with `routely down`.

No production code was edited for this QA pass.

## Environment

- Host OS: `Linux ruddypp 7.0.12-101.fc43.x86_64 #1 SMP PREEMPT_DYNAMIC Thu Jun 11 01:32:26 UTC 2026 x86_64 GNU/Linux`
- Node: `v24.12.0`
- npm: `11.6.2`
- Docker: `Docker version 29.5.3, build d1c06ef`
- Docker Compose: `Docker Compose version v5.1.4`
- Git branch: `main`
- Git head: `1f4d3e9ecfd72bb0a56ffa2d40a83cc72795f5d2`
- Smoke workspace: `/tmp/routely-alpha-01-local-demo`
- CLI used: `node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js`

README says to install the CLI globally with `npm install -g .`; QA did not rewrite the global install during this run. The repo already had a global `routely`, but QA used the freshly built repo CLI directly to avoid stale global state and to keep the smoke tied to the commit under test.

## Commands Run

```bash
npm install
npm run build --workspace apps/cli
node apps/cli/dist/index.js --help
```

```bash
rm -rf /tmp/routely-alpha-01-local-demo
mkdir -p /tmp/routely-alpha-01-local-demo
cd /tmp/routely-alpha-01-local-demo
export ROUTELY_REPO=/home/ruddypp/Documents/work/routely
export ROUTELY="node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js"
$ROUTELY init
$ROUTELY add "$ROUTELY_REPO/examples/hello-command" --name web --command "PORT=3101 ROUTELY_EXAMPLE_NAME=web ROUTELY_EXAMPLE_ROLE=frontend npm run dev" --port 3101 --health-path /health
$ROUTELY add "$ROUTELY_REPO/examples/hello-command" --name api --command "PORT=3102 ROUTELY_EXAMPLE_NAME=api ROUTELY_EXAMPLE_ROLE=api npm run dev" --port 3102 --health-path /health
$ROUTELY add "$ROUTELY_REPO/examples/hello-command" --name worker --command "PORT=3103 ROUTELY_EXAMPLE_NAME=worker ROUTELY_EXAMPLE_ROLE=worker npm run dev" --port 3103 --health-path /health
$ROUTELY db add postgres --name postgres --port 5432
$ROUTELY doctor
$ROUTELY
```

In another shell while `routely` was running:

```bash
cd /tmp/routely-alpha-01-local-demo
node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js ps
node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js logs web
node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js logs postgres
curl -i --max-time 10 http://127.0.0.1:3101/health
curl -i --max-time 10 http://127.0.0.1:3102/health
curl -i --max-time 10 http://127.0.0.1:3103/health
curl -i --max-time 10 http://localhost:3030/api/health
curl -i --max-time 10 http://localhost:3030/api/apps
curl -i --max-time 10 http://localhost:3030/api/server/status
curl -i --max-time 10 http://localhost:3030/api/databases
curl -i --max-time 10 http://localhost:3030/api/apps/1/logs
curl -i --max-time 10 http://localhost:3030/api/apps/4/logs
```

Browser dashboard smoke used Playwright from the repo install:

```bash
node --input-type=module <<'NODE'
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const requests = [];
const failures = [];
const consoleMessages = [];
page.on('request', req => {
  const url = req.url();
  if (url.includes('/api/') || url.includes('9977')) requests.push(`${req.method()} ${url}`);
});
page.on('requestfailed', req => failures.push(`${req.method()} ${req.url()} ${req.failure()?.errorText ?? ''}`));
page.on('console', msg => {
  if (['error', 'warning'].includes(msg.type())) consoleMessages.push(`${msg.type()}: ${msg.text()}`);
});
await page.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1000);
await page.getByRole('button', { name: /^Apps/ }).first().click();
await page.waitForTimeout(500);
const appsText = await page.locator('body').innerText();
await page.getByRole('button', { name: 'Logs Runtime output' }).click();
await page.waitForTimeout(3000);
const logsText = await page.locator('body').innerText();
console.log('apps-view-has-web-api-worker-postgres=' + ['web','api','worker','postgres'].map(name => `${name}:${appsText.includes(name)}`).join(', '));
console.log('logs-view-has-api-log=' + logsText.includes('api running at http://127.0.0.1:3102'));
console.log('api-requests=' + [...new Set(requests)].join(' | '));
console.log('direct-daemon-requests=' + requests.filter(r => r.includes('9977')).join(' | '));
console.log('request-failures=' + failures.join(' | '));
console.log('console-warnings-errors=' + consoleMessages.join(' | '));
await browser.close();
NODE
```

Intentional failure and shutdown:

```bash
cd /tmp/routely-alpha-01-local-demo
ROUTELY='node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js'
$ROUTELY add /tmp/routely-alpha-01-local-demo --name broken --command "node -e \"console.error('intentional alpha smoke failure'); process.exit(42)\"" --port 3999
$ROUTELY ps
$ROUTELY restart broken || true
$ROUTELY ps
$ROUTELY logs broken || true
curl -i --max-time 10 http://localhost:3030/api/apps/5/logs
$ROUTELY down
$ROUTELY ps
```

The long-running `routely` foreground process was then stopped with `Ctrl-C`.

## Expected vs Actual

| Area | Expected | Actual | Result |
| --- | --- | --- | --- |
| Install/build | README source install/build works. | `npm install` completed with no package changes; `npm run build --workspace apps/cli` passed; `node apps/cli/dist/index.js --help` printed command help. npm reported two moderate audit findings. | Pass with note |
| Workspace init | `routely init` creates clean workspace state in the smoke workspace. | Created `/tmp/routely-alpha-01-local-demo/routely.yml` and `.routely/routely.db`. | Pass |
| App registration | Three command apps register with names, paths, commands, ports, and health paths. | `web`, `api`, and `worker` registered against `examples/hello-command` on ports `3101`, `3102`, and `3103` with `/health`. | Pass |
| Database registration | `routely db add postgres --name postgres --port 5432` registers an implemented Compose service. | `postgres` registered with `driver: compose`, `image: postgres:16`, `internal: true`, and `POSTGRES_HOST_AUTH_METHOD: trust`. | Pass |
| Doctor | Local readiness checks are actionable. | `OK node`, `OK npm`, `OK docker`, `OK ports: no conflicts detected`. | Pass |
| Startup | `routely` starts daemon, dashboard, database service, and all three apps. | CLI printed dashboard `http://localhost:3030`, daemon `http://127.0.0.1:9977`, `Apps: 4 local resource(s)`. Postgres container started; apps printed `web/api/worker running at http://127.0.0.1:<port>`. | Pass |
| CLI status | `routely ps` shows four workloads with human-readable statuses. | `api`, `postgres`, `web`, and `worker` all showed `running` with drivers and ports. | Pass |
| CLI logs | `routely logs <app>` shows recent logs. | `routely logs web` showed the start command and `web running at http://127.0.0.1:3101`; `routely logs postgres` showed Compose create/start output. | Pass |
| App health | Registered health endpoints respond. | `/health` returned HTTP 200 for ports `3101`, `3102`, and `3103`. | Pass |
| Dashboard same-origin API | Dashboard uses same-origin `/api/*`, not direct browser daemon calls. | Browser captured only `http://localhost:3030/api/*` requests; `direct-daemon-requests=` was empty; no request failures or console warnings/errors. | Pass |
| Dashboard real data | Dashboard overview/apps/logs show live workspace data. | Apps view contained `web`, `api`, `worker`, `postgres`, and `running`; Logs view rendered recent `api` log output via `/api/apps/2/logs`. | Pass |
| Database dashboard API | Local service should be visible in service/database UI. | `/api/apps` includes `postgres` as a running database resource, but `/api/databases` returned `{"databases":[]}`. | Finding FE-01 |
| Intentional app failure | Intentional app failure leaves a visible failed/crashed state and useful logs. | Failing command logged `intentional alpha smoke failure`, but CLI/API status became `stopped`, not `failed` or `crashed`. | Finding BE-01 / FE-02 |
| Shutdown | `routely down` stops managed local workloads cleanly where practical. | `down` stopped `postgres`, `api`, `web`, and `worker`; `ps` then showed all registered resources `stopped`. The foreground daemon/dashboard process remained active until `Ctrl-C`, which is consistent with the running `routely` process model but should be documented if intentional. | Pass with note |

## Key Evidence

`routely doctor`:

```text
Workspace: /tmp/routely-alpha-01-local-demo
OK node: v24.12.0
OK npm: 11.6.2
OK docker: Docker version 29.5.3, build d1c06ef
OK ports: no conflicts detected
```

`routely` startup excerpt:

```text
Routely starting...
Workspace: /tmp/routely-alpha-01-local-demo
Dashboard: http://localhost:3030
Daemon:    http://127.0.0.1:9977
Apps:      4 local resource(s)
Routely daemon running at http://127.0.0.1:9977
Routely database: /tmp/routely-alpha-01-local-demo/.routely/routely.db
api running at http://127.0.0.1:3102
web running at http://127.0.0.1:3101
worker running at http://127.0.0.1:3103
Container routely_tmp_routely-alpha-01-local-demo-postgres-1 Started
```

`routely ps` while running:

```text
Database: /tmp/routely-alpha-01-local-demo/.routely/routely.db
api       running  command  :3102  enabled  /home/ruddypp/Documents/work/routely/examples/hello-command
postgres  running  compose  :5432  enabled  -
web       running  command  :3101  enabled  /home/ruddypp/Documents/work/routely/examples/hello-command
worker    running  command  :3103  enabled  /home/ruddypp/Documents/work/routely/examples/hello-command
```

`routely logs web`:

```text
[2026-06-21T08:44:50.578Z] starting PORT=3101 ROUTELY_EXAMPLE_NAME=web ROUTELY_EXAMPLE_ROLE=frontend npm run dev

> routely-hello-command@0.1.0 dev
> node server.js

web running at http://127.0.0.1:3101
```

Same-origin `/api/health` excerpt:

```json
{"connected":true,"daemonUrl":"http://127.0.0.1:9977","health":{"ok":true,"service":"routely-daemon","workspace":"/tmp/routely-alpha-01-local-demo","apps":[{"name":"api","status":"running"},{"name":"postgres","type":"database","driver":"compose","status":"running"},{"name":"web","status":"running"},{"name":"worker","status":"running"}]}}
```

Browser dashboard network summary:

```text
apps-view-has-web-api-worker-postgres=web:true, api:true, worker:true, postgres:true
logs-view-has-api-log=true
api-requests=GET http://localhost:3030/api/health | GET http://localhost:3030/api/apps | GET http://localhost:3030/api/server/status | GET http://localhost:3030/api/deployments | GET http://localhost:3030/api/domains | GET http://localhost:3030/api/proxy/routes | GET http://localhost:3030/api/github/status | GET http://localhost:3030/api/metrics?refresh=false | GET http://localhost:3030/api/databases | GET http://localhost:3030/api/backups | GET http://localhost:3030/api/notifications | GET http://localhost:3030/api/apps/2/env | GET http://localhost:3030/api/apps/2/health | GET http://localhost:3030/api/apps/2/metrics | GET http://localhost:3030/api/apps/2/logs
direct-daemon-requests=
request-failures=
console-warnings-errors=
```

Intentional failure evidence:

```text
Registered broken.
Command: node -e "console.error('intentional alpha smoke failure'); process.exit(42)"

Restarted broken (119289).

broken  stopped  command  :3999  enabled  /tmp/routely-alpha-01-local-demo

[2026-06-21T08:48:18.210Z] starting node -e "console.error('intentional alpha smoke failure'); process.exit(42)"
intentional alpha smoke failure

[2026-06-21T08:48:18.614Z] reconciled stale pid 119289
```

Shutdown evidence:

```text
Stopped postgres.
Stopped api (114700).
Stopped web (115022).
Stopped worker (115035).

api       stopped  command  :3102  enabled  /home/ruddypp/Documents/work/routely/examples/hello-command
broken    stopped  command  :3999  enabled  /tmp/routely-alpha-01-local-demo
postgres  stopped  compose  :5432  enabled  -
web       stopped  command  :3101  enabled  /home/ruddypp/Documents/work/routely/examples/hello-command
worker    stopped  command  :3103  enabled  /home/ruddypp/Documents/work/routely/examples/hello-command
```

## Generated Config Shape

```yaml
version: 1
name: routely-local
dashboard:
  port: 3030
apps:
  - name: web
    type: app
    preset: custom
    driver: command
    path: /home/ruddypp/Documents/work/routely/examples/hello-command
    dev: PORT=3101 ROUTELY_EXAMPLE_NAME=web ROUTELY_EXAMPLE_ROLE=frontend npm run
      dev
    port: 3101
    healthcheck:
      path: /health
      expected_status: 200
  - name: api
    type: app
    preset: custom
    driver: command
    path: /home/ruddypp/Documents/work/routely/examples/hello-command
    dev: PORT=3102 ROUTELY_EXAMPLE_NAME=api ROUTELY_EXAMPLE_ROLE=api npm run dev
    port: 3102
    healthcheck:
      path: /health
      expected_status: 200
  - name: worker
    type: app
    preset: custom
    driver: command
    path: /home/ruddypp/Documents/work/routely/examples/hello-command
    dev: PORT=3103 ROUTELY_EXAMPLE_NAME=worker ROUTELY_EXAMPLE_ROLE=worker npm run
      dev
    port: 3103
    healthcheck:
      path: /health
      expected_status: 200
services:
  - name: postgres
    type: database
    preset: postgres
    driver: compose
    port: 5432
    env:
      POSTGRES_HOST_AUTH_METHOD: trust
      POSTGRES_DB: app
    image: postgres:16
    internal: true
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

The wrapped `dev` scalars are valid YAML, and the CLI read them back correctly during startup.

## Findings

### BE-01 - Failed command apps are reported as stopped, not failed/crashed

Severity: High
Owner: Backend

Scenario: A registered command app exits immediately with a non-zero exit code.

Reproduction steps:

```bash
cd /tmp/routely-alpha-01-local-demo
node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js add /tmp/routely-alpha-01-local-demo --name broken --command "node -e \"console.error('intentional alpha smoke failure'); process.exit(42)\"" --port 3999
node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js restart broken || true
node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js ps
node /home/ruddypp/Documents/work/routely/apps/cli/dist/index.js logs broken
```

Expected result: The failed process leaves a visible `failed` or `crashed` state with exit metadata, while preserving useful logs.

Actual result: `ps` and `/api/apps/5/logs` reported `broken` as `stopped`; logs contained the failure text and stale PID reconciliation but not a failed/crashed status.

Evidence: `broken stopped command :3999 enabled /tmp/routely-alpha-01-local-demo`; log contained `intentional alpha smoke failure` and `reconciled stale pid 119289`.

Verification command: rerun the reproduction above and confirm `routely ps` plus `/api/apps` expose a failure-specific status after the non-zero exit.

Remediation instructions: Persist command process exit code, signal, and finished timestamp. Differentiate user-requested stops from unexpected non-zero exits in runtime reconciliation. Expose the failure status in CLI `ps`, daemon `/apps`, and app detail/log responses so the dashboard can render a crash state.

### FE-01 - Database API does not expose the local Compose-backed Postgres service

Severity: Medium
Owner: Frontend + Backend

Scenario: The local demo registers Postgres through `routely db add postgres --name postgres --port 5432`.

Reproduction steps:

```bash
curl -i --max-time 10 http://localhost:3030/api/apps
curl -i --max-time 10 http://localhost:3030/api/databases
```

Expected result: Dashboard service/database surfaces consistently expose the local Compose-backed Postgres service, or the database panel clearly scopes itself to production-only records.

Actual result: `/api/apps` included `postgres` with `type: database`, `driver: compose`, and `status: running`; `/api/databases` returned `{"databases":[]}`.

Evidence: Same smoke run, same workspace, same-origin API responses above.

Verification command: after the local demo starts, open the dashboard Databases view and confirm the local Postgres service is either shown with live status/log access or the UI copy and API contract make clear that `/api/databases` is not the local service list.

Remediation instructions: Decide whether local Compose services belong in `/api/databases` or only `/api/apps`. If they belong in `/api/databases`, map local database resources into that response. If not, update the dashboard Databases view and API naming/copy to avoid implying the local Postgres service is missing.

### FE-02 - Dashboard cannot show a crash state until Backend exposes one

Severity: High
Owner: Frontend, blocked by Backend BE-01

Scenario: The intentional failure app is visible in `/api/apps` and `/api/apps/5/logs`, but its status is `stopped`.

Reproduction steps:

```bash
curl -sS http://localhost:3030/api/apps | rg 'broken|stopped|failed|crashed'
curl -sS http://localhost:3030/api/apps/5/logs | rg 'intentional alpha smoke failure|status'
```

Expected result: The dashboard Apps/Health/Logs views show a failed/crashed visual state for unexpected non-zero exits.

Actual result: The API only exposes `stopped`, so the dashboard cannot distinguish a crash from an intentional stop.

Evidence: `/api/apps/5/logs` returned the failure log and app `status: stopped`.

Verification command: after BE-01 is fixed, rerun the browser smoke and confirm the broken app renders a failed/crashed state in Apps/Health/Logs without console errors.

Remediation instructions: Once Backend provides failure status and exit metadata, render a distinct failed/crashed badge, keep log access available, and avoid presenting restart/stop state as if the app was intentionally stopped.

## Notes and Risks

- `routely down` stops managed app/database workloads but does not terminate the foreground daemon/dashboard process. QA stopped the foreground process with `Ctrl-C`. This is acceptable if documented as the intended process model; otherwise clarify README expectations.
- A host Postgres was already listening on `127.0.0.1:5432` after the smoke (`/usr/bin/postgres -D /var/lib/pgsql/data`). The Routely demo container itself was `Exited (0)` after `down`, so the remaining `5432` listener was not attributed to the Routely smoke.
- During final post-smoke inspection, another Maestro Backend agent started a separate smoke run using port `3102`; QA did not terminate that unrelated process.
- No dashboard screenshots were committed. Browser automation captured network, console, and UI text evidence directly.
- npm reported two moderate audit findings during `npm install`; this smoke did not audit or remediate dependency vulnerabilities.

## Final Gate Decision

ALPHA-01 local demo is not ready to mark green. The happy path starts, reports status/logs, renders dashboard data, uses same-origin `/api/*`, and stops managed workloads. The required intentional failure acceptance does not pass because unexpected non-zero command exits are flattened to `stopped` instead of a visible failed/crashed state.
