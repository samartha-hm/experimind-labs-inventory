# D6-F8: Trusted packing build recovery and isolated browser acceptance

Date: 2026-11-03. Baseline: 739a391cfc254bda62d2d5b0e63ef1a73fc9ee1d, branch feature/kit-builder-milestone-1.

**BUILD PASS / QC BLOCKED.** Isolated frontend activation and supported browser navigation passed. Physical inspection was unavailable; no QC transaction or attestation was submitted. D6 remains BLOCKED, pilot NO-GO, O1-O10 DRAFT / NOT AUTHORIZED.

## Build recovery

F7 retained only PowerShell NativeCommandError stderr and Vite's chunk-size warning, without complete stdout, launcher or authoritative child status. Its exact original failure cannot be proved. F8 bypassed shell stderr interpretation using Node spawnSync with separately captured stdout, stderr, status and signal. The isolated Vite child exited 0, signal null, in 62,953 ms. The chunk warning remained non-fatal. A full test wrapper likewise reported exit 1 despite passing output; direct child capture established exit 0. This supports a wrapper/reporting issue; no compiler or application defect was established. Sandbox child execution required a constrained host rerun; only the stalled F8 build processes were stopped.

Command: node node_modules/vite/bin/vite.js build --outDir .local-dev/d6f8-trusted, with VITE_TRUSTED_PACKING_ENABLED=true, VITE_TRUSTED_PRODUCTION_ENABLED=false, VITE_TRUSTED_DELIVERY_ENABLED=false. Private helper: .local-dev/d6f8-build.mjs. Default-OFF frontend/PWA and server esbuild also exited 0 into separate private outputs. TypeScript --noEmit exited 0. Running dist was preserved.

| Served artifact | Bytes | SHA-256 | Trusted controls |
| --- | ---: | --- | --- |
| 3104 /assets/index-CjueMsdN.js | 1733958 | bdb4b03c08dce72ac2268482db905ac3b0f72436b0727a59149a4253ddc98e19 | absent |
| 3108 /assets/index-CZ-jNXX9.js | 1746698 | dec8d8d5c93f1e2bf665b4495a835d6ddb6359ede04d4c79bf4429f938ed244f | present |

Both HTTP 200 bodies matched disk exactly. F8's trusted main bundle is byte-identical to F7's previously unserved output. The private build helper's heading probe used an incorrect heading string; independent verification used the actual heading, Trusted packing and QC, and confirmed it plus Accept six-check QC.

## Authority and activation

PackingPanel.tsx and App.tsx use the exact build-time VITE flag. Runtime flags cannot restore compiled-out code. TrustedPackingPanel.tsx requires enabled authority and administrator role, six passing checks with bounded nonempty evidence, inspection notes and physical confirmation before acceptance. Retry retains the same request/idempotency key. production-planning.ts authenticates JWT, refreshes active tenant user/role and requires mutation idempotency; trusted-packing.ts requires admin/super_admin plus receipt-ledger authority. TrustedPackingService and database guards enforce tenant, allocation revision, custody, evidence and audit rules. server.ts retains the isolated receipt authority and correct integrated legacy read-only gate. No gate, default, RBAC, schema or application source was changed.

Private .local-dev/d6f8-preview.mjs serves only 127.0.0.1:3108, using .local-dev/d6f8-trusted and forwarding API/health/ready to existing 127.0.0.1:3104. It uses path containment and no-store responses. Original app PID 20828 and PostgreSQL PID 5296 were preserved; private preview PID 17040. No healthy service restart, replacement dist or deployment.

## Supported browser evidence

In-app browser, existing synthetic admin and tenant, isolated entry: http://127.0.0.1:3108/?trusted_packing_package=b5aecf4a-72f2-4f57-9b4d-097962c40300. Credentials were read privately, reused and never regenerated or committed. Authentication and trusted packing read model succeeded.

Existing plan 198545ea-8816-4921-af67-5cd7361b1fd2 displayed one pending pouch, allocation revision 1, one custody receipt, zero accepted and zero rejected. Allocation 803da359-66f8-4cdf-b618-b89ee3d6cc06 remained 0.1000 m; output 8f705559-cad5-48fe-a191-0064f6c5b94a remained pending_qc with 0.6000 m total and 0.5000 m available.

All six material, quantity, placement, packaging, stickers and instructions checks/evidence fields were visible. Checks and physical confirmation remained unchecked. Only local inspection notes were entered: SYNTHETIC UI GATE CHECK ONLY: physical inspection unavailable; QC evidence and attestation intentionally incomplete. Accept six-check QC and Reject package remained disabled. A fresh authenticated tab reproduced the pending state and disabled acceptance.

| Acceptance item | Verdict |
| --- | --- |
| Successful isolated build and correct served bundle | PASS |
| Existing admin authentication and six-check UI | PASS |
| Incomplete evidence/attestation UI denial | PASS: disabled controls; no forced click or backend denial claim |
| Actual package inspection and physical attestation | BLOCKED: capability unavailable |
| Browser QC acceptance, new receipt/audit and retry | NOT RUN |
| QR/PDF labels and dispatch acceptance | NOT RUN |

No API-only QC mutation or fabricated physical evidence. Software integration coverage does not substitute for the missing browser transaction.

## Verification and conservation

Direct child regression: 84 files passed, two skipped; 645 tests passed, two skipped (647 total), exit 0. Command: node --env-file=.env.kit-builder-development node_modules/vitest/vitest.mjs run --reporter=dot. Recovery tests were skipped, not executed. Full suite uses its isolated test schemas. Backend packing authority cases cover tenant/role denial, custody, stale/double acceptance, immutable retries and rollback; these are regression evidence only.

Final read-only comparison preserved all 111 retained table count/hash fingerprints, including 178 audit rows; digest c6ffdc72010b6f61e9038db5fb02d65e5cb7c5ca0798298ed331dc289875a743. Credential digest, actor state, roles, closure function definitions, closed-project guard, server identity/start time and PostgreSQL system identifier matched baseline. Routine control-file modification time advanced; it is not an immutable identity field. Sessions/auth refresh are excluded from business-table fingerprints. No new QC receipt, custody, stock, commitment, ownership or settlement change occurred.

## Evidence and remaining boundary

Private logs, build status, bundle verification, before/final health, AX captures and screenshot are hash-indexed in D6F_EVIDENCE_MANIFEST.json. They remain local; no secrets, environment files, database files or screenshots were committed. Existing .test-tmp/ and AGENTS.md were preserved.

Next requires actual inspection capability and an authorized truthful UI transaction, then receipt/audit, identical-request retry and conservation verification. Dispatch, delivery and installation full-app acceptance remain open; no downstream completion was exercised. Historical migration provenance remains unresolved. No main merge, deployment, pilot authorization or O1-O10 authorization follows from this result.
