# Routely Development Setup

Status: Canonical contributor setup
Owner: PM, Backend, Frontend
Last updated: 2026-06-21

## Purpose

This replaces the old one-time Fedora scaffolding document. It describes the current contributor workflow for the existing Routely repo.

## Requirements

- Node.js 20 or newer. Current local development has been verified with Node.js 24.
- npm 10 or newer.
- Docker and Docker Compose for Compose services and production deploy smoke tests.
- Linux VPS only for manual production alpha verification.

## Install

From the repo root:

```bash
npm install
```

Build and install the local CLI when needed:

```bash
npm run build --workspace apps/cli
cd apps/cli
npm install -g .
```

Confirm:

```bash
routely --help
```

## Development Commands

From repo root:

```bash
npm run dev
npm run dev:web
npm run dev:daemon
```

Useful checks:

```bash
npm run lint
npm run test --workspace apps/cli
npm run test --workspace apps/web
npx tsc --noEmit --project apps/web/tsconfig.json
node --check apps/daemon/src/server.js
```

Broad build when practical:

```bash
npm run build --workspaces --if-present
```

Known caveat: the web production build may have a Next.js/Turbopack reporting issue. Treat it as pre-existing unless a concrete new diagnostic appears.

## Workspace Rules

Routely distinguishes the repo/install root from the active user workspace.

- Routely repo root: this source checkout.
- Workspace root: the app workspace where `routely.yml` and `.routely/` state live.
- `ROUTELY_WORKSPACE_ROOT` can override the active workspace for tests/scripted runs.
- `ROUTELY_REPO_ROOT` can point CLI/dev tooling at this source checkout.

Workspace files:

```text
<workspace>/routely.yml
<workspace>/.routely/routely.db
<workspace>/.routely/logs
```

Do not use port `20128`; that port is reserved for 9Router in this local development environment.

## Web Work Rule

Before editing `apps/web`, read the relevant guide under `node_modules/next/dist/docs/`. This repo uses a Next.js version with breaking changes, and `AGENTS.md` makes this mandatory.

## Docs Work Rule

Docs-only PM work should run:

```bash
git diff --check
rg -n "old checkpoint|legacy prompt|NEXT_AGENT_PROMPT|HANDOFF" docs README.md AGENTS.md
```

Do not commit until the user approves the docs reset.
