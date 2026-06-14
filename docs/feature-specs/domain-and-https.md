# Feature Spec: Domain And HTTPS

Version: 0.1  
Status: Draft

## English

Routely should make production domains simple: point DNS to VPS, attach domain to app, Routely handles proxy and HTTPS.

## Indonesia

Routely harus menyederhanakan domain production: arahkan DNS ke VPS, pasang domain ke app, lalu Routely mengurus proxy dan HTTPS.

## Requirements

- Support root domain setup.
- Support wildcard domain setup.
- Support custom domain per app.
- Verify DNS A record points to server IP.
- Create proxy route.
- Issue HTTPS automatically.
- Show TLS status.

## DNS Examples

```text
A    example.com      -> VPS_IP
A    *.example.com    -> VPS_IP
A    api.example.com  -> VPS_IP
```

## Acceptance Criteria

- `web.example.com` routes to web app container.
- Wildcard domain enables automatic app subdomains.
- HTTPS is active without manual certificate setup.
- DNS verification failures show exact required record.

