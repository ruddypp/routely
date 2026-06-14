# Feature Spec: GitHub Integration

Version: 0.1  
Status: Draft

## English

GitHub integration enables production deployment from public and private repositories and auto deploy on push to `main` or `master`.

## Indonesia

Integrasi GitHub memungkinkan deploy production dari repository public/private dan auto deploy saat push ke `main` atau `master`.

## Requirements

- Use GitHub App for repository access.
- Support private repositories.
- List repositories after installation.
- Let users select repo and branch.
- Receive push webhooks.
- Validate webhook signatures.
- Trigger deploy on configured branch.
- Show build/deploy logs.

## Flow

```text
Connect GitHub
  ↓
Install GitHub App
  ↓
Select repo
  ↓
Select branch
  ↓
Configure build/domain/env
  ↓
Deploy
```

## MVP Branch Rule

Default auto deploy branches:

- `main`
- `master`

Users may override branches per app.

## Acceptance Criteria

- A private GitHub repo can be deployed after GitHub App installation.
- A push to `main` triggers a deployment.
- Invalid webhook signatures are rejected.
- Build failures appear in dashboard logs.

