# Agent Domain Docs

Routely uses a single-context domain-doc layout.

- Domain glossary: `CONTEXT.md`
- Architecture decisions: `docs/adr/`
- Product/spec source of truth: `docs/blueprint.md`, `docs/architecture.md`, `docs/frontend.md`, `docs/backend.md`, `docs/implementation-slices.md`, and `docs/verification.md`

Agents should read `CONTEXT.md` before naming new concepts, tests, modules, or issue titles. If a task introduces a new stable domain term, update `CONTEXT.md` as a glossary entry only. Do not put implementation details, TODOs, or specs in `CONTEXT.md`.

Create or update an ADR only when the decision is hard to reverse, surprising without context, and the result of a real trade-off. Otherwise keep the rationale near the code, docs, or implementation guide.
