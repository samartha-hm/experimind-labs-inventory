# D6-F2R — preserved PostgreSQL recovery and allocation diagnosis

2026-10-30. **PARTIAL — NOT PASS:** preserved synthetic recovery verified; current packing allocation verified; original denial root cause **INCONCLUSIVE**. D6 remains **BLOCKED**, operational pilot **NO-GO**. No implementation defect was proved or changed.

## Baseline and preservation

Branch `feature/kit-builder-milestone-1`; initial local and remote HEAD `530db7f0615e01495e830436ddf37acc05dc8a60`. Unrelated `AGENTS.md` modifications and `.test-tmp/` retained. Existing cluster, schema, credentials and previous D6-F evidence retained. No preparation replay, schema reset, operational migration, ownership settlement or credential rotation.

Preserved database `experimind_kitbuilder_test`, schema `requirement_test_65e4d0314cc341f7b81dae97c9e936df`, cluster `.local-dev/d5-closure-pg`, explicit listener `127.0.0.1:55432`. This is the original browser fixture, not a replacement restored over it. Its earlier preparation cloned synthetic source schema `requirement_test_2b47d7075f4b41f8a1a8f613d9b15678`; that synthetic lineage does not establish historical migration provenance.

## PostgreSQL diagnosis

- Cluster major version 17; server binary PostgreSQL 17.4, Windows x64/MSVC; client dump/restore tools 17.5. No major-version mismatch.
- Old PID file did not represent a live server: process/listener checks and connection refusal preceded startup. No competing PostgreSQL service/start was found. No lock file was manually removed.
- Data owner `DESKTOP-P906OEH\Hp`; Administrators/SYSTEM full control, Authenticated Users modify, Users read/execute. Explicit command-line port/address override commented defaults (5432/localhost).
- One supervised server started at 22:35:54 IST, PID 22284, ready at 22:36:57. Startup logged advancing data-directory sync paths at roughly ten-second intervals, then end-of-WAL (`expected at least 24, got 0`), redo not required, successful checkpoint and readiness. This sequence demonstrates progressing recovery, not a corruption diagnosis. No WAL/control metadata repair was attempted.
- Resource snapshot: D: 276,149,972,992 free of 314,347,352,064 bytes; memory 621,792 KiB free of 7,697,896 KiB. Earlier free memory was about 303,324 KiB. Memory pressure was present; an exact I/O/resource cause for startup duration was not measured.
- Supported SQL control inspection: system identifier `7699797950123419544`, control version 1700, catalog 202406281, timeline 1, no backup recovery required; initial WAL inventory five files/80 MiB. Server reported recovery false. `pg_controldata` was unavailable in the supplied binary bundles, so SQL `pg_control_*` and `pg_ls_waldir()` were used.
- Clean fast shutdown completed at 22:47:27 IST. Same cluster restarted at 22:47:37, PID 13528, ready within a second. Postmaster start time changed; system identifier and reconciliation hashes did not.

Runtime, identity and ledger roles are distinct and all have superuser/createdb/createrole/inherit/replication/bypassrls false. Genuine restricted authority initialization passed on source and restore. The cloned browser schema has **no applied migrations journal**; no rows were fabricated. Source registration and installed guard inspection are verified separately from historical upgrade acceptance. Packing guard definition MD5 `52b631b531ada09ce9003fc70013ab5f`; residual closure predicate MD5 `454d161d07eba3a2c67824a80371f392`. Source/restore definitions match; the fixture project remains blocked by the closure predicate.

## Allocation trace and evidentiary limit

Authenticated administrator `514e643b-023b-41ff-b942-7e63fcbeff66`, tenant `922a1026-f552-4349-a8a0-cbf3fd3a9e1a`.

| Identity | Value |
|---|---|
| Project / school | `7eaae636-0589-4474-91c1-208a16800c5f` / `cd04e9a3-fba5-4cea-9e24-0d65558ff6ab` |
| Approval / revision | `84b521f7-1e66-494e-b459-bfa3c5433f3b` / 1 |
| Frozen approval hash | `7f8d41128cc5843b56dc942b15b07ba3ea5dcf828ebff5e5916801af668037e6` |
| Work order | `ba4d89eb-f224-4b85-a6b8-22221462a4ed`, revision 2 |
| Output / source | `8f705559-cad5-48fe-a191-0064f6c5b94a` / `dc12bedc-13af-4ab2-bd4c-31a26aa4d7a3` |
| Plan / package | `198545ea-8816-4921-af67-5cd7361b1fd2` / `b5aecf4a-72f2-4f57-9b4d-097962c40300` |
| Frozen material / SKU | `98a9942c-e6b7-4c40-91d5-c0baa8be40d0` / `f602b2ec-104a-4632-9981-50945d0af319` |
| Selection / version | `9d4a95f2-0265-4ee0-bb18-679d324af0a7` / `3afc2754-8e45-451f-bad0-45bd08586bbb` |

Aggregate demand is 0.6000 m: Science Grade 8 activity 0.2 m plus Grade 8 common crates 0.4 m, two selected sets; other grades/Math/universal contributions zero. The selected pouch material requires 0.1000 m. Output custody contains 0.6000 m, pending QC. Work-order/source checks and exact school/material/selection/version/unit checks passed without releasing or recreating claims.

Original saved key `8c561349-cc4c-44a1-8329-dc85caf042f6` has no durable authorization receipt. The original browser evidence shows selection and quantity but does **not** retain the actual outbound JSON, original session/capability or detailed server/SQL error. Old diagnostic error logs are empty; available PostgreSQL logs do not identify the browser denial. Therefore neither a payload mismatch nor an authority failure can be inferred from the generic denial.

