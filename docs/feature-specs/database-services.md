# Feature Spec: Database Services

Version: 0.1  
Status: Draft

## English

Databases are managed as services, usually through Docker Compose. Production databases should be internal-only by default.

## Indonesia

Database dikelola sebagai service, umumnya melalui Docker Compose. Database production harus internal-only secara default.

## MVP Databases

- PostgreSQL.
- MySQL/MariaDB.
- Redis.
- MongoDB.

## Requirements

- Create database service from preset.
- Generate secure default credentials.
- Persist data using volumes.
- Show status, logs, port, and connection info.
- Support internal-only default networking.
- Support explicit public exposure only with confirmation.

## Acceptance Criteria

- User can add PostgreSQL and attach it to an app.
- Database survives app restart.
- Production database is not publicly exposed by default.

