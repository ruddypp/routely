# ALPHA-01 Local Demo Smoke Report

Status: PASS WITH BLOCKERS
Owner: QA E2E
Date: 2026-06-21
Validated commit: `1f4d3e9` (`test: cover local demo quickstart`)

## Scope

Validated Demo 1 from `docs/03-demo-acceptance-plan.md` against current `main`: initialize a clean workspace, register three local command apps and one Compose-backed Postgres service, start with `routely`, inspect CLI status/logs, inspect daemon/dashboard status, and stop workloads.

Also reviewed the requested implementation commits:

- `eb44521` added the local demo example, CLI quick-start coverage, port preflight hardening, and `examples/local-demo/routely.yml`.
- `4c22c67` hardened dashboard state rendering in `apps/web/src/app/dashboard-client.tsx`.
- `1f4d3e9` updated README local quick-start docs and added CLI quick-start test coverage.

## Environment

- Host OS: Linux ruddypp 7.0.12-101.fc43.x86_64
- Node: v24.12.0
- npm: 11.6.2
- Docker: 29.5.3
- Repo: `/home/ruddypp/Documents/work/routely`
- Branch/HEAD: `main` at `1f4d3e9`
- CLI invocation: `node ../../apps/cli/dist/index.js` from smoke workspaces, because this Maestro role must not run `npm install -g .` outside the repo write boundary.

## Verification Commands

| Command | Result | Notes |
| --- | --- | --- |
| `npm run lint` | PASS | Completed with no reported lint errors. |
| `npm run build --workspace apps/cli` | PASS | `tsc -p tsconfig.json && node scripts/write-dev-root.js`. |
| `npx tsc --noEmit --project apps/web/tsconfig.json` | PASS | Completed with no type errors. |
| `npm run test --workspace apps/cli` | PASS ON RERUN | First run timed out with `Test timed out in 5000ms`; immediate verbose rerun completed: 15 files, 61 tests passed in 29.45s. |

Verbose rerun command used for evidence:

```bash
npm run test --workspace apps/cli -- --reporter=verbose src/local-demo.test.ts
```

## Canonical README Smoke

Expected: the README quick start can use ports `3101`, `3102`, `3103`, Postgres `5432`, dashboard `3030`, and daemon `9977` from a clean workspace.

Actual: blocked by an existing Routely run already bound to the canonical local demo ports, rooted outside this repo at `/tmp/routely-alpha-01-local-demo`.

Evidence:

```bash
cd .qa-runs/alpha-01-local-demo
node ../../apps/cli/dist/index.js doctor
```

Output excerpt:

```text
Workspace: /home/ruddypp/Documents/work/routely/.qa-runs/alpha-01-local-demo
OK node: v24.12.0
OK npm: 11.6.2
OK docker: Docker version 29.5.3, build d1c06ef
WARN ports: conflicts detected
  api: 3102
  web: 3101
  worker: 3103
  OK dashboard: 3030 (Routely dashboard already running)
  OK daemon: 9977 (Routely daemon already running)
```

Port ownership evidence:

```text
127.0.0.1:9977  users:(("MainThread",pid=114792,fd=26))
127.0.0.1:3102  users:(("MainThread",pid=114767,fd=21))
127.0.0.1:3103  users:(("MainThread",pid=115122,fd=21))
127.0.0.1:3101  users:(("MainThread",pid=115106,fd=21))
*:3030          users:(("next-server (v1",pid=114886,fd=24))
```

The existing daemon reported:

```json
{"workspace":"/tmp/routely-alpha-01-local-demo","database":"/tmp/routely-alpha-01-local-demo/.routely/routely.db"}
```

## Isolated Alternate-Port Smoke

Because the canonical ports were occupied, QA validated the same flow on alternate ports inside the repo write boundary.

### Commands

```bash
rm -rf .qa-runs/alpha-01-local-demo-alt
mkdir -p .qa-runs/alpha-01-local-demo-alt
cd .qa-runs/alpha-01-local-demo-alt
node ../../apps/cli/dist/index.js init
node ../../apps/cli/dist/index.js add ../../examples/hello-command --name web --command "PORT=3201 ROUTELY_EXAMPLE_NAME=web ROUTELY_EXAMPLE_ROLE=frontend npm run dev" --port 3201 --health-path /health
node ../../apps/cli/dist/index.js add ../../examples/hello-command --name api --command "PORT=3202 ROUTELY_EXAMPLE_NAME=api ROUTELY_EXAMPLE_ROLE=api npm run dev" --port 3202 --health-path /health
node ../../apps/cli/dist/index.js add ../../examples/hello-command --name worker --command "PORT=3203 ROUTELY_EXAMPLE_NAME=worker ROUTELY_EXAMPLE_ROLE=worker npm run dev" --port 3203 --health-path /health
node ../../apps/cli/dist/index.js db add postgres --name postgres --port 55432
ROUTELY_DAEMON_PORT=9988 ROUTELY_DASHBOARD_PORT=3040 node ../../apps/cli/dist/index.js doctor
ROUTELY_DAEMON_PORT=9988 ROUTELY_DASHBOARD_PORT=3040 node ../../apps/cli/dist/index.js
```

