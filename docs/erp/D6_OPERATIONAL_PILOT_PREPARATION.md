# D6 operational pilot preparation

Software verdict: PARTIAL. Operational pilot: NO-GO.
All rehearsal records are SYNTHETIC TEST EVIDENCE. No real stock or deployment is authorized.

## Delivered authority

Authenticated, organization-scoped operational records persist through the trusted ledger writer. Commands record actor, observation time, evidence identifier/provenance/SHA256, revision, payload fingerprint and classification. Independent authorized reviewers may record REVIEWED, REJECTED, MORE_EVIDENCE or EXPIRED; these decisions never mean operationally VERIFIED. Immutable revisions and same-key exact retries retain the original response; conflicting payloads, stale revisions, self-review, revoked sessions and foreign scope are rejected. Runtime/identity roles cannot insert records; the writer cannot update/delete them.

The stocktake UI supports scope assignments, two independent counters, UNKNOWN quantities, alternating passes, discrepancy/recount and independent review. Before the second pass, another counter's quantity is withheld, including history. Agreement does not post stock or authorize an opening balance. Retained evidence is available after reload and as attributed JSON. Uncertain UI saves retain the original command/key for retry during that page session; reload requires history reconciliation.

The readiness dashboard separates retained claims from verification and keeps physical stock UNKNOWN and device acceptance NOT TESTED until real authority exists. Simulations and submitted hashes are not proof of the referenced artifact's authenticity or availability.

## Synthetic transaction rehearsal

School A: two complete Grades 8–10 kits, six common crates and two universal crates. School B: three Grade-8-only common kits, three common crates and no universal crates. One independent Math quantity is included for A. Shared output SKU demand is aggregated with all frozen source lines retained; packing remains bound to each approved line. Sub-unit SQL proof formatting is canonicalized.

The test exercises approval, recipe material budgets, verified synthetic opening input, work-order claim/issue/output, full allocation, all six QC checks, blocked pre-QC dispatch, dispatch, partial acknowledgment, exact retries/duplicate rejection, installation acceptance and project closure. Input conservation is checked; delivery acknowledgment does not move physical stock.

Two P0 gaps prevent a full end-to-end PASS:

- Procurement PR/PO/receipt/incoming-QC acceptance runs separately. There is no approved transfer contract linking purchased raw-material ownership into this recipe journey. Implement and independently test explicit ownership transfer; do not fabricate continuity with direct SQL.
- Closed projects retain output-material commitment holds although delivery slots are fulfilled. The test preserves and reports these residual balances. Define an authorized, replayable material fulfillment transition and prevent closure with unresolved commitments.

## Preflight and recovery

Run `node scripts/ops/pilot-preflight.mjs` with separately supplied environment variables. This read-only tool reports PASS/BLOCKED/NOT_VERIFIED, severity, evidence reference and corrective action. Opt-in local PostgreSQL checks are bounded and read-only; schema-aware journal comparison lists pending/unregistered migrations. It never applies migrations, rotates credentials, restarts services or grants GO. Source registration alone does not establish upgrade safety.

The isolated recovery runner fingerprints populated stock, commitment, custody, operational evidence and audit tables; restarts only a verified workspace-owned cluster, restores a nonempty dump to a fresh database, replays commitments and checks fresh authenticated restricted-role HTTP plus original-key retries. Results are private local artifacts. Database recovery does not verify private-file restore, production ACLs or operational disaster recovery.

## Remaining real gates

P0: resolve the two ownership/closure gaps; approve an independent operational verification contract; rehearse production migration ordering on a clone and reconcile its journal.

P1: accountable operators must perform warehouse coverage/variance review and separately authorize opening stock; print and scan representative QR/PDF labels on actual devices; complete supervised staff scenarios; provision intended-host credentials; test paired private-file restore, service lifecycle, HTTPS/LAN ACLs, 25-operator load, offline/reconnect/PWA freshness, logging/retention, feature flags and rollback. Retain attributed evidence and independent review for each gate.

No live credential was rotated and no pilot GO transition was introduced. Local synthetic checks cannot satisfy these real gates.

## Validation retained for this implementation

Full regression: 80 files passed, two skipped; 611 tests passed, two skipped. Four preflight tests, TypeScript and PWA/server build passed. The nonempty synthetic database restart/restore drill passed all three restricted authenticated HTTP phases, evidence fingerprints, exact retries and commitment replay. These results do not resolve the two P0 business-contract gaps above.

Browser acceptance observed synthetic login and authenticated retained evidence/count and NO-GO dashboard rendering. Controls disappeared between interactions; browser write/reload, responsive, keyboard and QR/PDF acceptance remain incomplete for this change. No successful browser claim write or physical device acceptance is asserted.

Read-only final preflight artifact: private .local-dev/d6-final-preflight.json; source-only migration preview, ready=false, pilot=NO-GO. Intended-host environment and database migration journal were not verified by this invocation.
