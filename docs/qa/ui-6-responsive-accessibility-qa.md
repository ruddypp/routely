# UI-6 Responsive And Accessibility QA

Date: 2026-06-20  
Dashboard URL: `http://localhost:3030`  
Workspace during QA: `/home/ruddypp/Documents/work/routely/apps/cli`

## Coverage

Playwright checked every dashboard module at the required viewport sizes:

- `375x812`
- `768x1024`
- `1280x800`
- `1440x900`

Modules checked:

- Overview
- Apps
- Deployments
- Domains
- GitHub
- Env
- Logs
- Health
- Metrics
- Databases
- Backups
- Settings

## Artifacts

Screenshots were written to `docs/qa/` with this naming pattern:

```text
ui-6-<module>-mobile-375x812.png
ui-6-<module>-tablet-768x1024.png
ui-6-<module>-desktop-1280x800.png
ui-6-<module>-desktop-1440x900.png
```

Additional state screenshots:

- `ui-6-focus-visible-mobile-375x812.png`
- `ui-6-dashboard-offline-mobile-375x812.png`

Total screenshots captured: 50.

## Findings

Initial QA found that routine button text was rendering at `16px`. The cause was the global reset in `apps/web/src/app/globals.css` using `font: inherit` for buttons and form controls after Tailwind utilities, which overrode compact control text sizes. This was fixed by preserving only `font-family: inherit`.

Initial mobile QA also showed the fixed bottom module rail could visually sit over module content. The mobile shell was adjusted to use an app-height grid with a scrollable content row and a non-overlapping bottom rail.

Final Playwright matrix result:

- screenshots: 48 matrix screenshots plus 2 state screenshots
- modules checked: all 12 required modules
- viewports checked: all 4 required sizes
- control overlap findings: 0
- awkward button wrapping findings: 0
- oversized routine button findings: 0
- focus-visible check: passed, `Refresh` received a `2px` solid focus outline

## State Checks

- Connected state: verified against the running daemon through same-origin `/api/*` routes.
- Loading state: observed during initial module/API hydration and refresh polling.
- Empty states: verified across apps, deployments, domains, GitHub, env/app selection, logs/app selection, health/app selection, metrics, databases, backups, and settings/notifications with an empty registry.
- Error/offline state: verified with Playwright route mocking for `/api/*`; screenshot saved as `ui-6-dashboard-offline-mobile-375x812.png`.
- Disabled states: verified on unavailable actions such as deploy/domain/GitHub/database/backup controls in the empty local workspace.

## Remaining Gaps

- This QA run used the current empty local registry, so row-dense states with many real apps, long app names, long domains, and populated backup/deployment histories were not exhaustively covered.
- Production success states requiring real Dockerfile deployments, verified DNS/TLS, GitHub webhook deliveries, database backup runs, and notification deliveries were not created during this checkpoint because UI-6 is a responsive/accessibility QA pass and should not fake production outcomes.
