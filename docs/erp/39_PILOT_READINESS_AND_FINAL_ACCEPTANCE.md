# Milestone 12 — pilot readiness and final acceptance

Date: 2026-10-15. Scope: controlled local preparation only; no rollout, actual
opening balances, deployment, main merge or interface redesign is authorized.
Starting local and remote checkpoint: `f7a1eb19742fc832cc432a12fd4ed6f18a295dd3`,
branch `feature/kit-builder-milestone-1`. Unrelated local `AGENTS.md` edits are
preserved and excluded from the checkpoint.

## Acceptance evidence and historical limits

[A01–A16](38_BROWSER_ACCEPTANCE_RESULTS.md) passed in targeted browser groups
sharing synthetic fixtures, not one uninterrupted clean run. No application UI
or business behavior changed in this milestone; that suite was not repeated.
The four label destinations and preview/reprint were checked again in the browser.

| Evidence | Exact database/environment | Established scope |
|---|---|---|
| Original historical fingerprint | Manifest `20261014141752742`: source `experimind_kitbuilder_development`, PostgreSQL 17.5, code `fd15852622452ee2ec8347d25a42d5719e41eec6` | Original physical cluster identity is unavailable; logical name alone does not establish continuity |
| Retained historical recovery | `experimind_pilot_restore_20261014141752742`, current server 17.4, database OID 24576 | Dump, restored rows, sequences, schema and objects validate against the original manifest |
| Browser acceptance and current development | `127.0.0.1:55432/experimind_kitbuilder_development`, PostgreSQL 17.4, database OID 16384 | Current synthetic browser fixture; separate from the retained historical snapshot |

Current cluster: `.local-dev/postgres-data`, system identifier
`7694302522023007552`. Original source cluster/system identifier was not recorded.
The current cluster's `PG_VERSION` file predates browser acceptance, but this is
not proof of original historical source continuity. No historical stock was
edited, imported or reconciled by changing rows.

Recomputed historical fingerprint convention: inventory is MD5 of concatenated
`row_to_json(i)::text ORDER BY id`; ledger is MD5 of concatenated
`(to_jsonb(l)-'packing_pick_id')::text ORDER BY id` (the later link column is
excluded by that historical convention). Both match the reported runbook values:

| Dataset | Retained historical snapshot | Current environment |
|---|---|---|
| Inventory | 9 rows; `e30e23de3bc63dfa2074dda656c2cddb` | 12 rows; `22c2ce24c00be7fefb375b1c598f7629` |
| Ledger | 12 rows; `536e88b3ba0c96db5fddb855ffef93c8` | 20 rows; `b7411a81f6b433c946e8097be7f49ff2` |

These are **not before/after comparisons of one database**. We establish retained
snapshot integrity and current consistency independently. We cannot prove that
all original operational masters/history survived into the current browser
cluster. The names/descriptions source described in [provenance](21_INVENTORY_DATA_PROVENANCE.md)
is not a verified database export or evidence of stock quantities.

## New current-environment baseline and recovery

With ERP writers stopped, a paired backup and isolated restore completed PASS at
2026-10-15T13:39:51.225Z. Private directory:
`.local-dev/recovery/20261015133946131`; new database
`experimind_pilot_restore_20261015133946131`; object root is its `restored-objects`
child. Keep `backup/manifest.json`, `backup/database.dump`, `backup/objects` and
the result together. They remain ignored and are not committed.

- Dump SHA-256: `6481d421bb2fc44bab565298aeaa2926b5e68063809990a04e7f2a51b4b4a60e`.
- Normalized schema SHA-256: `c946c2bb74e405bb7bf786b91e719eb68f836f5dae98be2f66494530c1d3e029`.
- 85 public tables and two sequences matched; current full-row baseline hashes:
  inventory `2e48f5c199a6064ae6acfe819c94eb89ddf6bd20b0169d127509d2fab6646e02`,
  ledger `3a8c846d939e66e49e79027c330abe2d9bd2740053c86c1de2c09a6d8f50d3a3`.
  These use the recovery manifest's sorted JSON/SHA-256 convention, not the MD5
  convention above.
- Eleven attachment records match bytes, sizes and hashes. All 27 object files
  were preserved; sixteen unreferenced objects were reported, not deleted.
- Source row/sequence and object hashes were unchanged after the rehearsal.
- Thirteen additive migrations (0000–0012) are present in both environments;
  sixteen legacy migrations remain intentionally absent. Do not blindly run
  `db:migrate`, initialization, seed, clean or legacy migration commands.

Read-only reconciliation passed with zero failures for balances and ledger
sequence continuity/nonnegative balances; item/organization/unit/location links;
reciprocal packing picks; accepted versus unaccepted receipt ledger entries;
production issue, reservation, QC output and batch totals; reservation scope;
dispatch claims/manifests; custody references; and ledger tenant ownership.
Inventory masters have nonempty names and valid organization references.

