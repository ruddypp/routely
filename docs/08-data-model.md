# Routely Data Model

Version: 0.1  
Status: Draft

## English

Routely uses SQLite for single-node state. The schema should keep future multi-server support possible without making MVP complicated.

## Indonesia

Routely memakai SQLite untuk state single-node. Schema tetap disiapkan agar multi-server bisa dikembangkan nanti tanpa membuat MVP rumit.

## 1. Core Tables

```text
servers
apps
app_sources
app_env_vars
domains
deployments
deployment_logs
runtime_instances
metrics_samples
healthchecks
github_installations
github_repositories
databases
backup_jobs
backup_runs
audit_events
settings
```

## 2. App Fields

```text
id
server_id
name
type
preset
driver
path
command
port
enabled
status
created_at
updated_at
```

## 2.1 Skeleton v1 SQLite Tables

The current skeleton creates the subset needed for local app registry and command apps:

```text
servers
apps
runtime_instances
settings
```

`servers` is seeded with `id = 1`, `name = local`, and `kind = local`. Existing databases are migrated in place by adding `apps.server_id` when missing.

## 3. Deployment Fields

```text
id
app_id
source_type
repo
branch
commit_sha
status
started_at
finished_at
error_message
```

## 4. Domain Fields

```text
id
app_id
hostname
is_wildcard
verified_at
tls_status
created_at
```

## 5. Backup Fields

```text
backup_jobs:
  id
  database_id
  enabled
  schedule
  retention_days

backup_runs:
  id
  backup_job_id
  status
  file_path
  size_bytes
  started_at
  finished_at
```

## 6. Notification Fields

```text
notification_channels:
  id
  name
  type
  enabled
  events
  config

notification_delivery_attempts:
  id
  channel_id
  event
  status
  http_status
  message
  target
  resource_type
  resource_id
  created_at
  finished_at
```

Channel `config` contains delivery secrets and must not be returned directly through public API DTOs.
