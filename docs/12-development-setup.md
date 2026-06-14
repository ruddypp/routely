# Routely Initial Setup For Fedora Linux

Version: 0.5  
Status: Draft  
OS: Fedora Linux  
Package manager: npm

## Goal

This guide sets up Routely from zero until the initial skeleton works.

After finishing this guide, this command must work:

```bash
routely
```

Expected result:

```text
Routely starts the daemon.
Routely starts the Next.js dashboard.
Dashboard opens at http://localhost:3000.
Daemon health is available at http://localhost:9977/health.
```

The real app features are not implemented yet. This setup only creates the working foundation so the next AI agent can start coding features immediately.

## 1. What To Copy From 9Router

9Router's useful setup pattern:

```bash
npm install -g 9router
9router
```

Then the dashboard opens on one local port. In source mode, 9Router runs as a Next.js app with a fixed port, for example:

```bash
PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev
```

Routely should copy this developer experience:

```bash
npm install -g routely
routely
```

For local development, before publishing to npm, use:

```bash
npm link --workspace apps/cli
routely
```

Routely difference:

```text
9Router: one command starts an AI router/proxy dashboard.
Routely: one command starts an app manager daemon + dashboard, then later starts registered apps.
```

## 2. Install Required Tools On Fedora

Update Fedora:

```bash
sudo dnf update -y
```

Install Git, Node.js, npm, and build tools:

```bash
sudo dnf install -y git nodejs npm gcc gcc-c++ make python3 curl
```

Check versions:

```bash
node -v
npm -v
git --version
```

Recommended Node.js version: 20 or newer.

If Fedora installs an old Node.js version, install Node.js 20 from NodeSource:

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
```

Check again:

```bash
node -v
npm -v
```

## 3. Install Docker On Fedora

Check Docker first:

```bash
docker --version
docker compose version
```

If Docker is not installed:

```bash
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager addrepo --from-repofile=https://download.docker.com/linux/fedora/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Start Docker:

```bash
sudo systemctl enable --now docker
```

Allow current user to run Docker without `sudo`:

```bash
sudo usermod -aG docker $USER
```

Log out and log back in.

Verify:

```bash
docker ps
docker compose version
```

## 4. Create Next.js Project Named Routely

Go to your work folder:

```bash
cd ~/Documents/work
```

Create Routely as a Next.js app:

```bash
npx create-next-app@latest routely --yes
```

Enter project:

```bash
cd routely
```

Test Next.js before changing structure:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Stop with `Ctrl+C`.

## 5. Convert To npm Monorepo

Still inside `routely`.

Create workspace folders:

```bash
mkdir -p apps/web apps/cli/bin apps/daemon packages/core/src packages/db/src packages/drivers/src packages/github/src packages/proxy/src packages/presets/src docs examples
```

Move the generated Next.js files into `apps/web`:

```bash
mv src apps/web/ 2>/dev/null || true
mv app apps/web/ 2>/dev/null || true
mv public apps/web/ 2>/dev/null || true
mv next.config.* apps/web/ 2>/dev/null || true
mv postcss.config.* apps/web/ 2>/dev/null || true
mv tailwind.config.* apps/web/ 2>/dev/null || true
mv eslint.config.* apps/web/ 2>/dev/null || true
mv tsconfig.json apps/web/ 2>/dev/null || true
mv next-env.d.ts apps/web/ 2>/dev/null || true
mv package.json apps/web/package.json
mv package-lock.json apps/web/package-lock.json 2>/dev/null || true
```

Remove nested lockfile:

```bash
rm -f apps/web/package-lock.json
```

Create new root `package.json`:

```bash
npm init -y
```

Replace root `package.json` with:

```json
{
  "name": "routely-monorepo",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "npm run dev:web",
    "dev:web": "npm run dev --workspace apps/web",
    "dev:daemon": "npm run dev --workspace apps/daemon",
    "build": "npm run build --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present"
  }
}
```

Install from root:

```bash
npm install
```

Test dashboard from monorepo root:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Stop with `Ctrl+C`.

## 6. Setup Daemon Skeleton

Create daemon package:

```bash
cd apps/daemon
npm init -y
npm install fastify dotenv zod
cd ../..
```

Replace `apps/daemon/package.json` with:

```json
{
  "name": "@routely/daemon",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node src/server.js",
    "start": "node src/server.js"
  },
  "dependencies": {
    "dotenv": "latest",
    "fastify": "latest",
    "zod": "latest"
  }
}
```

Create daemon server file:

```bash
mkdir -p apps/daemon/src
```

Create `apps/daemon/src/server.js`:

```js
import Fastify from "fastify";
import "dotenv/config";

const port = Number(process.env.ROUTELY_DAEMON_PORT || 9977);
const host = process.env.ROUTELY_DAEMON_HOST || "127.0.0.1";

const app = Fastify({ logger: true });

app.get("/health", async () => {
  return {
    ok: true,
    service: "routely-daemon",
    version: "0.1.0",
    apps: []
  };
});

app.get("/apps", async () => {
  return { apps: [] };
});

try {
  await app.listen({ port, host });
  console.log(`Routely daemon running at http://${host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