### Results

`init`: PASS. Created workspace-local database and config:

```text
Workspace: /home/ruddypp/Documents/work/routely/.qa-runs/alpha-01-local-demo-alt
Database:  /home/ruddypp/Documents/work/routely/.qa-runs/alpha-01-local-demo-alt/.routely/routely.db
Config:    /home/ruddypp/Documents/work/routely/.qa-runs/alpha-01-local-demo-alt/routely.yml
Synced:    0 app(s) from routely.yml
```

Registration: PASS. Three command apps and one Compose Postgres service registered sequentially. `doctor` reported:

```text
OK ports: no conflicts detected
```

Startup: PASS for daemon, Compose service, and apps. Startup output excerpt:

```text
Routely starting...
Workspace: /home/ruddypp/Documents/work/routely/.qa-runs/alpha-01-local-demo-alt
Dashboard: http://127.0.0.1:3030
Daemon:    http://127.0.0.1:9988
Apps:      4 local resource(s)

Dashboard already running at http://127.0.0.1:3030; reusing it for this workspace.
Routely daemon running at http://127.0.0.1:9988
api running at http://127.0.0.1:3202
worker running at http://127.0.0.1:3203
web running at http://127.0.0.1:3201
```

`ps`: PASS.

```bash
cd .qa-runs/alpha-01-local-demo-alt
ROUTELY_DAEMON_PORT=9988 ROUTELY_DASHBOARD_PORT=3040 node ../../apps/cli/dist/index.js ps
```

```text
api      running  command  :3202   enabled  /home/ruddypp/Documents/work/routely/examples/hello-command
postgres running  compose  :55432  enabled  -
web      running  command  :3201   enabled  /home/ruddypp/Documents/work/routely/examples/hello-command
worker   running  command  :3203   enabled  /home/ruddypp/Documents/work/routely/examples/hello-command
```

`logs web`: PASS.

```text
[2026-06-21T08:47:57.941Z] starting PORT=3201 ROUTELY_EXAMPLE_NAME=web ROUTELY_EXAMPLE_ROLE=frontend npm run dev
> routely-hello-command@0.1.0 dev
> node server.js
web running at http://127.0.0.1:3201
```

Daemon status: PASS.

```bash
curl -fsS http://127.0.0.1:9988/health
curl -fsS http://127.0.0.1:9988/apps
```

Observed the isolated workspace path and all four resources with `status:"running"`.

Dashboard same-origin API: BLOCKED for the isolated workspace. `http://127.0.0.1:3030/api/health` connected to daemon `9977` and workspace `/tmp/routely-alpha-01-local-demo`, not the clean smoke workspace on daemon `9988`.

Shutdown: PASS for managed workloads.

```bash
cd .qa-runs/alpha-01-local-demo-alt
ROUTELY_DAEMON_PORT=9988 ROUTELY_DASHBOARD_PORT=3040 node ../../apps/cli/dist/index.js down
```

```text
Stopped postgres.
Stopped api (118759).
Stopped web (119076).
Stopped worker (119081).
```

Final sweep after SIGINT to the foreground `routely` process found no listeners on `9988`, `3201`, `3202`, `3203`, or `55432`, and no matching Compose container still running.

## Findings

### QA-ALPHA-01-001: Dashboard Reuse Prevents Isolated Dashboard Validation

Severity: High
Owner: Backend + Frontend
Status: BLOCKED

Scenario: Start a clean workspace with `ROUTELY_DAEMON_PORT=9988 ROUTELY_DASHBOARD_PORT=3040` while a default dashboard is already running on `3030`.

Expected result: Routely starts or targets a dashboard wired to the requested daemon/workspace, or reports that the existing dashboard belongs to a different workspace/daemon and refuses to claim it as this workspace's dashboard.

Actual result: CLI printed `Dashboard: http://127.0.0.1:3030` and reused the existing default dashboard. Same-origin `/api/health` on `3030` reported daemon `9977` and workspace `/tmp/routely-alpha-01-local-demo`, while the smoke workspace daemon was `9988`.

