# Feature Spec: Local Runner

Version: 0.1  
Status: Draft

## English

The local runner is the 9Router-inspired part of Routely. Running `routely` should start all registered local apps and stop them when Routely exits.

## Indonesia

Local runner adalah bagian Routely yang paling terinspirasi dari 9Router. Saat user menjalankan `routely`, semua app lokal yang terdaftar menyala dan ikut mati saat Routely berhenti.

## Requirements

- `routely` starts all enabled local apps.
- Preserve original localhost ports.
- Detect conflicts before starting.
- Start dependencies first.
- Stream logs to terminal and dashboard.
- Stop child processes on exit.
- Support command and Compose drivers.

## User Flow

```text
routely
  ↓
load routely.yml + SQLite state
  ↓
check ports
  ↓
start databases/services
  ↓
start apps
  ↓
show URLs and logs
```

## Acceptance Criteria

- Next.js on `3000`, Vite on `5173`, Laravel/FastAPI on `8000`, and PostgreSQL on `5432` can run together.
- If port `3000` is busy, Routely shows the app causing conflict and suggests a new port.
- Ctrl+C stops child processes in local mode.

