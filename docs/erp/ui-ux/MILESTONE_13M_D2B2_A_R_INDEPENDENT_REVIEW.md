# Milestone 13M-D2B2-A-R — independent purchase-order accounting review

Date: 2026-10-19. Verdict: **CONDITIONAL PASS for isolated synthetic PO commitments**.
No reproducible accounting or authorization bypass was found in the reviewed path.
This verdict does not authorize operational receipts, QC, stock posting or deployment.
Isolated D2B2-B may be considered under a separate authorization and the prerequisites below.

## Baseline and scope

Branch `feature/kit-builder-milestone-1`; starting local HEAD and live origin branch
both resolved to `d8aedecae39a4c1068c4d550d1c61650eec483d1` before work.
Only unrelated `AGENTS.md` edits were present; they remain excluded from review commits.
Read AGENTS, session handoff, D2B2-A acceptance, D2B1-R and D2A-R reviews, and
the D2 demand/reconciliation design. Inspected the PO and PR services, trusted
authority, database boundary, deferred guards, focused tests and recovery script.
Changes comprise adversarial tests, review evidence and documentation; no service,
schema, receipt, stock or operational workflow implementation changed.

All database work used guarded `127.0.0.1:55432/experimind_kitbuilder_test` and
unique synthetic schemas. Bootstrap/restore role `kitbuilder_dev` is superuser
and role creator: it supplies fixtures, migrations, fault triggers and restore only.
Actual operation and attack connections use separate LOGIN runtime (`rt_`), identity
(`id_`) and private ledger (`lg_`) roles. Captured current_user=session_user;
all three have superuser, create-role, create-database, replication and bypass-RLS
flags false. Startup boundary assertions check ACLs, ownership, memberships and
search paths. The bootstrap account is not evidence of a restricted application role.

Fresh reproducible results and synthetic hashes are in
[review fingerprints](MILESTONE_13M_D2B2_A_R_FINGERPRINTS.json).

## Coverage conservation and lineage

The authoritative chain is current approval/revision → demand account and entitlement
→ frozen approved PR revision/line → live root PR claim and source slice → immutable
PO mapping → exclusive half-open quantity interval. School/site, organization,
project, material UUID, unit, approval and revisions must match this chain.
Names and equal quantities supply no lineage proof.

Valid partial creation, increase, review and approval leave all six core ledger
fingerprints unchanged: accounts, entitlements, balances, claims, sources and events.
PO coverage attributes existing H; it does not acquire another H. A=F+H+U remains
`2.4 = 0 + 0.2100 + 2.1900` in the shared PR/reservation account. In the final
focused run, the PR's `0.2000` hold contains `0.177000` ordered and `0.023000`
unordered; five intervals cover three POs. Race winners can change these final
counts within the asserted caps. Reservation H and PR H consume one shared A cap;
over-cap attempts fail, rather than counting a PO as new available coverage.

Verified rejection of missing/duplicate source claims, wrong source slice, forged
claim UUID, wrong project/item/unit/approval/demand revision/line/PR/site/PR revision,
wrong supplier and unsupported precision. Missing, empty and duplicated planning
lines, forged line metadata, overlapping coverage insertion and mutable source
intervals reject with snapshots unchanged. Competing partial POs cannot collectively
exceed a PR hold. Review/approval cannot allocate additional coverage. The SQL witness
also requires exact frozen metadata and one planning line; source claims must be
unretired roots with zero fulfillment. Historical, retired, child or superseded
sources have no supported activation path; historical reconciliation remains blocked.
The retired-source conclusion includes guard inspection, not a new PO-specific
retirement race experiment.

## Concurrency, retries and atomicity

| Challenge | Result and evidence boundary |
|---|---|
| Two POs competing for remaining PR hold | Exactly one succeeds; final aggregate never exceeds hold |
| Concurrent same bearer/key/payload retries | Both return original PO; complete write snapshot unchanged |
| Lost response | Original capability replays committed result without duplicate audit/coverage |
| Changed payload/key; new capability for used key; duplicate PO identity under another key | Rejected without writes |
| PR adjustment against PO creation | Encumbered PR adjustment rejects; valid partial creation succeeds |
| Increase versus review | One wins at exact revision; stale loser rejects |
| Increase versus unsafe cancellation | Increase succeeds; cancellation remains blocked |
| Current approval revision changes | Serialized; revision change commits; stale operation and old-result retry reject |
| Failure AFTER PO, mapping, coverage, audit, retry-receipt insert | Each injected exception rolls back all thirteen snapshotted tables |
| Deadlock and serialization victims | Shared foundation tests produce real 40P01/40001; transaction rolls back; caller same-key retry succeeds |

The PO tests exercise contention, not a separately forced PO-specific deadlock.
Lock inspection shows requirement/project validation followed by balance, item, PR,
PO and sorted source claims; same-key advisory serialization precedes execution.
PR changes share the requirement/balance/item/PR lock order. Immutable authorization
receipt, supply audit, mapping, source coverage and PO state commit in one transaction.

**Documentation correction:** the trusted executor does not automatically retry
transient transaction failures. Callers must retry the original capability, key and
payload while that capability remains valid. An expired or revoked bearer cannot
provide indefinite recovery. The previous D2B2-A acceptance wording was corrected;
the implementation was unchanged. Future clients need explicit failure classification
and bounded retry/recovery behavior.