Reconstructed request:

```json
{"action":"allocatePackingOutput","key":"8c561349-cc4c-44a1-8329-dc85caf042f6","input":{"plan":"198545ea-8816-4921-af67-5cd7361b1fd2","package":"b5aecf4a-72f2-4f57-9b4d-097962c40300","output":"8f705559-cad5-48fe-a191-0064f6c5b94a","line":"98a9942c-e6b7-4c40-91d5-c0baa8be40d0","quantity":"0.1"}}
```

Its canonical SHA-256 is `4c64a495b7757c9a8563f23e962fe4d100bbaefbccdd34a42a5f6d79621a9f74`; this is **reconstructed**, not the unknown historical submitted fingerprint. Owner and restricted-ledger immediate guard probes passed and rolled back. A real authenticated authority/service transaction also passed `SET CONSTRAINTS ALL IMMEDIATE`, then intentionally rolled back instead of committing. This includes real authorization, audit and deferred witness checks, but is not browser evidence.

The in-app browser bootstrap timed out/reset. Repository Playwright/Edge fallback logged in through application controls, selected this exact package/material/output, entered `0.1`, and submitted a **fresh key**, `9736c55f-6490-4bee-a334-6f52953443ca`. HTTP **201** returned allocation `803da359-66f8-4cdf-b618-b89ee3d6cc06`, quantity `0.1000`. Captured request fingerprint `5de60574f802019c6362ac636a9e395dffd041fcdb7f54775654507c93679cff` matches the durable authorization. Database reconciliation found exactly one allocation, one corresponding authorization and its audit witness; output remainder is 0.5000 m. Plan allocation revision changed 0 → 1. A fresh browser login after restart displayed the allocation.

**Deviation:** the fresh tab could not access the original tab's saved request. Its new-key success does not satisfy the requested exact pending-key browser replay. The historical key was tested only in the rollback diagnostic before the new allocation. Do not now replay that old key into the filled package: it is a different operation and would over-allocate. No saved request was programmatically cleared or rewritten.

**Classification: INCONCLUSIVE, not an evidence-backed choice among the requested denial categories.** Current evidence excludes a present reproducible aggregate selector, consumed old key, restricted writer or missing ownership-contract prerequisite for the reconstructed operation. It cannot exclude a historical UI/session/baseline difference. A successful reconstruction does not prove the original denial was correct. No application/migration change or failing-before regression is justified.

## Verification and reconciliation

| Check | Result |
|---|---|
| Focused packing integration and aggregate matching | 20 passed, 2 files |
| Complete database-enabled sequential regression | 645 passed / 2 skipped, 84 passed files / 2 skipped files, 96.78 s |
| Typecheck | Passed |
| Feature-enabled frontend, PWA and server build | Passed; existing bundle-size warning |
| Restricted authenticated exact replay | Same receipt twice, one plan allocation, before restart / after restart / fresh restore |
| Source restart | Clean stop/start, changed postmaster start, unchanged system identity and 111 table hashes |
| Fresh restore | New `d6f2r_restore_20261030`, same cluster; custom-format schema backup with owner/ACL preserved, no overwrite |
| Closure / credentials | Source and restore guard definitions match; closure blocked; credential digest matches |

Default opt-in recovery tests remain skipped; the 645-test run is not described as executing those two tests. Separate explicit preservation checks above use existing credentials and do not invoke the existing recovery harness that rotates its fixture password. These checks cover restricted service authority and browser reload, not the full scope of that harness or production-host/private-file recovery.

Post-allocation baseline, source after restart and fresh restore all have 111 reconciliation tables with SHA-256 `c6ffdc72010b6f61e9038db5fb02d65e5cb7c5ca0798298ed331dc289875a743`. Canonical reconciliation excludes users/auth sessions/refresh tokens; credentials were compared separately between source and restore. Initial pre-allocation digest observed was `dababeb485af2f7e21c253f21b4df3aaa81975b12866f06fb0f1746ff7f614d9`; its health JSON was subsequently replaced by the post-allocation capture, so a complete retained pre-allocation table-by-table diff is unavailable. The retained initial state capture independently shows zero allocations for this plan and no old-key receipt.

Schema-wide post-allocation counts, unchanged across restart/restore: allocations 54; QC rows 22; authorizations 259; audit logs 178; audit_events 0. The populated fixture contains earlier synthetic regression records: these totals are not browser-created counts. The selected plan alone has one allocation and no newly performed QC. No fixture data was reset to obtain these results.

Private artifact hashes are appended to `D6F_EVIDENCE_MANIFEST.json`. Dumps, credentials, raw private evidence and generated builds are not committed. Earlier sandbox checks failed with EACCES to loopback/CIM; approved executions succeeded. Failed diagnostic SQL used an incorrect table name and was corrected; it made no mutation.

## Remaining work

D6-F2R cannot be marked PASS without the original denial's evidence-backed classification. Preserve old evidence and distinguish this verified new allocation from the unavailable pending-key replay. If original request/error evidence can be recovered, compare it before further mutation; otherwise retain the historical limitation. Any new denial should capture outbound payload/key and sanitized error at occurrence.

Six-check QC, PDF download, dispatch/delivery/installation, closure-denial UI and remaining D6-F adversarial/device/accessibility acceptance were not performed. Stop this focused milestone here. O1–O10 approval and authentic historical migration provenance remain separate D6 blockers; no pilot, deployment, real inventory or settlement action is authorized.
