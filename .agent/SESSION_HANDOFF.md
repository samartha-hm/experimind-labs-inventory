# Milestone 13M-D1R independent review — 2026-10-18

Branch: feature/kit-builder-milestone-1.
Review/fix checkpoint: a9218102909165f32aff60f4ad9110d17b7f6a24, pushed;
local and remote hash verified. This separate continuity commit follows.

Verdict: CONDITIONAL PASS for isolated synthetic foundation; operational writers
BLOCKED. Read docs/erp/ui-ux/MILESTONE_13M_D1R_INDEPENDENT_REVIEW.md.

Fixed two demonstrated HIGH defects through forward migration 1792540800016:
discarded ON CONFLICT events previously committed orphan projection changes;
temporary tables previously redirected trigger queries around approved caps.
Deferred per-transition event witnesses and eight pinned function paths protect both.
The applied D1 migration remains unchanged.

Unresolved HIGH: SQL callers with table DML can impersonate a known active
administrator UUID. Membership checks do not authenticate callers. Require trusted
session-derived actor/tenant, restricted writer credentials/interface and production
role separation before integration. Local kitbuilder_dev is a superuser.
No automatic transaction retry; source/provenance and per-claim audit gaps remain.

Verified: focused PostgreSQL 36/36; full 76 files/582 tests with 15000ms timeout;
typecheck; frontend/PWA/server builds. Original 5000ms packing timeout documented.
Migration up/down/up, populated downgrade refusal, concurrency, restricted roles,
40001/40P01 rollback/retry passed. Nonempty restore: seven fingerprints equal,
20 accounts replayed, eight function paths and deferred witness restored.
All 22 operational fingerprints equal; ten shadow-lineage cases unresolved.

Changed: forward migration/registration, regression cases, recovery script,
review report/index; continuity separate. Unrelated unstaged AGENTS.md preserved.
Synthetic evidence/dumps remain ignored; company data untouched.

Stop for user review. No D2, adapters, historical activation, deployment or main merge.
Use /new or /compact for the next authorized slice.