The original retained dump SHA-256 remains
`b7548860c3d8a211c5761ba88085e04aa38d6577083ee42738db613b90f0aa6f`;
its schema digest remains
`1b751f445516c6cef9ac1ba4c1599327bac0b18ff8e73b1743791a66f302f1db`.

### Validator correction

The saved schema digest includes `-- Dumped from database version 17.5`.
Dumping the retained restore on the current 17.4 server changed that provenance
comment while leaving definitions equal. Retained validation now reconstructs
only that single expected PostgreSQL 17 header from the manifest's recorded
source version before hashing. Missing/duplicate/unexpected-major headers fail
closed. DDL, client version, other comments, dump bytes, all row/sequence hashes,
object hashes and integrity checks remain enforced. Original manifests and
historical data were not rewritten. Four focused regression tests pass; strict
retained-pair validation passes.

### Credentials and privilege findings

The saved private recovery-administrator credential failed authentication during
the first current rehearsal. Its failed backup target is preserved; no source
writes occurred. The subsequent rehearsal passed through the script's existing
role-capability check, without supplying the stale administrator credential.
The current local `kitbuilder_dev` account already has SUPERUSER and CREATEDB.
No privileges were granted or changed in this milestone. This is acceptable only
as an isolated development finding, **not an operational pilot configuration**.
Before operational use, prepare and verify a separate least-privilege application
role and an operator-held recovery account; refresh and test the recovery secret.
Rehearsal success does not demonstrate application-role least privilege.

## Physical labels and QR — PENDING operator evidence

Existing shared layout: **103 × 80 mm**, 9 pt, material details enabled. Four
synthetic labels were generated through the existing PDF template, separately
and as `.local-dev/pilot-readiness/four-label-samples.pdf`. No packages were added.

| Kind | Package UUID (printed code is `PK-` plus UUID) | Automated result |
|---|---|---|
| Pouch | `e2986591-e71a-4cbf-bb6a-a74058600405` | PASS |
| Box | `b7320252-13bd-4e17-8371-3bce550b8c33` | PASS |
| Common crate | `25a280fb-f7b1-4af1-af6e-54600fba9545` | PASS |
| Kit | `8f9c8a6c-5fe6-4dc4-bcb1-a9f15106c939` | PASS |

Automated checks: PDF MediaBox dimensions equal 103 × 80 mm; one page per label;
complete package code and batch/parent/template/QC/operator/inspector fields;
all four rendered PDF QR images decode to the exact expected URL. Browser lookup
shows the matching kind, project, School B, batch, template revision, accepted QC
and custody information under an authorized current-user session. Prior A11/A15
tenant/auth denial evidence still applies; no authorization code changed.

Browser preview/reprint twice and PDF regeneration preserved the complete
packing-orders plus ledger SHA-256:
`cc65fb462aaa2f2465a8c4d3f98aa7d16bfe52d9680b35c8163cbbd426caaed9`.
Long synthetic batch/order descriptions are ellipsized by the existing layout;
the complete identifiers remain in the authorized QR record. Physical readability
and the adequacy of shortened fields require operator acceptance.

Operator procedure (user has agreed to test; results not yet received):

1. Print all four pages at Actual size / 100%, with Fit disabled, on suitable
   103 × 80 mm media. Record printer/model, driver scaling, media and timestamp.
2. Measure each printed label; record width/height and clipping/readability of
   package ID, item/material information and traceability fields. Do not infer
   paper measurements from the PDF MediaBox.
3. Scan each real printed QR using a phone or scanner; record scanner/model,
   decoded URL and matching package UUID/kind in the signed-in ERP browser.
   These codes use `http://127.0.0.1:3100/?packing_package=<uuid>`: a phone's
   localhost is not this PC. Decode with the phone and open the URL on this PC,
   or use a scanner attached to this PC. No LAN exposure was authorized.
4. Reprint one, scan it, confirm the same package and rerun the read-only
   packing/ledger comparison. Record operator initials and any failure.

Until real measurements, readable prints and four matching physical scans are
reported, physical printing/QR acceptance remains **PENDING**, not PASS.

## Controlled local pilot checklist

Status: **prepared for review; execution not approved**. Proposed scope is one
named warehouse, one manager, one operator and one observer, with an identified
administrator/recovery custodian. Limit to one synthetic project, ten packages
and one supervised shift. Use synthetic data only unless separately authorized.

