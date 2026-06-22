# QA Guide

QA reports from the previous alpha direction were removed because the product blueprint changed. New QA work should validate the placement-neutral MVP described in `docs/blueprint.md` and the acceptance checks in `docs/verification.md`.

QA should focus on real user flows:

- First run with Docker present and missing.
- Add app from local folder.
- Add app from GitHub.
- Setup verification pass/fail.
- Auto-start enabled apps.
- Per-app lifecycle controls.
- Logs, health, host metrics, and basic traffic visibility.
- Domain/DNS/proxy flow.
- Database create/attach flow.
- Terminal scope and warning.

QA reports should distinguish product bugs from environment blockers. QA agents should not commit reports unless acting as Routely Lead.
