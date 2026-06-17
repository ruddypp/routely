import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const routelyPresetsVersion = "0.1.0";

export const APP_PRESETS = {
  nextjs: {
    name: "Next.js",
    preset: "nextjs",
    driver: "command",
    install: "npm install",
    dev: "npm run dev -- --port 3000",
    build: "npm run build",
    start: "npm run start",
    port: 3000,
    healthcheck: { path: "/", expected_status: 200 }
  },
  vite: {
    name: "Vite / React",
    preset: "vite",
    driver: "command",
    install: "npm install",
    dev: "npm run dev -- --host 127.0.0.1 --port 5173",
    build: "npm run build",
    start: "npm run preview -- --host 127.0.0.1 --port 4173",
    port: 5173,
    healthcheck: { path: "/", expected_status: 200 }
  },
  laravel: {
    name: "Laravel",
    preset: "laravel",
    driver: "command",
    install: "composer install",
    dev: "php artisan serve --host=127.0.0.1 --port=8000",
    build: "npm run build",
    port: 8000,
    healthcheck: { path: "/", expected_status: 200 }
  },
  express: {
    name: "Express",
    preset: "express",
    driver: "command",
    install: "npm install",
    dev: "npm run dev",
    start: "npm start",
    port: 3000,
    healthcheck: { path: "/", expected_status: 200 }
  },
  nestjs: {
    name: "NestJS",
    preset: "nestjs",
    driver: "command",
    install: "npm install",
    dev: "npm run start:dev",
    build: "npm run build",
    start: "npm run start:prod",
    port: 3000,
    healthcheck: { path: "/", expected_status: 200 }
  },
  django: {
    name: "Django",
    preset: "django",
    driver: "command",
    install: "pip install -r requirements.txt",
    dev: "python manage.py runserver 127.0.0.1:8000",
    port: 8000,
    healthcheck: { path: "/", expected_status: 200 }
  },
  fastapi: {
    name: "FastAPI",
    preset: "fastapi",
    driver: "command",
    install: "pip install -r requirements.txt",
    dev: "uvicorn main:app --host 127.0.0.1 --port 8000 --reload",
    start: "uvicorn main:app --host 127.0.0.1 --port 8000",
    port: 8000,
    healthcheck: { path: "/", expected_status: 200 }
  },
  go: {
    name: "Go",
    preset: "go",
    driver: "command",
    install: "go mod download",
    dev: "go run .",
    build: "go build ./...",
    port: 8080,
    healthcheck: { path: "/", expected_status: 200 }
  },
  static: {
    name: "Static HTML/CSS",
    preset: "static",
    driver: "command",
    dev: "python3 -m http.server 8080 --bind 127.0.0.1",
    port: 8080,
    healthcheck: { path: "/", expected_status: 200 }
  },
  php: {
    name: "PHP custom",
    preset: "php",
    driver: "command",
    dev: "php -S 127.0.0.1:8000",
    port: 8000,
    healthcheck: { path: "/", expected_status: 200 }
  }
};

export const DATABASE_PRESETS = {
  postgres: {
    name: "postgres",
    type: "database",
    preset: "postgres",
    driver: "compose",
    image: "postgres:16",
    port: 5432,
    internal: true,
    env: { POSTGRES_HOST_AUTH_METHOD: "trust", POSTGRES_DB: "app" },
    volumes: ["postgres_data:/var/lib/postgresql/data"]
  },
  mysql: {
    name: "mysql",
    type: "database",
    preset: "mysql",
    driver: "compose",
    image: "mysql:8",
    port: 3306,
    internal: true,
    env: { MYSQL_ALLOW_EMPTY_PASSWORD: "yes", MYSQL_DATABASE: "app" },
    volumes: ["mysql_data:/var/lib/mysql"]
  },
  mariadb: {
    name: "mariadb",
    type: "database",
    preset: "mariadb",
    driver: "compose",
    image: "mariadb:11",
    port: 3306,
    internal: true,
    env: { MARIADB_ALLOW_EMPTY_ROOT_PASSWORD: "yes", MARIADB_DATABASE: "app" },
    volumes: ["mariadb_data:/var/lib/mysql"]
  },
  redis: {
    name: "redis",
    type: "database",
    preset: "redis",
    driver: "compose",
    image: "redis:7",
    port: 6379,
    internal: true,
    volumes: ["redis_data:/data"]
  },
  mongodb: {
    name: "mongodb",
    type: "database",
    preset: "mongodb",
    driver: "compose",
    image: "mongo:7",
    port: 27017,
    internal: true,
    volumes: ["mongodb_data:/data/db"]
  }
};

