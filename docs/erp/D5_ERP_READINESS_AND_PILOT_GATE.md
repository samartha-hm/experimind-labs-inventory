# D5 consolidated ERP readiness and pilot gate

Date: 2026-10-23. Branch: `feature/kit-builder-milestone-1`.
Starting revision: `370e28921bfb784a065bac576473fb63b2d983a4`.

**D5 software acceptance: BLOCKED. Operational pilot: NO-GO.**
Append-only historical review, automated regression and fresh nonempty recovery
pass within the scope below. Complete authenticated operator acceptance does not.
This document supersedes the earlier read-only D5 slice report.

## Implemented historical reconciliation

Administrator-only review covers seven fixed sources: inventory items, project
stock reservations, purchase requests/orders, production work orders, packing
orders and delivery orders. Tenant-scoped preview/export retains source lifecycle,
raw provenance, decimal quantity strings, row/page hashes and explicit blockers.
Source quantities remain unknown/unreconciled; verified historical quantity stays
null. Review decisions never create stock, commitments, custody or fulfillment.

Five append-only decisions are supported: accepted_for_review, disputed,
insufficient_evidence, excluded and requires_documentation. Each records reason,
evidence references with hashes/provenance, authenticated actor, server time,
source snapshot/hash, revision and previous decision. Acceptance for review is
not operational approval or historical activation. The UI presents attributed
history and changed-source warnings, preserves filters after saving, supports
50-row pagination/export, and freezes the attempted payload/key for exact retry.

The write transaction locks the source and decision sequence, enforces current
revision/source hash, and appends authority receipt and audit evidence. Database
triggers enforce live tenant administrator membership, immutable history and
matching deferred authorization/audit witnesses. Runtime is read-only for history;
identity receives no history permission; writer access remains narrowly scoped.
Source column update grants support row locks, not application mutation authority.
Historical audit updates/deletes and audit truncation are denied. The migration
refuses production databases and non-test schemas; production migration approval,
role provisioning and deployment are outstanding, not silently bypassed.

Tests cover parallel exact retry (same result), conflicting revision race,
idempotency payload conflict, stale hash/revision, forged actor, malformed refs,
missing/foreign source, expired/missing token, viewer denial, all five decisions,
immutable history, restricted-role denials and unchanged operational fingerprints.
Limit: write-path fixtures do not exercise all seven source types individually;
a standalone direct-writer missing-witness case is not separately asserted.
The existing conservative preview is not a complete authoritative lineage graph
or automated conflict-resolution engine. Offset pages are separate snapshots.

## UI defects corrected

| Finding | Change | Verification |
| --- | --- | --- |
| Login inputs lacked explicit labels | Email/password labels and autocomplete | Authenticated synthetic login |
| Global search lacked a named modal and keyboard result controls | Native modal dialog, named input/close, result buttons, focus restoration and corrected kit navigation | Browser named dialog/input/close/results; Escape restores global-search focus |
| Search fields lacked names | Global and inventory search accessible labels | Browser global search; source/typecheck |
| Production output wording implied finished acceptance | Explicit pending-QC status | Browser output receipt |
| Dispatch selection retained another school's plan | Synchronize plan and clear receipt/confirmation fields | School B to School A switch updates closure totals |
| Packing retry could clear without a fresh reconciliation | Require explicit refresh and renewed confirmation | Automated regression; final corrected retry sequence not fully repeated in browser |
| PDF preview appeared blank | Accessible HTML label/manifest with SVG QR and lookup links; PDF download retained | Browser label/manifest at phone/tablet widths; PDF/QR automated regressions |
| Receipt/QC UI sent obsolete unauthorized contracts | Disable incompatible receive/QC controls with explanation | Original attempt returned 400 without mutation; rebuilt browser shows authority explanation; no legacy authority reopened |

The last item is a safe restriction, not completion of receiving. The trusted
receipt endpoint requires approved demand coverage, bound input and trusted
capability; the current operator UI cannot obtain that authorization. Existing
legacy receive/inspect routes remain fail-closed. **P1: implement and verify the
trusted receipt/QC operator workflow before claiming software PASS.**

## Actual authenticated browser acceptance

All actions used a synthetic administrator in a fresh local test database, with
explicit user authorization for assignment to the retained synthetic tenant.
No real stock, supplier documents or business approvals were used.

| Workflow | Observed result | Remaining acceptance |
| --- | --- | --- |
| Login/session/dashboard/navigation | Login/logout and expired-session reauthentication; dashboard shows 23 shortages and 3 replenishments | Complete role-by-role browser coverage |
| Multi-school Science/Math | Two-school D5 Browser Acceptance project; independent Science/Math selections, explicit Universal zero; template v2/revision 2; decimal calculation and dirty-state guard | Full approved project lifecycle in one browser scenario |
| Inventory/stocktake | Posted synthetic 1 g stocktake, actor/approver and immutable history; verified ledger separate | New count/post browser journey and physical counts |
| Historical decisions | Required explanation focus; wire filter and empty result; saved requires_documentation with attribution; filter/focus retained; original 987 m remains unknown | Full seven-source operator walkthrough and lineage/conflict resolution |
| PR/PO/receiving/QC | Approved PR and authorized PO reviewed; PO .075 m ordered, .004 delivered, .071 remaining; pending/accepted/rejected receipts visible | Positive new PR/PO, receipt and QC browser writes; trusted receipt UI blocker above |
| Production | Recorded .01 m output, pending QC; remaining issue entitlement zero | Positive fresh material issue browser action |
| Packing/six-check QC | School B allocation and package with 2/2 materials and six checks passed; empty package denied; denial exact retry retained | Full successful new allocation/QC browser sequence |
| Labels/QR/manifest | Accessible content preview, code, project/school, materials, inspector, QR lookup links; manifest three School B roots | Actual printer, physical scan and downloaded print acceptance |
| Dispatch/partial delivery | School B 3/3; School A 2/2 through two one-unit receipts; correct plan selection and receipt chronology | New authorized dispatch and partial delivery browser writes |
| Installation/closure | School A 7/7 checklist completed, revision 4 installed, recipient accepted, project closed; School B not required | Real site evidence and staff acceptance |
| Phone/tablet | 390px page and 350px panels; 1024px page and 687px panels; label/manifest previews fit; history reflow checked | All routes, physical devices, assistive technology and offline/reconnect |

