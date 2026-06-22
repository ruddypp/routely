# Routely Design Direction

Routely's UI direction is the lightweight operations dashboard described in `docs/frontend.md`.

## Product Feel

Routely should feel like a calm control room for a solo developer's runtime host:

- Lightweight and readable.
- Clear about what is running and what is broken.
- Focused on operational tasks, not marketing visuals.
- Placement-neutral: the server is whichever machine runs `routely`.

## Canonical UI Reference

Read `docs/frontend.md` for:

- Palette.
- Typography.
- Server Rail signature element.
- Information architecture.
- Page specs.
- Component module breakdown.
- Copy rules.
- Accessibility and responsive requirements.

## Current Visual Checkpoint

The next frontend checkpoint is not another shell refactor. It must make the dashboard visibly feel like Routely:

- Server Rail as the product signature.
- Host/app monitoring charts using `recharts` where useful.
- Disk, CPU, memory, app status, activity, and traffic surfaces.
- Honest empty states instead of fake metrics.
- No active backup/restore UI.

See `docs/frontend.md` and `docs/implementation-slices.md` Slice 1A.
