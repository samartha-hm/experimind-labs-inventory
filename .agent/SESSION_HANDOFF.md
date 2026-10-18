# Milestone 13M-D1T — 2026-10-18

Branch: feature/kit-builder-milestone-1.
Implementation checkpoint: c582bacc064bb2593a0465f8364b25b4495f8ddf,
pushed and remote verified. This separate continuity commit follows.

Verdict: PASS for the bounded restricted-runtime-SQL ledger authority boundary.
Operational writer integration remains BLOCKED. No production deployment or rotation.
Read docs/erp/ui-ux/MILESTONE_13M_D1T_TRUSTED_EXECUTION.md.

Separate migration, runtime, identity and private ledger authorities. Auth/RBAC/user/
session writes use IdentityDataSource. TrustedLedgerAuthority verifies signed expiring
administrator tokens and transactions reload/lock current active tenant membership.
Runtime cannot change identity or ledger evidence. Startup rejects privileged,
overgranted, substituted or insufficient credentials and unsafe SQL lookup paths.
Owner-only provisioning applies explicit grants; remote connections verify TLS.

Fresh full suite: 76 files / 583 tests pass; typecheck and frontend/PWA/server builds
pass (existing chunk-size warning). Actual restricted LOGIN adversarial tests deny
UUID impersonation, cross-tenant access, DML/functions, session/temp/search-path forgery,
grants/roles and identity substitution. Real password login, trusted account/entitlement/
event creation, actor attribution, retry and pool isolation pass. Existing unsafe-DML
positive control remains a vulnerability characterization, not remediation PASS.
All 22 operational fingerprints unchanged. Nonempty restore: 22 accounts, 47 events,
eight pinned functions; conservation/immutable evidence/replay pass.

Changed: security boundary, datasource/startup, identity services, owner scripts,
adversarial/recovery tests and deployment report/index. Unrelated AGENTS.md preserved.
Ignored synthetic evidence/logs remain in .local-dev/13md1t-*.

Manual prerequisites: fresh restricted roles, audited database, secret-manager
configuration, CA trust and staging startup/route smoke. Production startup was not
tested. Identity-read confidentiality remains a documented risk.
Next: independent D1T review. No operational adapters, main merge or activation.
Use /new or /compact for the next authorized slice.
