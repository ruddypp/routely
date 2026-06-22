# Routely Design Direction

Routely's dashboard direction is a Spotify-inspired operational console. The UI should borrow Spotify's dark, immersive, dense, rounded, content-first feel while remaining an original app-management dashboard for runtime hosts.

## Product Feel

Routely should feel like a calm dark control room for a solo developer's runtime host:

- Dark, polished, and readable like a modern media/control console.
- Dense enough to monitor many apps without giant empty blocks.
- Clear about what is running, broken, stale, or unavailable.
- Focused on operational tasks, not marketing visuals.
- Placement-neutral: the server is whichever machine runs `routely`.

## Spotify-Inspired Rules

Use Spotify as a style reference, not as a clone:

- Near-black page shell with layered dark panels.
- Rounded/pill controls and circular icon actions.
- Green as the primary healthy/running accent.
- Muted gray text hierarchy with crisp white primary text.
- Compact cards and lists; no oversized pastel panels.
- Charts and status widgets should feel embedded in the dark console.
- Empty/error states should be small, specific, and actionable.

## Current Visual Checkpoint

The next frontend checkpoint is a corrective redesign. It must replace the current light command-board/dashboard look with the Spotify-inspired Routely console:

- Dark shell and dark dashboard content.
- Compact Server Rail, not a tall banner.
- Monitoring cards and charts that fit the dark style.
- Disk, CPU, memory, app status, activity, and traffic surfaces.
- Honest empty states instead of fake metrics.
- No active backup/restore UI.

See `docs/frontend.md` and `docs/implementation-slices.md` Slice 1B.
