# Quality, Security, Operations, Reliability

## Non-functional acceptance

- Self-host on own server with PostgreSQL; no mandatory paid providers; document one-command local development after repo audit.
- Small internal team (<25 users), multiple responsibilities, mobile warehouse workflow.
- Audit trail of all critical changes with actor/time/source/old-new where applicable.
- Practical performance target (proposal to verify): interactive planning result for 1,000 item demand lines under 3 seconds on target hardware, excluding initial app boot. Confirm real project sizes before making contractual SLO.
- Recover from failed deployment, host failure and network outages by tested backups; no pretending localStorage is system-of-record.
- Secure customer/site survey images and confidential quoting details; minimize public links.

## Test pyramid

- **Pure-unit tests:** quantity bases, optional lines, UOM validation, template immutability, rounding rules, cycle detection, demand provenance.
- **Integration:** TypeORM migrations, auth/permissions, template versioning, audit, PO receipt ↔ stock posting, QC quarantine, production input/output.
- **Concurrency:** simultaneous reservations cannot exceed available; retried idempotent receipts/dispatch never double post.
- **E2E:** school custom lab setup, multi-grade Prastuti, workshop returns, make-to-stock then customer allocation, partial delivery.
- **Security:** auth bypass, broken access control, IDOR, input validation, file upload controls, session expiry, CSRF (if relevant).
- **Recovery:** backup/restore and rollback check in staging; never use real production secrets in CI.

## Tooling (select based on actual repo)

Use existing Vitest/Jest/Playwright etc if already configured; prefer not to add many new frameworks. Node script `node --test starter/quantity_engine.test.mjs` is independent and only a **reference** test. Build/typecheck/lint commands must be read from actual `package.json`. `npm audit` can identify dependencies with known vulnerabilities but network access may be required; never blindly run auto-fix in a production branch.

## Security sources

- OWASP ASVS for verification-level security design.
- PostgreSQL transactions/row locking for stock reservations.
- Secure hashing (Argon2id/bcrypt with maintained libraries), access-controlled storage for photos, least privilege and log redaction.
- Environment `.env.example` placeholders only; never commit `.env` or payment credentials.
- Audit download/upload routes for path traversal, MIME/size and access controls.

## Definition of done per ticket

- User requirement ID traced to changed code and acceptance test.
- Unit/integration/e2e as appropriate.
- Existing feature regression checked.
- Schema migration safe, reviewed (if applicable), rollback plan documented.
- Documentation / `.agent/` progress updated.
- No secrets or customer datasets accidentally committed.
- Git working tree and tests status recorded.

## Deployment checklist (later)

Database migration snapshot, backup, environment configuration, health checks, permissions bootstrap, seeded authorized users, HTTPS/reverse proxy, logging, rollback command, restore test, monitoring and alert route.
