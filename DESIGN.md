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

## Apps And Services Direction

The Apps area must feel like a beginner-friendly deployment console, not a registry table for experts.

- Follow the Dokploy project mental model: `Project` → `Environment` → `Service`. Routely can start with a single `Default project` and one runtime-host environment, but the UI must still teach that apps, compose stacks, and databases are services inside a project.
- Empty Apps state is an onboarding surface titled around `Create your first service`.
- The primary action is `Create service`, not a vague registry-level `Add app`.
- The first service choice should be Dokploy-like: `Application`, `Compose`, `Database`, and later `Template / import`.
- Application setup then becomes source-first: choose what source/stack exists, then configure only what is needed.
- Source/stack cards use recognizable icon tiles for GitHub repo, Local folder, Docker Compose, Dockerfile, Node/Next.js, Static site, and Custom.
- Local folder and Compose paths must be visible as paths on the runtime host, for example `/home/user/projects/app`.
- GitHub apps must show `owner/repo`, branch, and optional subdirectory.
- App cards must expose source, detected recipe/stack, readiness, URL/domain, and safe actions without hiding essentials in hover-only UI.
- API/auth/daemon errors stay compact and actionable; they should not bury the Create Service path.
- The visual language remains Spotify-inspired: dark charcoal surfaces, pill controls, green primary CTAs, compact helper copy, and no light admin panels.
