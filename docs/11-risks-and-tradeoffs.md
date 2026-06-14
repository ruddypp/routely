# Routely Risks And Tradeoffs

Version: 0.1  
Status: Draft

## English

Routely's risk is scope. It combines local process management, production deployment, proxying, GitHub integration, metrics, and backups. The project must stay strict about MVP depth.

## Indonesia

Risiko terbesar Routely adalah scope. Produk ini menggabungkan local process management, production deploy, proxy, GitHub integration, monitoring, dan backup. MVP harus dijaga agar tidak terlalu melebar.

## 1. Scope Risk

Risk:

- Building local runner and production PaaS together is large.

Mitigation:

- Build local runner first, production second, GitHub automation third.
- Keep templates minimal.
- Postpone marketplace and teams.

## 2. Runtime Support Risk

Risk:

- “All stack” can become impossible if every framework requires custom logic.

Mitigation:

- Use universal drivers.
- Presets generate editable defaults only.
- Docker/buildpack handles production diversity.

## 3. Security Risk

Risk:

- Routely runs arbitrary code from GitHub repos.

Mitigation:

- Require explicit repo connection.
- Validate webhooks.
- Build in containers where possible.
- Redact secrets.

## 4. Reliability Risk

Risk:

- If Routely daemon fails, production apps may become unmanaged.

Mitigation:

- Production containers should have Docker restart policies.
- Proxy should continue serving existing containers when possible.
- Daemon should reconcile state on restart.

## 5. Cross-Platform Risk

Risk:

- Process supervision and signals differ across Linux, macOS, and Windows.

Mitigation:

- MVP support should prioritize Linux/macOS for local, Linux for production.
- Windows local support should be tested but can be beta.