export function listAppPresets() {
  return Object.values(APP_PRESETS).map((preset) => ({ ...preset }));
}

export function getAppPreset(name) {
  const preset = APP_PRESETS[String(name || "").toLowerCase()];
  return preset ? { ...preset } : null;
}

export function getDatabasePreset(type) {
  const preset = DATABASE_PRESETS[String(type || "").toLowerCase()];
  return preset ? clone(preset) : null;
}

export function createDatabaseService(type, overrides = {}) {
  const preset = getDatabasePreset(type);
  if (!preset) {
    throw new Error(`Unsupported database type: ${type}`);
  }

  const cleanOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined)
  );

  return {
    ...preset,
    ...cleanOverrides,
    env: { ...(preset.env || {}), ...(cleanOverrides.env || {}) },
    volumes: cleanOverrides.volumes || preset.volumes || []
  };
}

export function detectPreset(projectPath) {
  const packageJson = readJson(join(projectPath, "package.json"));
  if (packageJson) {
    const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
    if (deps.next || existsSync(join(projectPath, "next.config.js")) || existsSync(join(projectPath, "next.config.mjs"))) {
      return withProjectDefaults("nextjs", packageJson);
    }
    if (deps["@nestjs/core"]) return withProjectDefaults("nestjs", packageJson);
    if (deps.vite || deps["@vitejs/plugin-react"]) return withProjectDefaults("vite", packageJson);
    if (deps.express) return withProjectDefaults("express", packageJson);
  }

  if (existsSync(join(projectPath, "artisan")) && existsSync(join(projectPath, "composer.json"))) {
    return getAppPreset("laravel");
  }
  if (existsSync(join(projectPath, "manage.py"))) return getAppPreset("django");
  if (existsSync(join(projectPath, "main.py")) || existsSync(join(projectPath, "app", "main.py"))) {
    const requirements = readText(join(projectPath, "requirements.txt"));
    if (/fastapi/i.test(requirements)) return getAppPreset("fastapi");
  }
  if (existsSync(join(projectPath, "go.mod"))) return getAppPreset("go");
  if (existsSync(join(projectPath, "index.php"))) return getAppPreset("php");
  if (existsSync(join(projectPath, "index.html"))) return getAppPreset("static");

  return { preset: "custom", driver: "command", dev: null, port: null };
}

function withProjectDefaults(presetName, packageJson) {
  const preset = getAppPreset(presetName);
  const scripts = packageJson?.scripts || {};

  return {
    ...preset,
    install: packageJson.packageManager?.startsWith("pnpm") ? "pnpm install" : preset.install,
    dev: scripts.dev ? commandForScript(packageJson, "dev") : preset.dev,
    build: scripts.build ? commandForScript(packageJson, "build") : preset.build,
    start: scripts.start ? commandForScript(packageJson, "start") : preset.start
  };
}

function commandForScript(packageJson, script) {
  if (packageJson.packageManager?.startsWith("pnpm")) return `pnpm ${script}`;
  if (packageJson.packageManager?.startsWith("yarn")) return `yarn ${script}`;
  return `npm run ${script}`;
}

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function readText(filePath) {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
