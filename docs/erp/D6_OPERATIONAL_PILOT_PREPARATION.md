# D6 operational pilot preparation — 2026-10-28

**Software preparation: PARTIAL. Operational pilot: NO-GO.** Physical stock and
valuation remain UNKNOWN. This implementation is a preparation slice, not completed
D6 acceptance. D5 acceptance remains limited to the synthetic scope in
[the D5 report](D5_ERP_READINESS_AND_PILOT_GATE.md).

## Implemented scope and gap matrix

| Area | Implemented | Remaining before D6 software PASS |
| --- | --- | --- |
| Readiness | Authenticated tenant-scoped 12-gate dashboard; evidence requirements and next actions; explicit NO-GO | Durable append-only evidence submission and independently authorized review |
| Stocktake | SKU/identity/unit/location blank sheets, revision checks, unsigned JSON and isolated printable HTML | Persisted assignment/progress, distinct count passes and physical-status evidence |
| Hardware | Six practical scenario groups and unsigned evidence template | Actual submission/review workflow; real device acceptance remains separate |
| Staff | Nine role scenarios, training/evidence/supervisor requirements | Named assignments, evidence records and authorized completion review |
| Deployment | Read-only configuration/artifact/disk preflight and opt-in bounded PostgreSQL checks | Executable migration preview, private-file recovery, service and 25-operator load acceptance |
| Rehearsal | Fresh authenticated preparation browser checks; fresh restart/restore of retained synthetic journey | Exact D6 two-school quantities through the complete journey |

No readiness write/approval endpoint or operational GO transition was added.
The existing stocktake writer is scoped to stocktake authority, not staff/device
approval. A generic status toggle would bypass evidence, independent reviewer and
immutable audit contracts. Until a dedicated trusted evidence writer is implemented,
these operational gates stay blocked. Preparation export attribution identifies the
authenticated requesting actor; it is not a signature or accepted observation.

## Operator procedure

1. Sign in and open Inventory / stocktake. Review the operational preparation
   dashboard. Existing sessions make stocktake preparation IN PROGRESS; this does
   not measure physical coverage or prove completion.
2. Declare the stocktake scope and every physical location using the existing
   session workflow. Review item identity and canonical units before counting.
3. Prepare the blind count sheet at the current revision. Download the separate
   HTML sheet and print that file; printing the whole ERP page may reveal other
   stock information. Assign an operator, date and independent count-pass number
   on the sheet. The downloaded JSON deliberately contains null quantities.
4. Count without reference to ledger or legacy balances. Keep UNKNOWN, MISSING,
   DISPUTED and VERIFIED observations distinct on the unsigned evidence. MISSING
   is not permission to enter zero. Preserve evidence reference/hash and reviewer.
5. Use a fresh sheet for each independent pass. Reconcile discrepancies and stale
   revisions against the current session before entering agreed numeric counts.
   The preparation screen does not save these status/assignment/pass fields.
6. Use the existing reconciliation preview for authoritative ledger differences.
   Do not post opening balances or stock adjustments under this D6 authorization.
   Historical activation requires separate explicit authorization.

Only selected session targets and locations appear on a sheet; the sheet is not a
claim that every warehouse item/location was included. Identity/unit errors and
stale revisions block export. Exports cannot be imported or used to post stock.

## Hardware and staff acceptance responsibilities

Record printer/scanner model, driver/firmware, connection/input mode, media,
physical label size, print scale and quiet zones. Print representative common,
universal and independent Math labels. Compare decoded identity with the printed
school/project/package. Test duplicate, malformed, damaged and wrong-school scans,
scanner terminator/focus behavior, disconnect/reconnect and retry reconciliation.
Retain label samples and observed results. Record NOT TESTED, TEST IN PROGRESS,
FAILED or VERIFIED with named operator and independent reviewer externally until
the trusted evidence workflow exists. Automated QR/PDF tests cannot verify devices.

The dashboard supplies practical scenarios for warehouse, purchasing, production,
packing, QC, dispatch, delivery, installation and administration. Assign real people
to their existing authorized roles; complete supervised training and an independent
exercise. Record authenticated identity, scenario, observation time, result,
evidence reference/hash, supervisor and remaining blocker. Exported templates
remain unsigned; no staff sign-off is generated or accepted by this implementation.

## Windows deployment preflight and runbook

From the repository directory, with separately supplied approved configuration:

```powershell
node scripts/ops/pilot-preflight.mjs
```

Default execution makes no database connection or writes. It reports NO-GO and
exits 1 while any check is blocked; it cannot deploy or grant readiness. It checks
Node 22+, production mode, JWT presence/length/default patterns, guest access,
four distinct role URLs addressing one local database, HTTPS origin, build files,
backup directory, retention of at least 14 days and at least 10 GiB free storage.
Existence does not prove artifact freshness, ACL correctness or backup recoverability.
Secret values and connection errors are suppressed. Do not publish configuration.

