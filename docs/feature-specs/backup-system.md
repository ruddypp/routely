# Feature Spec: Backup System

Version: 0.1  
Status: Draft

## English

Backups are required for MVP, but must be optional per database and simple enough for a solo developer.

## Indonesia

Backup wajib untuk MVP, tetapi harus bisa dimatikan/diaktifkan per database dan tetap sederhana untuk solo developer.

## Requirements

- Manual backup.
- Scheduled backup.
- Enable/disable per database.
- Retention policy.
- Backup logs.
- Backup status in dashboard.

## MVP Database Backup Support

- PostgreSQL: `pg_dump`.
- MySQL/MariaDB: `mysqldump`.
- MongoDB: `mongodump` if available in container/tooling.
- Redis: snapshot copy where safe.

## Acceptance Criteria

- User can enable daily PostgreSQL backup.
- User can run a manual backup.
- User can disable backups.
- Failed backup shows logs.

