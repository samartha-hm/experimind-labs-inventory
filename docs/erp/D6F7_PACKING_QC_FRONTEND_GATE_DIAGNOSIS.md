# D6-F7 packing QC frontend gate diagnosis

2026-11-03. Branch `feature/kit-builder-milestone-1`; inspected full HEAD `782b9b133df208e0515584c86c5f7f78f04176c7`. The subsequent report and continuity commit SHAs are recorded in the handoff and completion response; application source is unchanged.

**Diagnosis PASS: the observed OFF-state frontend behavior is correct. QC browser acceptance BLOCKED / NOT RUN. D6 BLOCKED; pilot NO-GO; O1–O10 DRAFT / NOT AUTHORIZED.**

## Root cause and classification

Primary classification **B: effective build-time trusted-packing flag OFF**. Secondary **E: served artifact does not contain the feature required for the intended test**. There is no evidence that browser cache is stale or that an old source revision caused this. No routing, rendering or RBAC defect was established.

The production process uses `.local-dev/d6f-app.env`, which sets `NODE_ENV=production` and `VITE_TRUSTED_PACKING_ENABLED=true`. However, `server.ts:376–397` serves existing `dist` files in production. Vite replaces `import.meta.env` during compilation; a runtime launch variable cannot restore a panel eliminated from that bundle.

Fresh HTTP `/login` references `/assets/index-CjueMsdN.js`, with no Vite development client. The fetched asset is 1,733,958 bytes, SHA-256 `bdb4b03c08dce72ac2268482db905ac3b0f72436b0727a59149a4253ddc98e19`, identical to local `dist/assets/index-CjueMsdN.js`. It contains the legacy packing heading but none of the trusted heading, six-check acceptance action or trusted-packing endpoint. Its imported chunks do not contain a separate lazy trusted panel. HTTP 200 for a source-looking path can be the production SPA fallback; it does not establish a development server.

Existing policy supports feature-enabled disposable builds: `D6F_FULL_APP_BROWSER_ACCEPTANCE.md` records isolated private build scope and a final default build with trusted flags removed. `D6F3_DOWNSTREAM_BROWSER_ACCEPTANCE.md` records a later default build, not feature-enabled browser acceptance. This is consistent with the observed artifact, but does not establish its exact build provenance.

## Route, identity and independent gates

| Layer | Exact gate and implication |
| --- | --- |
| Project navigation | `ProjectPlanningTab.tsx:96` mounts `PackingPanel` for a saved, clean project. The fresh authenticated browser selected the existing synthetic project. App navigation uses state; the retained `/login` URL in F6 is not proof of the wrong screen. |
| Trusted project entry | `src/features/packing/PackingPanel.tsx:15`: `import.meta.env.VITE_TRUSTED_PACKING_ENABLED === 'true'` mounts `TrustedPackingPanel`. Otherwise only other enabled panels and legacy/workspace entry remain. |
| Trusted package query | `src/App.tsx:320` requires the same flag plus `trusted_packing_package`. The direct package URL cannot bypass the flag. |
| Legacy execution | `useExecutionReadiness.tsx` fetches `/api/v1/packing/execution-readiness`. `ExecutionReadinessService.ts:4–11` enables legacy execution only when `VITEST === 'true'` and `commitment_accounts` is absent. Integrated production correctly returns false regardless of administrator role or project claims. |
| Legacy workspace | `workspaceContract.ts` requires development/test, explicit read-only flag and exact tenant allowlist; execution needs a further flag. Production remains OFF. `PackingWorkspaceEntry` falls back to legacy children. |
| Trusted UI capability | `TrustedPackingPanel.tsx` always renders its heading when mounted, even when backend capability is unavailable. Backend failure, missing plan or package state therefore cannot explain the complete absence of that heading. Writer controls additionally require admin/super_admin, enabled capability and no pending/busy request. |
| Backend authority | `production-planning.ts` verifies bearer identity and reloads the active same-organization user/role. `trusted-packing.ts:7–20` returns tenant-scoped plans/outputs only with authority and installed tables; writes at lines 24–31 require tenant administrator and session-bound authority. Missing authority is 503; rejected business requests are 409. No role or authority expansion was made. |

The visible legacy blocker is exactly: “Legacy production and packing controls are read-only. Use the separately authorized trusted workflow panels when available. Preserve existing claims; do not release or recreate them to bypass this block.” It is a correct schema capability gate, not a denial caused by missing project prerequisites.

## Actual browser evidence