Set `PILOT_BACKUP_DIRECTORY`, `PILOT_BACKUP_RETENTION_DAYS` and approved application
configuration through the normal private environment mechanism. Optional
`PILOT_PREFLIGHT_CONNECT=true` enables loopback-only, read-only connections with
three-second connection/query bounds. These inspect PostgreSQL 14+, restricted
role attributes and runtime ledger table-write denial. They do not prove every
function grant, identity boundary or migration privilege. Retain restricted-role
test evidence separately. This option was not run against operational infrastructure.

Before a separately authorized deployment:

1. Review registered/applied migrations and rollback compatibility in an isolated
   clone. Never use a general migration command as a preview against live data.
2. Retain a paired database and private-file backup, matching manifest, hashes,
   permissions and recovery point. Verify retention and capacity with measured data.
3. Restore to a fresh isolated database/private-file destination; compare stock,
   commitments, custody, fulfillment, audit and readiness evidence and authenticate
   with restricted roles. A database-only dump is insufficient for private files.
4. On an isolated service, start the verified production artifact under its
   configured noninteractive service account. Check the existing health endpoint,
   authenticated login, role denial and database connectivity. Exercise graceful
   stop and restart; confirm in-flight transaction rollback and retry behavior.
5. Approve HTTPS certificates, LAN-only firewall/proxy rules, private-file ACLs,
   monitoring and backup failure alerts. Verify approximately 25 concurrent
   operators before sizing acceptance. No service/firewall commands were executed
   against operational infrastructure in D6.
6. For an upgrade, quiesce writes, capture the paired recovery point, rehearse
   migration and authenticated reconciliation in isolation, then seek cutover
   authorization. Rollback requires a compatible artifact/schema or coordinated
   restore; do not downgrade an incompatible schema in place.

PWA caching does not authorize offline mutations or acceptance. On disconnect,
stop operational acceptance; reconnect, refresh revisions and reconcile server
state before retrying. Prevent stale cached deployment artifacts during upgrades.

## Contracts and verification evidence

- `GET /api/v1/stocktakes/operational-readiness`: active authenticated tenant context,
  no-store, actor/time attribution, six gate-status vocabulary values, fixed NO-GO,
  `evidence_acceptance_available=false`. D5 VERIFIED is explicitly historical.
- `GET /api/v1/stocktakes/:id/count-sheet?revision=N`: tenant-filtered repeatable-read
  export; foreign session 404, malformed revision 400, stale revision 409; no ledger,
  expected, legacy or previously entered quantities. Rows contain blank evidence
  fields. Printable HTML escapes user text and uses only identity fields.
- Focused acceptance: 19 tests passed across stocktake route and preparation unit
  tests. Preflight configuration tests: 3 passed.
- Full regression: 80 files passed, two opt-in recovery files skipped; 611 tests
  passed, two skipped. Includes existing QR/PDF, restricted authorization,
  concurrency and rollback coverage; this is bounded automated coverage.
- Typecheck and production frontend/PWA/server build passed. Existing large-bundle
  warning remains; performance/load acceptance is outstanding.
- Fresh authenticated Edge browser test passed: readiness, unsigned downloads,
  and 390×844, 1024×768, 1440×1000 layouts.
  Semantic labels/statuses and targeted responsive checks are not a full
  accessibility audit. No hardware or real operator acceptance was inferred.
- Explicit recovery exercise passed before/restart/fresh database restore with
  restricted authenticated HTTP, exact retries, ledger/custody/fulfillment
  reconciliation and unchanged preparation gate/scenario projections. It used
  the retained D5 synthetic browser schema; 103 commitment accounts replayed.
  Private ignored evidence: `.local-dev/d6-recovery-summary.json`,
  `.local-dev/d6-recovery-run.log`, `.local-dev/d6-browser.log`,
  `.local-dev/d6-regression.log`, `.local-dev/d6-build.log`.

All simulated physical attestations in the retained fixture are SYNTHETIC TEST
EVIDENCE. This is not a fresh exact D6 two-school end-to-end rehearsal or a paired
private-file recovery. Required rehearsal remains School A: two Science Grades
8–10 sets → six common/two universal crates; School B: three Grade 8-only sets →
three common/zero universal crates; plus independent Math. Those exact quantities
must traverse procurement through installation/closure with exactly-once and
conservation assertions before claiming D6 software PASS.

## Severity-ranked decision matrix

| Severity | Required evidence | Current result | Decision |
| --- | --- | --- | --- |
| P0 | Verified physical stock, reviewed reconciliation, separately authorized balances | UNKNOWN / absent | NO-GO |
| P0 | Explicit operational approval and historical source authorization | Absent; no GO transition | NO-GO |
| P1 | Durable authorized hardware/staff evidence workflow and real acceptance | Preparation templates only | Software PARTIAL; pilot NO-GO |
| P1 | Restricted operational roles, security, paired recovery and service acceptance | Synthetic subset only | NO-GO |
| P1 | Exact two-school D6 rehearsal, migration preview, load/offline acceptance | Incomplete | Software PARTIAL |
| P2 | Full accessibility and measured deployment performance | Targeted checks only | Outstanding |

No real stock was posted, historical inventory activated, operational credentials
rotated, staff feature flags enabled, service deployed or cutover performed.
No main merge or force push is authorized. Continue the remaining D6 software
scope before claiming PASS; real-world pilot approval is a separate decision.
