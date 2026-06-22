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

## Current Visual Baseline

The accepted frontend baseline after Slice 1B is a Spotify-inspired dark operations deck:

- Muted fixed sidebar with active green navigation.
- Minimal deck header, not a tall Server Rail/banner.
- `Connect GitHub` CTA in the top-right of the dashboard deck.
- Runtime controls stacked near the top, full-width, and clearly separated from monitoring content.
- Fewer larger cards instead of many tiny forced metric cards.
- Vertical composition: Runtime controls → Operational summary + Activity → resource/traffic/fleet panels.
- Dark chart panels with honest empty/auth states.
- No active backup/restore UI and no light/cream stale-data panels.

Future frontend work must preserve this baseline unless the user explicitly approves a new visual direction.
