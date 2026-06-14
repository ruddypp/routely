# Feature Spec: Dashboard

Version: 0.1  
Status: Draft

## English

The dashboard is the all-in-one app management UI for local and production environments.

## Indonesia

Dashboard adalah UI utama untuk mengelola semua app di local dan production.

## Views

- Overview.
- Apps list.
- App detail.
- Deployments.
- Logs.
- Metrics.
- Domains.
- Environment variables.
- Databases.
- Backups.
- Settings.

## Requirements

- Local dashboard starts with `routely`.
- Production dashboard requires login.
- Show actionable build errors.
- Provide start/stop/restart/deploy actions.
- Show CPU/RAM/disk and app health.

## Acceptance Criteria

- User can manage app lifecycle from dashboard.
- User can see local and production status clearly.
- User can edit env vars and trigger restart/redeploy.

