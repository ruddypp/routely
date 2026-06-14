# Routely Configuration Specification

Version: 0.1  
Status: Draft

## English

Routely should support file-based configuration for portability and SQLite state for runtime state/history.

## Indonesia

Routely sebaiknya mendukung config berbasis file agar mudah dipindahkan, dan SQLite untuk state/history runtime.

## 1. File Names

Recommended names:

```text
routely.yml
routely.yaml
```

## 2. Workspace Example

```yaml
version: 1
name: my-workspace

dashboard:
  port: 9999

apps:
  - name: web
    preset: nextjs
    driver: command
    path: ./apps/web
    install: npm install
    dev: npm run dev -- --port 3000
    build: npm run build
    start: npm run start
    port: 3000
    env:
      NODE_ENV: development

  - name: api
    preset: laravel
    driver: command
    path: ./apps/api
    install: composer install
    dev: php artisan serve --host=127.0.0.1 --port=8000
    port: 8000
    depends_on:
      - postgres

services:
  - name: postgres
    preset: postgres
    driver: compose
    image: postgres:16
    port: 5432
    internal: true
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

## 3. Production App Example

```yaml
version: 1
name: production-server

apps:
  - name: web
    source:
      type: github
      repo: owner/web
      branch: main
    preset: nextjs
    driver: buildpack
    port: 3000
    domains:
      - web.example.com
    auto_deploy:
      enabled: true
      branches:
        - main
        - master
    healthcheck:
      path: /
      expected_status: 200
```

## 4. Config Rules

- File config describes desired app definitions.
- SQLite stores runtime state, deployment history, metrics, logs metadata, GitHub IDs, and generated secrets.
- Dashboard changes should be exportable back into config where safe.
- Secrets should not be exported by default.

