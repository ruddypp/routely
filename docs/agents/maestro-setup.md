# Maestro Agent Setup

Maestro agents for Routely are configured to use Codex with working directory:

```text
/home/ruddypp/Documents/work/routely
```

## 9Router / Codex Routing

Codex should run through local 9router, not directly against one Codex account.

Required local setup:

```text
9router endpoint: http://127.0.0.1:20128/v1
Codex model_provider: 9router
Codex model: routely-auto
Codex subagent model: routely-auto
```

The `routely-auto` combo is configured in the local 9router SQLite DB and is intended to fall back across Codex accounts first, then other configured providers/models if Codex capacity is unavailable. 9router must be running before starting Maestro agents.

If an agent was already running before this config changed, restart that Maestro agent/session so Codex reloads `~/.codex/config.toml` and uses `routely-auto`.

## Agents

| Role | Maestro name | Agent ID |
| --- | --- | --- |
| Lead | `routely` | `63dca434-ed89-4b97-88a1-24710ef4ac50` |
| Lead | `Routely Lead` | `029cb2c2-7b3b-4ee5-a375-9d8d2d55bf00` |
| Product Manager | `PM` | `6598d93e-6f19-4975-af91-4648eb992591` |
| Backend | `Backend` | `e2a663bf-0d9f-4cfb-9c03-3e49309356a5` |
| Frontend | `Frontend` | `fbd438a5-13ce-40ef-93fa-6d867d6a5b95` |
| UI/UX | `UI UX` | `1bf76ffb-8c01-45ad-9ecc-b169632c4c3e` |
| QA | `QA E2E` | `b666873c-5096-4b18-9c9f-8359d844c561` |
| Security | `Security` | `9dc9ab4d-841c-45e1-bd6f-8fb64e1fef99` |

`routely` and `Routely Lead` both use the Routely Lead prompt. Keep one or use both as needed.

## Role Prompts

Role prompts live in `.maestro/prompts/`:

- `routely-lead.md`
- `pm.md`
- `backend.md`
- `frontend.md`
- `uiux.md`
- `qa.md`
- `security.md`

The team workflow contract lives in `docs/agents/team-workflow.md`.

## Recommended Flow

1. Start with `routely` or `Routely Lead` to define the objective and blockers.
2. Send planning work to `PM`.
3. Send dashboard design details to `UI UX`.
4. Send platform/API/CLI/storage implementation to `Backend`.
5. Send dashboard/route-handler implementation to `Frontend`.
6. Send full verification to `QA E2E`.
7. Send trust-boundary verification to `Security`.
8. Route findings back to `Backend` or `Frontend`.
9. Re-run QA/Security.
10. Ask `PM` to update docs/handoff/release notes.

## Local Skills

Relevant local skills from skill.sh/Matt Pocock and existing design skills are installed under `.agents/skills/`:

- `setup-matt-pocock-skills`
- `domain-modeling`
- `codebase-design`
- `tdd`
- `diagnosing-bugs`
- `to-issues`
- `implement`
- `frontend-design`
- `ckm-design-system`

The old `design-taste-frontend` skill was removed because it is for landing pages/marketing redesigns, not Routely's operational dashboard.