| Gate | Evidence/status |
|---|---|
| Local start/stop | PASS: verified ERP processes stopped; known cluster fast-stop/start; ERP restarted on loopback |
| Paired backup/restore | PASS for current baseline and retained historical validation; fresh target/root only |
| Application RBAC/tenant isolation | A01–A16 and regression evidence; admin/manager approval, assigned operator actions, viewer restrictions and other-tenant denial |
| Deferred legacy routes | QMS/signature/RMA mutation routes remain blocked with 503; no expansion authorized |
| Database privilege and recovery secrets | OPEN: development role is superuser; saved administrator secret stale |
| Physical labels/scanning | PENDING operator evidence above |
| Warehouse/staff/data/schedule approval | PENDING; do not infer authorization from preparation |
| Opening stock/stocktake | Procedure below; no operational quantities entered |
| Training/issue reporting | Checklist below; operator sign-off pending |
| Backup custody/access | Verify host ACLs and encrypted offline copy/retention before operational data |
| Rollback | Rehearsed into separate target; no environment switch performed |

### Local startup and shutdown

From the repository root, retain the existing environment and cluster. Verify
`HOST=127.0.0.1`, port 3100 and the expected database without printing secrets.
Use the existing embedded server binaries, not a different PostgreSQL service:

```powershell
$pilotPg = '.local-dev/tools/node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe'
& $pilotPg -D .local-dev/postgres-data status
# Start only if stopped:
& $pilotPg -D .local-dev/postgres-data -l .local-dev/postgres.log -w start
npm run dev:kit-builder
```

Use Ctrl+C for the foreground ERP. For a background instance, inspect its process
command and port owner, then stop only that verified server/tsx child pair. Do
not stop every Node process. After writers and DB clients have closed:

```powershell
& $pilotPg -D .local-dev/postgres-data -m fast -w stop
```

Restart the same cluster, then ERP. Verify the signed-in organization, expected
fixture and a read-only page. This sequence passed on the current environment.
Never rerun setup/initialization as a substitute for starting an existing cluster.

### Backup, restore and rollback

Stop ERP writers; leave PostgreSQL running. Supply a tested, operator-approved
local recovery administrator through a private environment file when needed;
do not grant database-creation privileges to the app to make recovery pass.

```powershell
node --env-file=.env.kit-builder-development --env-file=.local-dev/recovery-admin.env scripts/rehearse-pilot-recovery.mjs D:/Experimindlabs/ERP/erp-development/.local-dev/tools/postgresql-17.5/pgsql/bin
# Validate a particular successful pair without modifying it:
node --env-file=.env.kit-builder-development scripts/rehearse-pilot-recovery.mjs D:/Experimindlabs/ERP/erp-development/.local-dev/tools/postgresql-17.5/pgsql/bin --validate D:/Experimindlabs/ERP/erp-development/.local-dev/recovery/20261015133946131
```

The first command requires correcting the stale administrator secret before
following that example. The completed current rehearsal omitted that env file
and used the existing privileged development role; this is not the future
operational privilege model. Rehearsals create a unique database and paired
object root, never overwrite the source. Confirm PASS and manifest/dump/object
hashes, ledger consistency and migrations before considering a switch. Preserve
failed targets for diagnosis. A database-only backup is insufficient.

On a pilot fault: stop writes, capture redacted issue evidence, preserve the
current database/attachment pair, and validate a restore into a new pair. Any
environment switch requires explicit approval; switch DATABASE_URL and attachment
root together while stopped. Keep the previous pair available for reversal.
Do not reverse migrations, delete objects, replay stock movements or edit ledger
rows manually. No cutover or reverse restore was needed for this rehearsal.

### Stocktake, training and stop conditions

Before authorized real stock: freeze movements for the named warehouse, count
items at every location using their approved units, distinguish unknown from
zero, investigate differences, and obtain manager approval. Use the existing
opening-balance/stocktake workflow with one posting per approved count and its
audit trail; verify ledger/balance reconciliation afterward. Never seed legacy
quantities or use SQL updates to force balance agreement. This milestone enters
no actual balances and authorizes no operational migration.

Train staff to verify organization/site and approved template revision, confirm
available verified stock, execute each pick once, resolve revision conflicts
through refresh/review, record QC rejection/correction, and reprint existing
package labels without creating packages. Distinguish delivery/custody from
stock consumption. Practice role denial, logout and recovery escalation using
synthetic records; record each operator's sign-off.

Issue reports must include timestamp, role/organization, screen/operation,
project/batch/package/request IDs, expected and observed result, reproducibility
and redacted screenshot/log. Exclude passwords, tokens and unapproved exports.
Stop the pilot on a tenant leak, integrity mismatch, missing attachment, duplicate
stock movement, incorrect physical QR destination or unresolved server error.
Preserve evidence and require review before resuming.

## Final verification and remaining approvals

Four focused schema tests and 476 regression tests across 65 files PASS.
Typecheck and frontend/PWA/server builds PASS (existing bundle-size warning).
Both retained-pair validations PASS after the change; PostgreSQL stop/start and
ERP restart PASS. Private logs and label artifacts remain ignored.
Review the feature diff and remote SHA before approval. Physical results,
least-privilege configuration, valid recovery credentials, backup custody,
named staff/warehouse and actual pilot authorization remain gates. Actual stock
entry, operational migration, rollout and interface redesign need explicit
approval. No main merge or deployment is included.
