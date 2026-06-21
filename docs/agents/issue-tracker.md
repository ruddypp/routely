# Agent Issue Tracker

Routely uses GitHub Issues on `https://github.com/ruddypp/routely` as the default issue tracker for agent-created work items.

Use the `gh` CLI when creating or reading issues if it is authenticated in the environment. If `gh` is unavailable or unauthenticated, write the proposed issue body in the final response instead of silently inventing another tracker.

External pull requests are not treated as a default triage request surface unless the user explicitly asks for PR triage.

Skills that publish work items should create vertical-slice issues that are independently verifiable and label them according to `docs/agents/triage-labels.md`.