Reproduction:

```bash
cd .qa-runs/alpha-01-local-demo-alt
ROUTELY_DAEMON_PORT=9988 ROUTELY_DASHBOARD_PORT=3040 node ../../apps/cli/dist/index.js
curl -fsS http://127.0.0.1:3030/api/health
```

Remediation instructions:

- Backend: in `apps/cli/src/index.ts`, do not probe/reuse `DEFAULT_DASHBOARD_PORT` when `ROUTELY_DASHBOARD_PORT` or config asks for a different port unless the existing dashboard is confirmed to point at the same daemon/workspace.
- Frontend: expose the daemon URL/workspace used by `/api/health` prominently enough that a mismatched reused dashboard is obvious in the UI.
- QA verification: repeat the isolated smoke and confirm `http://127.0.0.1:3040/api/health` reports daemon `9988` and the smoke workspace.

### QA-ALPHA-01-002: Concurrent CLI Registration Can Lose `routely.yml` Entries

Severity: Medium
Owner: Backend
Status: FAIL

Scenario: Three `routely add` commands are run concurrently against the same clean workspace.

Expected result: Either config writes are serialized/locked, or concurrent writes fail with a clear message and do not lose entries.

Actual result: SQLite registry contained `web`, `api`, `worker`, and `postgres`, but `routely.yml` temporarily omitted `api` after concurrent writes. Since `routely` syncs config before startup, this can make the registry and config diverge.

Evidence: after parallel `add` commands, `routely ps` showed all four workloads, while `routely.yml` listed only `web`, `worker`, and `postgres` until `api` was re-added sequentially.

Remediation instructions:

- Backend: serialize config writes in `upsertWorkspaceConfigEntry`/CLI registration paths or perform atomic read-modify-write with conflict detection.
- Backend tests: add a regression test that fires concurrent `routely add` commands and asserts all entries survive in `routely.yml`, or that one command fails safely without partial config loss.

### QA-ALPHA-01-003: Canonical Default-Port Smoke Blocked By Existing Local Routely Run

Severity: Medium
Owner: Routely Lead
Status: BLOCKED

Scenario: QA attempted the exact README-shaped ports after prior local demo work left apps/daemon/dashboard bound to `3101`, `3102`, `3103`, `3030`, and `9977` outside the repo write boundary.

Expected result: QA can run the canonical default-port smoke from a clean environment.

Actual result: `doctor` correctly reported conflicts. QA did not run `routely down` in `/tmp/routely-alpha-01-local-demo` because the Maestro write boundary for this agent is the repo/playbook folder.

Remediation instructions:

- Routely Lead: clear or assign ownership of the existing `/tmp/routely-alpha-01-local-demo` run, then rerun canonical default-port QA.
- Backend: keep the current preflight behavior; the warning was useful and prevented confusing partial startup.

## Pass/Fail Matrix

| Requirement | Result | Evidence |
| --- | --- | --- |
| Clean workspace initializes | PASS | `init` created workspace-local `.routely/routely.db` and `routely.yml`. |
| Three local command apps register | PASS | `web`, `api`, `worker` registered sequentially and appeared in `ps`. |
| Compose-backed database registers | PASS | `db add postgres --name postgres --port 55432` registered `postgres` with driver `compose`. |
| `doctor` detects readiness/ports | PASS | Alternate smoke: no conflicts. Canonical smoke: useful conflict report. |
| `routely` starts daemon/service/apps | PASS | Alternate smoke started daemon `9988`, Postgres, and apps `3201`-`3203`. |
| Services before dependent apps | NOT COVERED | README quick start did not set `depends_on`; `examples/local-demo/routely.yml` contains dependencies but was not the executed registration path. |
| `ps` shows four workloads | PASS | All four showed `running`. |
| `logs web` shows recent logs | PASS | Web log showed command and server URL. |
| Dashboard status/logs for clean workspace | BLOCKED | Existing dashboard on `3030` pointed at `/tmp` workspace, not isolated smoke workspace. |
| `down` stops managed workloads | PASS | CLI stopped Postgres and all three apps; final port/container sweep clean. |
| Intentional failure state/logs | PARTIAL | Existing `/tmp` dashboard data included a `broken` app with intentional failure metadata, but QA did not create a new failure case in the isolated workspace after dashboard mismatch was found. |

## Release Recommendation

Do not mark ALPHA-01 fully green yet. The local CLI lifecycle is substantially working, but public-alpha acceptance still needs a canonical default-port run in a clean environment and a dashboard run that is proven to show the same workspace that `routely` just started.