The supported in-app browser binding remained available; no alternate controller or backend reselection was used. A fresh tab reused the existing authenticated synthetic administrator session and displayed the existing synthetic administrator, project and saved school configuration (the F6 tenant-bound session was reused). This was session reuse, not a new credential login in F7.

The selected project displayed `Assembly, packing and QC` and the legacy blocker. No trusted heading, six-check fields or acceptance button appeared. A second fresh tab opened `http://127.0.0.1:3104/?trusted_packing_package=b5aecf4a-72f2-4f57-9b4d-097962c40300`; the same trusted controls remained absent. These observations verify the served flag-OFF behavior. They do not verify a feature-enabled screen.

Private browser DOM and screenshots are hashed in `D6F_EVIDENCE_MANIFEST.json`. No incomplete-QC request could be exercised through the absent controls. No physical inspection was fabricated or attested; no QC POST, immutable QC receipt, retry, dispatch, QR/PDF acceptance or custody transaction occurred.

## Bounded correction experiment

No application correction is justified. A future explicitly scoped activation must compile the trusted flag into an isolated synthetic frontend before serving that artifact. Production defaults and the legacy server gate must remain unchanged; merely adding a launch variable is ineffective.

For diagnosis only, Vite was invoked with `VITE_TRUSTED_PACKING_ENABLED=true` and output directory `.local-dev/d6f7-feature-preview`, preserving the running `dist`. It emitted `assets/index-CZ-jNXX9.js` (1,746,698 bytes, SHA-256 `dec8d8d5c93f1e2bf665b4495a835d6ddb6359ede04d4c79bf4429f938ed244f`) containing the trusted heading, endpoint and acceptance action. This supports the flag diagnosis. **The PowerShell build wrapper exited 1**, with a chunk-size warning and no actionable failure detail in the captured log; complete build success is unverified. This artifact was not served, deployed or browser-accepted. No healthy service was restarted.

## Preservation and verification

Final `/health`, `/ready` and `/login` returned HTTP 200; PostgreSQL read-only probes succeeded. Existing allocation `803da359-66f8-4cdf-b618-b89ee3d6cc06` remains `0.1000`, against package `b5aecf4a-72f2-4f57-9b4d-097962c40300` (Pouch 1, school `cd04e9a3-fba5-4cea-9e24-0d65558ff6ab`, Science, Grade 8, Activity 8 / `0.1000 m`). Output `8f705559-cad5-48fe-a191-0064f6c5b94a` remains `0.6000 m`, `pending_qc`; no new eligibility decision was submitted.

All 111 table fingerprints, including audit, match F6 and the preserved baseline: aggregate SHA-256 `c6ffdc72010b6f61e9038db5fb02d65e5cb7c5ca0798298ed331dc289875a743`. Migration registry, closed predicate, closure guards, credential digest and restricted roles also match. Thus recorded source/output, QC and custody quantities remain unchanged. Session/user/refresh-token tables are excluded from the table fingerprint helper; authentication was observed separately. This is preservation evidence, not a successful QC conservation/retry test.

Fresh focused Vitest run: **14 tests, 4 files passed** (`workspaceContract.test.ts`, `PackingInspection.test.ts`, `trustedOutputMatching.test.ts`, `packingPlan.test.ts`). Initial sandbox collection failed with EPERM renaming a temporary file; the same command passed when rerun with approved filesystem access. Coverage includes production workspace OFF, exact tenant allowlist, unauthorized inspector, accepted ancestry/ineligible state, and output matching. No application source changes, typecheck or full regression were needed.

Backend cross-tenant denial and immutable QC/idempotent retry cases were source-traced in `packingAuthority.cases.ts`, alongside the unchanged route/authority implementation; they were **not freshly executed**. There is no claim of new end-to-end authorization, duplicate-request or residual-hold acceptance. Running their broader mutation/recovery harness against the preserved fixture was unnecessary for this correct closed-gate diagnosis.

Documentation diff/JSON checks are required before commit. `.test-tmp/`, unrelated AGENTS.md, private evidence, environments and database fixtures remain excluded from the scoped commits.

## Remaining boundary

Stop at this diagnosis. A separately authorized isolated frontend activation and successful build are needed before authenticated six-check UI acceptance. Actual inspection capability and truthful six-check evidence remain mandatory. Immutable receipt/audit, retry conservation, QR/PDF and dispatch acceptance remain outstanding. Historical migration provenance remains unresolved. No ownership transfer, settlement, historical activation, operational migration, real inventory movement, merge, deployment or pilot is authorized by this result.
