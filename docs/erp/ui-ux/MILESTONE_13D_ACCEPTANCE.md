# Milestone 13D acceptance — 2026-10-16

PASS for the bounded development read-only integration; ready for user review.
Starting checkpoint: c33180ef94e27f068e9a453594642e3ff333c3b6.
See MILESTONE_13D_INTEGRATION.md for API findings, activation and rollback.

## Automated evidence

- Full regression: **503 passed, 0 failed, 0 pending, 69 files**.
- HTTP/PostgreSQL Kit Builder suite: **21 passed**. Real bearer authentication,
  current database role, inactive user, foreign tenant, forged tenant, viewer,
  production and flag-off denials; independent approved/draft contents;
  concurrent revision 409; unchanged before/after rows in templates, versions,
  revisions, approvals, inventory and ledger. Existing quantity, Science crate,
  project-planning, reservation and stock suites remain green.
- Final focused Studio tests: **10 passed** (flag, zero/unavailable quantities,
  GET-only errors, dense/long content, empty structures and read-only controls).
- Typecheck and frontend/PWA/server builds pass. Existing bundle-size warning.
- Authenticated in-app browser: existing builder → live catalog → saved Science
  kit → immutable published revision → return to existing builder.
- Rollback: restarted the isolated server with flag=false and no organization
  allowlist. A fresh authenticated tab showed the unavailable state without kit
  content; its return link restored the existing builder. Server left flag-off.
- Dedicated authenticated browser validator: keyboard disclosure/snapshot
  selection, default/return navigation, API outage without synthetic fallback,
  unchanged isolated development database fingerprints, no operational HTTP
  writes or browser runtime errors. Existing shell made four authentication
  refresh POSTs; these do not belong to the Studio data client.
- Axe WCAG 2 A/AA, 2.1 AA and best-practice: **3 audits, zero violations and
  zero incomplete checks**, scoped to Studio at 1440×1000, 768×1024 and 390×844.
  Studio scroll width equals client width at all sizes; tablet/reflow use one
  column. Keyboard Space/Enter and native snapshot select verified.

Reproduction uses the existing isolated environment, without reset/migration or
seeding. Integration tests create isolated test schemas. Browser acceptance uses
existing private pilot accounts and previously persisted development fixtures;
no fixture is created by the viewer or validator.

```powershell
node --env-file=.env.kit-builder-development node_modules/vitest/vitest.mjs run --testTimeout=20000 --maxWorkers=2
npm run typecheck --silent
npm run build --silent
node --env-file=.env.kit-builder-development scripts/validate-live-studio.mjs
```

Browser validator expects the flagged local server on port 3100, existing private
staff credentials in `.local-dev/pilot-accounts.json`, the persisted historical
Science browser acceptance kit, and local axe-core from 13C tooling. It guards
database host/port/name before connecting. It is an environment acceptance
script, not a portable seed or production runner.

## Observations and limitations

Local browser catalog GET: 40 ms; detail GETs: 59–165 ms during concurrent build
load. Discovery GETs: 7–84 ms. These are single local samples, not production
performance or scale guarantees. No pagination/large-tenant benchmark yet.
Disabling the existing dev watcher resolved local server stalls; this changes
only the acceptance process environment, not application configuration.

Screenshots and JSON/log evidence stay ignored in `.local-dev/ux-13d`:
`before-builder.png`, `after-studio.png` (in-app), `automated-before.png`,
`desktop-studio.png`, `tablet-studio.png`, `reflow-studio.png`, browser-report.json,
full-tests-final.json, final-http.json, final-components.json, build-final.log.
Saved fixture names include historical synthetic markers; all shown records
were actually persisted before this milestone. No synthetic runtime substitution.

Calculated traces, original approval metadata and crate packing mappings remain
accurately unavailable under the existing read contract. Staff acceptance,
physical tablet/scanner, screen-reader and actual browser zoom remain pending;
automated viewport reflow does not substitute for those checks. Audits cover
Studio; pre-existing global shell UI is outside this accessibility claim.
No production deployment, main merge, pilot activation or write integration.
