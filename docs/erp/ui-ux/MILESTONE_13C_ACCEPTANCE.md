# Milestone 13C acceptance — 2026-10-16

DEV-only, synthetic, memory-only refinement verified; awaiting user design review.
No operational route, API, schema, calculator, ledger, RBAC or history changes.
The existing DEV lazy entry remains `/__design/13b`.

## Regression recovery

Existing isolated PostgreSQL data reconnected on port 55432, using only named
development/test databases. No initialization, reset, migration or seed occurred.
All previously skipped tests were missing verification, not intentional skips:

| Recovered suite | Passing tests |
| --- | ---: |
| packing.integration | 17 |
| productionPlanning.integration | 11 |
| productTemplates.integration | 20 |
| projectPlanning.integration | 11 |
| stocktakes.integration | 15 |
| supplyPlanning.integration | 10 |
| Total | 84 |

Full suite: **492 passed, zero failed/pending, 67 files**, including nine new QC
workflow tests. A recovered run exceeded the label PDF test's default five-second
timeout; all tests passed with 20 seconds and two workers, without weakened
assertions. Authenticated existing ERP navigation: **1 passed, 23.7 seconds**.
Stale local servers initially timed out; fresh local processes resolved this.
Typecheck and frontend/PWA/server builds pass; existing large-bundle warning remains.

```powershell
node --env-file=.env.kit-builder-development node_modules/vitest/vitest.mjs run --testTimeout=20000 --maxWorkers=2 --reporter=json --outputFile=.local-dev/ux-13c/full-tests.json
node --env-file=.env.kit-builder-development node_modules/@playwright/test/cli.js test pilot.pw.ts -g 'A01 admin login'
node node_modules/typescript/bin/tsc --noEmit
npm run build --silent
node scripts/validate-design-preview.mjs
```

## Browser and accessibility

Edge Playwright fallback followed an unresponsive in-app browser. The committed
validator uses local axe-core: install it separately under
`.local-dev/ux-13c/tooling`, or supply `AXE_SCRIPT`. External Google fonts were
blocked for deterministic checks; fallback fonts limit typography comparisons.

Eleven check groups pass: dialog keyboard containment/Escape/focus restoration;
missing mapping blocks; revision differences/conflict retention/approved baseline;
complete-set validation and independent Mathematics inputs; empty/long/dense
fixtures; responsive light/dark layouts; role-separated QC lifecycle with retained
exceptions; loading/error/offline/denial/lookup states; reduced motion; command
navigation; and six automated accessibility audits. No JavaScript errors occurred.
Six axe audits cover light/dark Kit and QC, invalid allocation and dense tablet,
using WCAG 2 A/AA, 2.1 AA and best practices: **zero automated violations**.
Unsupported ARIA labels found during inspection were corrected with valid roles.

No horizontal overflow at desktop 1440×1000, landscape tablet 1024×768, portrait
768×1024, narrow 375px and 512×384 equivalent 200% reflow. Equivalent reflow does
not establish actual browser zoom acceptance. Portrait places education above
the editor/inspector; landscape preserves three Kit columns. Floor actions are
at least 56px high, checklist rows 72px, reduced-motion transitions 0s.

Historical before evidence was retained, not recreated:
`.local-dev/ux-13b/kit-desktop.jpg`, `kit-tablet.jpg`, `packing-tablet.jpg`.
After evidence lives in `.local-dev/ux-13c/`: `after-kit-desktop.png`,
`after-kit-tablet-portrait.png`, `after-kit-tablet-landscape.png`,
`after-packing-tablet.png`, dark/error/stress images, browser-report.json,
command logs and evidence-sha256.txt. Files remain local/ignored; validator and
acceptance record are committed. Historical before images differ in capture
conditions and are not a controlled typography benchmark.

Manual acceptance remains: screen readers, contrast review, actual browser zoom,
warehouse staff, gloves, physical tablets/scanners and real print/scan testing.
Automated checks do not establish complete WCAG compliance.

## Review gate

See [refinement](MILESTONE_13C.md) and [integration proposal](MILESTONE_13C_INTEGRATION.md).
The read-only flag is proposed, not implemented. User review and approval precede
live integration. Milestone 12 physical print/scan, app-role privileges, saved
recovery credentials, backup custody, named pilot approval and historical database
continuity remain unresolved. No merge, deployment or pilot activation occurred.
