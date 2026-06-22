# Routely Documentation

This directory is the canonical product and engineering guide for the Routely MVP reset. The docs now describe the placement-neutral app server: the machine running `routely` is the server.

## Read Order

1. `blueprint.md` — product promise, MVP scope, user flows, and UX contract.
2. `architecture.md` — target module seams, process model, data model, API shape, and refactor rules.
3. `frontend.md` — dashboard information architecture, visual direction, page specs, component modules, and frontend execution rules.
4. `backend.md` — server session, registry, Compose runtime, recipe engine, proxy, databases, observability, logs, terminal, and GitHub provider design.
5. `implementation-slices.md` — small specialist-ready execution slices in dependency order.
6. `verification.md` — acceptance gates, smoke checks, automated checks, and definition of done.
7. `adr/` — architectural decisions that must be respected while building.
8. `agents/` — team coordination and issue-tracker conventions.
9. `qa/` and `security/` — current QA/security expectations, not stale alpha reports.

## Current MVP North Star

`routely` starts a full Routely server session on the current runtime host. The dashboard shows server health, app status, logs, traffic, domains, databases, and guided setup. Enabled apps auto-start; each app can still be stopped, restarted, disabled, inspected, and fixed individually.

## Documentation Rules

- Keep `CONTEXT.md` as glossary only.
- Keep implementation decisions in `docs/adr/`.
- Keep product and engineering instructions in the blueprint docs.
- Do not reintroduce stale demo-specific docs unless they map to the new blueprint.
- Do not document features as available until they are executable and verified.
