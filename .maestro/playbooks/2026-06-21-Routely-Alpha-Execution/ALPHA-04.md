# Routely Alpha Phase 04: Release Docs And Final Gate

Task-based playbook: each checkbox task must be executable in a fresh agent context. Do not launch public release steps without Routely Lead and user approval.

- [ ] PM: rewrite root `README.md` around verified public alpha demos. Read `docs/00-product-brief.md`, `docs/01-alpha-plan.md`, `docs/03-demo-acceptance-plan.md`, `docs/06-interfaces.md`, `docs/09-current-status.md`, and QA/Security reports under `docs/qa/` and `docs/security/`. Update `README.md` with concise product positioning, requirements, install-from-source, local demo quickstart, VPS demo quickstart, GitHub demo quickstart, limitations, and links to canonical docs. Do not edit production code. Run `git diff --check -- README.md docs` and targeted searches for stale legacy docs. Commit only README/docs files if verification passes.

- [ ] PM: reconcile canonical docs after Backend, Frontend, QA, and Security hardening. Read `docs/00-product-brief.md` through `docs/12-prd.md`, plus fresh QA/Security reports. Update docs only where verified behavior changed: alpha plan, demo acceptance criteria, interfaces, current status, implementation backlog, feature scope, QA/Security index files, and docs map. Do not edit production code. Run `git diff --check -- docs` and targeted legacy-reference searches. Commit only docs files if verification passes.

- [ ] QA E2E: create final public alpha QA gate report under `docs/qa/`. Read `docs/03-demo-acceptance-plan.md`, fresh local/VPS/GitHub smoke reports, and current README quickstarts. Confirm whether local, VPS, GitHub, and responsive dashboard demos are pass/fail/blocked. Include environment details, exact commands, expected/actual behavior, evidence, unresolved blockers, and release recommendation. Do not edit production code. Write the QA report and hand it to Routely Lead; do not commit the QA report yourself.

- [ ] Security: create final public alpha security gate report under `docs/security/`. Read `docs/07-security-and-risks.md`, fresh Security findings, and current README limitations. Confirm whether auth, secrets, webhooks, outbound notifications, Docker/proxy exposure, backups, and untrusted dashboard text are pass/fail/blocked. Include severity, evidence, unresolved blockers, and release recommendation. Do not edit production code. Write the Security report and hand it to Routely Lead; do not commit the Security report yourself.

- [ ] Routely Lead: collect final go/no-go decision inputs for the user. Read README, canonical docs, final QA gate report, and final Security gate report. Summarize what passes, what is blocked, what is deferred, and what needs user setup/env/credential decisions. Do not edit production code unless explicitly assigned. Do not publish, tag, release, or run destructive infrastructure operations without explicit user approval.

Human review after phase: user decides whether to approve public alpha release steps.
