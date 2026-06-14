# Routely CLI Specification

Version: 0.1  
Status: Draft

## English

The CLI should feel like 9Router: one memorable command starts the system. Advanced commands exist for explicit control.

## Indonesia

CLI harus terasa seperti 9Router: satu command utama untuk menyalakan sistem. Command lain disediakan untuk kontrol yang lebih spesifik.

## 1. Main Command

```bash
routely
```

Default behavior:

- Equivalent to `routely up` in local workspace mode.
- Starts daemon, dashboard, proxy if enabled, databases, and apps.
- Prints app status and URLs.
- Streams summary logs.

## 2. Commands

```bash
routely init
routely add
routely up
routely down
routely ps
routely logs [app]
routely restart [app]
routely env [app]
routely deploy [app]
routely domain
routely db
routely backup
routely server
routely doctor
```

## 3. App Commands

```bash
routely add
routely add ./apps/web
routely add --preset nextjs --path ./web --port 3000
routely restart api
routely logs api --follow
```

## 4. Server Commands

```bash
routely server init
routely server status
routely server upgrade
routely server doctor
```

## 5. Domain Commands

```bash
routely domain root example.com
routely domain add web web.example.com
routely domain verify web.example.com
routely domain ls
```

## 6. Deploy Commands

```bash
routely deploy web
routely deploy web --branch main
routely deploy web --watch
```

## 7. Database Commands

```bash
routely db add postgres
routely db add mysql
routely db add redis
routely db add mongodb
routely db ls
```

## 8. Backup Commands

```bash
routely backup enable postgres --schedule "0 2 * * *"
routely backup disable postgres
routely backup run postgres
routely backup ls
```

