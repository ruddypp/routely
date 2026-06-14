# Feature Spec: Runtime And Build System

Version: 0.1  
Status: Draft

## English

Routely supports many stacks by using drivers, not by implementing every language runtime directly.

## Indonesia

Routely mendukung banyak stack dengan driver, bukan dengan membuat runtime sendiri untuk setiap bahasa.

## Drivers

- `command`: local dev process.
- `compose`: Docker Compose apps and services.
- `dockerfile`: explicit Dockerfile builds.
- `buildpack`: auto-detected production builds.
- `static`: static site build and serve.

## MVP Presets

- Next.js.
- Vite/React.
- Laravel.
- Express.
- NestJS.
- Django.
- FastAPI.
- Go.
- Static HTML/CSS.
- PHP custom.

## Preset Rule

Presets generate editable config. They must never lock users into one command.

## Acceptance Criteria

- User can select a preset from dashboard/CLI.
- User can override install/dev/build/start commands.
- Production build can use Dockerfile or buildpack driver.