Concrete synthetic browser evidence:
- Review decision `2a0e7ed4-01d7-4fb8-903e-a928faa97aba`; reference
  `D5-UI-SYNTHETIC-WIRE-001`; documentary lineage still required.
- Production output `94ed93ed-1725-4345-af3d-fe36c585f14c`.
- Package `PK-814dbd73-7592-41c1-9daa-46841c25905e`.
- Installation `81599143-db79-4ae0-9276-61564d048977`.
- Closed synthetic project `d5d83dcd-68d9-455c-aaa1-2b64ff05c40e`.

Browser evidence is scoped observation, not whole-app accessibility certification.
No physical scanner/printer, screen-reader, real-device or offline acceptance is
claimed. Automated denials do not substitute for browser role acceptance.

## Final automated verification and fresh recovery

| Check | Result |
| --- | --- |
| Full suite on final code | PASS: 79 files / 608 tests; two opt-in recovery files/tests skipped; 45.28 seconds |
| Typecheck | PASS |
| Frontend/PWA/server build | PASS; existing large-bundle advisory remains |
| Separate fresh nonempty recovery | PASS: clean restart, changed postmaster, restore into a new database |
| Authenticated recovery operations | PASS before restart, after restart and after restore: fresh authorized mutation, exact retries, duplicate denial, restricted-role checks and historical decision persistence |

The recovery baseline contained 36 stocktakes, 241 stock events, 72 balances,
103 claims, 74 entitlements, 16 work orders, 15 issues, 14 outputs, 8 packing
packages, 32 allocations, 16 QC records, 4 dispatches, 5 delivery receipts,
4 installations, 2 closures, 124 audit records, 188 authorization receipts and
6 historical decisions. Each phase added one historical decision and two
corresponding audit/authorization records (including another authorized operation).
Seventy-two accounts replayed consistently. Recovery used restricted runtime,
identity and ledger connections after owner-only fixture provisioning. Recovery
operator-browser checks were not run; the separate UI work above used the source
synthetic database and does not imply browser verification of the restored DB.

Local evidence (uncommitted; credentials and database dumps excluded):
- `.local-dev/d5-full-final.log`, `.local-dev/d5-build-verified.log`.
- `.local-dev/d5-recovery-summary.json`, `.local-dev/d5-nonempty-receipts.sql`.
- Schema `requirement_test_d6abcbbb191c45a9bb62d1992e154772`.
- Source database `experimind_kitbuilder_test`, isolated port 55432.
- Restored database `experimind_production_restore_aaad918d47876641`.

Reproduction, from repository root with the already provisioned synthetic env:
```powershell
$env:TEMP=(Resolve-Path '.local-dev/d5-temp').Path
$env:TMP=$env:TEMP
node --env-file=.env.kit-builder-development --env-file=.local-dev/d5-database.env node_modules/vitest/vitest.mjs run --reporter=dot
npm run typecheck --silent
$env:VITE_TRUSTED_PRODUCTION='true'
$env:VITE_TRUSTED_PACKING='true'
$env:VITE_TRUSTED_DELIVERY='true'
npm run build --silent
$env:PRODUCTION_RECOVERY_ARTIFACT_PREFIX='d5'
$env:PRODUCTION_RECOVERY_DATA_DIRECTORY=(Resolve-Path '.local-dev/d5-pg').Path
node --env-file=.env.kit-builder-development --env-file=.local-dev/d5-database.env scripts/verify-production-recovery.mjs
```
Recovery requires the retained nonempty fixture and local PostgreSQL tools; it
must not be pointed at a production cluster. The Windows recovery logfile now
lives outside the data directory to avoid an open-file rename failure.
Sandbox loopback EACCES failures were superseded by the authorized successful
suite. The inaccessible older port-55433 cluster was not modified or bypassed.

## Remaining gates and stop condition

1. Engineering: implement trusted receipt/QC authorization and UI; complete fresh
   positive PR/PO, issue, allocation/QC, dispatch/partial-delivery browser paths.
2. Engineering/QA: complete authoritative lineage/conflict reconciliation and
   consolidated lifecycle acceptance; role matrix, offline/retry and full route
   keyboard/accessibility checks. Preserve unknown historical quantities.
3. Deployment owner: separately authorize production migration/role provisioning,
   backup/restore procedure and configuration. Test-only migration is intentional.
4. Operations: verified complete-location physical counts, unit/material mapping,
   recipes, approved school selections, supplier/site evidence and staff training.
5. Pilot owner: printer/scanner/real-device/offline trial and named GO signoff.

No production deployment, real inventory mutation, historical activation, main
merge, force push or legacy QMS/RMA/signature reopening occurred. D5 stops with
these explicit blockers; no full software PASS or pilot GO is asserted.
