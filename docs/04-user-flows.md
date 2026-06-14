# Routely User Flows

Version: 0.1  
Status: Draft

## 1. English Overview

Routely has two primary flows: local workspace orchestration and production VPS deployment.

## 1. Ringkasan Indonesia

Routely punya dua alur utama: menjalankan workspace lokal dan deployment production di VPS.

## 2. First Local Use

```text
Install Routely
  ↓
Run `routely init`
  ↓
Routely scans project folder or asks to add app
  ↓
User selects preset: Next.js, Laravel, Vite, etc.
  ↓
User confirms path, command, and port
  ↓
Routely writes config and starts dashboard
  ↓
User runs `routely`
  ↓
All apps start on original localhost ports
```

## 3. Daily Local Start

```text
User opens terminal in workspace
  ↓
Runs `routely`
  ↓
Daemon starts
  ↓
Port conflicts are checked
  ↓
Databases start first
  ↓
Apps start in dependency order
  ↓
Dashboard opens or URL is printed
  ↓
Logs stream in terminal and dashboard
```

## 4. Local Stop

```text
User presses Ctrl+C or runs `routely down`
  ↓
Routely stops child processes
  ↓
Compose services marked local-only stop if configured
  ↓
Final status is written to SQLite
```

## 5. VPS Install

```text
Provision VPS
  ↓
Install via npm or curl installer
  ↓
Run `routely server init`
  ↓
Routely checks Docker, proxy, ports 80/443, disk, memory
  ↓
Creates admin user/token
  ↓
Starts Routely services
  ↓
Dashboard URL is shown
```

## 6. GitHub Deploy

```text
Open dashboard
  ↓
Connect GitHub
  ↓
Install Routely GitHub App
  ↓
Select repo and branch
  ↓
Select preset/build strategy
  ↓
Set env vars
  ↓
Set domain
  ↓
Deploy
  ↓
Watch build logs
  ↓
Healthcheck passes
  ↓
App is live with HTTPS
```

## 7. Auto Deploy On Push

```text
User pushes to main/master
  ↓
GitHub sends webhook
  ↓
Routely validates signature
  ↓
Deployment job starts
  ↓
Build logs stream
  ↓
New container starts
  ↓
Healthcheck runs
  ↓
Proxy route remains or updates
  ↓
Deployment status is stored
```

## 8. Domain Setup

```text
User enters root domain or app domain
  ↓
Routely shows DNS record instructions
  ↓
User configures DNS provider
  ↓
Routely verifies A/wildcard record
  ↓
Proxy route is created
  ↓
HTTPS certificate is issued
```