```

Test daemon:

```bash
npm run dev --workspace apps/daemon
```

Open another terminal and test:

```bash
curl http://127.0.0.1:9977/health
```

Stop daemon with `Ctrl+C`.

## 7. Setup CLI Skeleton So `routely` Works

Create CLI package:

```bash
cd apps/cli
npm init -y
cd ../..
```

Replace `apps/cli/package.json` with:

```json
{
  "name": "routely",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "routely": "./bin/routely.js"
  },
  "scripts": {
    "dev": "node bin/routely.js",
    "start": "node bin/routely.js"
  }
}
```

Create `apps/cli/bin/routely.js`:

```js
#!/usr/bin/env node

import { spawn } from "node:child_process";
import process from "node:process";

const root = process.cwd();

function run(name, command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: { ...process.env, ...env }
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
    }
  });

  return child;
}

console.log("Routely starting...");
console.log("Dashboard: http://localhost:3000");
console.log("Daemon:    http://127.0.0.1:9977");
console.log("Apps:      none registered yet");
console.log("");

const daemon = run("daemon", "npm", ["run", "dev", "--workspace", "apps/daemon"]);
const web = run("dashboard", "npm", ["run", "dev", "--workspace", "apps/web"], {
  PORT: process.env.ROUTELY_DASHBOARD_PORT || "3000",
  NEXT_PUBLIC_ROUTELY_DAEMON_URL: process.env.NEXT_PUBLIC_ROUTELY_DAEMON_URL || "http://127.0.0.1:9977"
});

function shutdown() {
  console.log("\nRoutely stopping...");
  daemon.kill("SIGTERM");
  web.kill("SIGTERM");
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
```

Make it executable:

```bash
chmod +x apps/cli/bin/routely.js
```

Link CLI locally:

```bash
npm link --workspace apps/cli
```

Test:

```bash
routely
```

Expected:

```text
Routely starting...
Dashboard: http://localhost:3000
Daemon:    http://127.0.0.1:9977
Apps:      none registered yet
```

Open:

```text
http://localhost:3000
http://127.0.0.1:9977/health
```

Stop with `Ctrl+C`.

## 8. Setup Shared Packages

Initialize packages:

```bash
cd packages/core && npm init -y && cd ../..
cd packages/db && npm init -y && cd ../..
cd packages/drivers && npm init -y && cd ../..
cd packages/github && npm init -y && cd ../..
cd packages/proxy && npm init -y && cd ../..
cd packages/presets && npm init -y && cd ../..
```

Install dependencies:

```bash
npm install zod dotenv execa --workspace packages/core
npm install better-sqlite3 --workspace packages/db
npm install -D @types/better-sqlite3 --workspace packages/db
npm install @octokit/app @octokit/rest --workspace packages/github
```

Responsibilities:

```text
packages/core     shared types, config schema, app spec
packages/db       SQLite database layer
packages/drivers  command, compose, dockerfile, buildpack, static drivers
packages/github   GitHub App integration
packages/proxy    Traefik/proxy helpers
packages/presets  framework/database presets
```

## 9. Setup Root Config Files

Create `.env.example`:

```env
ROUTELY_ENV=development
ROUTELY_DATA_DIR=.routely
ROUTELY_DASHBOARD_PORT=3000
ROUTELY_DAEMON_HOST=127.0.0.1
ROUTELY_DAEMON_PORT=9977
ROUTELY_DATABASE_URL=file:.routely/routely.db

GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Create `.env`:

```bash
cp .env.example .env
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
```

Make sure `.gitignore` contains:

```gitignore
node_modules
.next
dist
build
.env
.routely
*.log
coverage
```

## 10. Final Verification

Run install once more:

```bash
npm install
```

Run Routely:

```bash
routely
```

Check these URLs:

```text
http://localhost:3000
http://127.0.0.1:9977/health
```

Check Docker:

```bash
docker ps
docker compose version
```

Optional build check:

```bash
npm run build
```

## 11. Expected Final Structure

```text
routely/
  apps/
    web/
      package.json
      src/
      public/
    cli/
      package.json
      bin/routely.js
    daemon/
      package.json
      src/server.js
  packages/
    core/
    db/
    drivers/
    github/
    proxy/
    presets/
  docs/
  examples/
  package.json
  package-lock.json
  tsconfig.base.json
  .env.example
  .env
  .gitignore
```

## 12. Ready For Coding

At this point setup is complete.

The project already has the 9Router-style starting experience:

```bash
routely
```

What exists:

```text
CLI command works.
Daemon health endpoint works.
Next.js dashboard runs.
Monorepo structure exists.
Docker is ready.
SQLite dependency is installed.
GitHub integration dependencies are installed.
```

Next development tasks:

```text
1. Dashboard fetches daemon /health and displays status.
2. SQLite creates .routely/routely.db.
3. CLI supports routely init, routely add, routely ps, routely down.
4. Command driver starts one local app.
5. Registered local apps stop when Routely stops.
```