## Tenant, RBAC and token security

Authorized HTTP/private-authority PO operations succeed. Missing authentication,
cross-tenant access, supplied administrator identity, forged administrator UUID,
audience/scope/subject substitution, changed request fingerprint, fresh-key bearer
replay, live role downgrade and logout reject. Authority rechecks live session and
role around execution; shared boundary tests include cross-connection revocation.
Tokens bind issuer, audience, action, key, payload, session and unique capability ID.

Actual runtime LOGIN attempts cannot mutate source claims, events, PO coverage or
mapping, nor invoke `commitment_po_check`. Broader boundary tests deny ledger DML,
identity escalation, forged session variables, private function calls, role/schema
escalation, trigger removal and temporary-table/search-path substitution. Deferred
functions pin `pg_catalog`, the exact schema, then `pg_temp`, and revoke public
execution. Private ledger credentials are trusted service authority, not a runtime
credential: compromise of that authority, schema owner or signing key is outside
this boundary's guarantees.

Production conditions remain open: independent private pools/credentials, TLS,
key custody, ACL provisioning and fail-closed startup checks. Existing runtime
identity SELECT exposure remains separate security debt. These tests establish
protected mutation integrity, not database-wide tenant confidentiality or RLS.

## Settlement, cancellation and return-to-PR

Decrease, cancellation and return-to-PR remain blocked. An absent receipt row is
insufficient evidence that a supplier obligation is releasable. Before any future
release or transfer, require an immutable, attributable settlement decision binding
the exact PO revision, PR claim/slice, remaining quantity and canonical unit, proving:

1. Receipts, returns, reversals, in-transit goods and pending receipt transactions
   reconcile to the exact unreceived balance; no unresolved receipt can race release.
2. Supplier acknowledgement and commercial cancellation terms establish the released
   obligation. Invoices, payments, prepayments, liabilities, freight and other financial
   or operational encumbrances are cleared or explicitly settled by authorized evidence.
3. No quantity is in supplier QC, awaiting inspection, rejection disposition, rework,
   replacement or disputed return. QC absence must be proven against authoritative
   records, including pending work, rather than inferred from missing rows.
4. No active downstream reservation, production, packing, delivery or other source
   ownership depends on the quantity; terminal links and outstanding claims reconcile.
5. Supplier settlement, downstream checks and exact compensating coverage/ledger
   transfer serialize with receipts, QC and approval changes, commit atomically with
   audit/idempotency evidence, and remain correct after replay and restore.

The current schema/workflow does not supply this complete proof. No operation was unblocked.

## Recovery and operational reconciliation

Fresh nonempty pg_dump/transactional restore passed: **17 matching table fingerprints,
28 replayed accounts, 84 events, 15 pinned functions**, restored deferred witnesses
and PO checks. Projection balances agree with immutable event replay. Frozen
approval/PR attribution and append-only coverage survive recovery. Synthetic
historical records still produce shadow missing-lineage/reconciliation findings;
none were activated or matched by name/quantity.

Before/after assertions show no unexpected inventory, stocktake, reservation, PR,
production, QC, packing, delivery, custody, installation or completion changes.
Only intended POs, mappings, coverage, authorization receipts and supply audit change.
Failed-operation snapshots include all relevant PO, PR, source, ledger, audit and
retry tables. Backup hashes demonstrate synthetic restore integrity, not a production
disaster recovery exercise or cryptographic tamper-proof storage.

## Verification

| Check | Current result |
|---|---|
| Focused PostgreSQL integration | 37/37; final run 26.62s, including added adversarial checks |
| Full regression suite | 583/583 across 76 files, 100.87s; no failed/skipped tests |
| Typecheck | PASS after correcting test-evidence typing |
| Frontend / PWA / server build | PASS; existing large-chunk warning remains |
| Nonempty backup, restore, replay | PASS as above |

The full suite ran with the initial review additions; final planning-line and role
evidence additions subsequently passed the focused suite. No implementation/schema
changed. Full-suite malformed-JSON stderr is from a passing request-rejection test.
Initial sandbox attempts hit local socket/temp-file restrictions; successful tests
used approved local execution, without assertion changes.

**Packing-label reliability, separately:** D2B2-A previously recorded 582 passes and
one existing 5000ms packing-label timeout, followed by an unchanged isolated 19/19
retry. That earlier failure remains documented; this review's full run passed all
583 tests and did not reproduce it. No timeout or assertion was weakened.

## Recommendation and stopping point

**CONDITIONAL PASS.** Separately authorized, isolated synthetic D2B2-B development
may proceed from this reviewed PO foundation. It must preserve exact PO/PR source
interval identity, reject historical/ambiguous lineage, cap cumulative receipts and
QC ownership under concurrent retries, and define H/F/U transitions without a second
demand commitment. Require explicit supplier-QC ownership, return/reversal semantics,
live authorization, private authority, audit atomicity, rollback, replay, restore and
operational reconciliation tests before accepting that integration. Settlement
release needs the affirmative evidence above; physical receipt and QC acceptance
must not be conflated.

This review stops at D2B2-A-R. No deployment, main merge, force-push, historical
activation, receipt posting, real inventory changes or D2B2-B work occurred.
