# Milestone 13M-D1W — 2026-10-18

Branch: feature/kit-builder-milestone-1.
Review checkpoint: 626208af180bba52b5f948724fb8ea8dac8fffbe,
pushed and full remote HEAD verified. This separate continuity commit follows.

Verdict: CONDITIONAL PASS. Independent source review and additional restricted
LOGIN attacks found no new reproducible token defect. D1U's three findings are
closed within the runtime-SQL/captured-token threat model. Trusted signing key,
identity/writer credentials and process compromise are excluded.

Read docs/erp/ui-ux/MILESTONE_13M_D1W_INDEPENDENT_REVIEW.md and its fingerprints.
Changes: independent connection, quantity/source/kind/alternate-entry attacks,
canonical retry and logout-first blocking barrier; D1W recovery runner support.
No production authorization changes. Execution-first and expiry barriers pass;
committed history stays immutable after logout.

Verification: focused 37/37; full two-worker 583/583 (76 files); typecheck and
frontend/PWA/server builds PASS. Default full run 582/583: unchanged packing label
5000ms timeout. Packing overlapping build 18/19; idle-isolated 19/19. Resource
contention supported; default reliability unresolved. No timeouts changed.
Backup/restore and disposable restart PASS: eight table fingerprints, 22 accounts,
51 events, eight pinned functions; synthetic operational hashes equal.

Next: user acceptance before isolated D2 development. Staging roles/ACLs/TLS/secrets/
startup smoke, identity SELECT exposure and packing reliability remain open.
No deployment, operational integration, credential rotation, historical activation,
company-data changes or main merge. Unrelated AGENTS.md remains uncommitted.
Use /new or /compact before D2.
