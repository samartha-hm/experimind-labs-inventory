# Local-First Hosting and Future Cloud Migration

## Initial topology
- One LAN-accessible office server (prefer Linux), Docker + PostgreSQL volume + ERP app, with a separate local-only backups volume. May use a Windows workstation with Docker for development, but permanent office server should have tested shutdown/startup and UPS.
- Use LAN HTTPS via local reverse proxy if accessing from multiple devices, strong credentials, encrypted backups, role/capability protection and audit logging.
- Store uploaded survey photos/docs in a configurable file storage adapter with durable mounted volume; DB stores metadata and stable paths/IDs. Later S3-compatible object storage can replace local adapter without changing project references.

## Current repo warnings
- `docker-compose.yml` publishes `5432` and Adminer `8080` and uses default `postgres/postgres`. Not safe for broad exposure. This is a baseline example, not a production-safe deployment.
- `.env.example` includes an example JWT secret. Must generate a new long random secret and never commit `.env`.
- `src/db.ts` enables SSL for remote URLs with `rejectUnauthorized:false`; cloud move must use appropriate certificate verification rather than disabling TLS validation.
- Legacy Project/Production/Sticker APIs lack global authentication/tenant middleware. Gate all operational routes.

## Cloud migration plan
- Use same PostgreSQL migrations and stable UUIDs; export/restore versioned encrypted database backup; migrate attachments preserving object keys; move app config to environment variables; configure HTTPS, secrets, DNS, firewall and database private networking; test on separate staging environment; verify tenant/authorization.
- Backups: scheduled dump, retained snapshots, restore drills, and offsite encrypted copy. No guaranteed reliability without operational tests.
- Cloud hosting may cost money; software self-hosted license dependencies should be audited before claiming fully free use.
