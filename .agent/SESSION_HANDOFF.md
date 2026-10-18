# Milestone 13M-D1U — 2026-10-18

Branch: feature/kit-builder-milestone-1.
Review checkpoint: 1329b0ff9070a6eb3cd592941014b6d428ce739d,
pushed and GitHub HEAD verified. This separate continuity commit follows.
Reviewed D1T base: 0b50166bd1dd47362e63a26d76e70ce6dca3c979.

Verdict: BLOCKED. No isolated D2 development or operational writer integration.
Read docs/erp/ui-ux/MILESTONE_13M_D1U_INDEPENDENT_REVIEW.md.

Restricted-runtime-SQL impersonation remains denied under three actual LOGINs.
Known UUIDs, forged tokens/settings/temp objects, DML/functions/escalation and
pool leakage fail. Legitimate authenticated execution and current-user checks pass.
New findings: revoked-refresh/logout access JWT still writes; unrelated audience,
read-only scope/account/operation claims are ignored; reusable bearers create new
events with fresh keys. These require an approved scoped capability/revocation/
replay contract, not an unreviewed change to existing bearer semantics.

Focused PostgreSQL: 37/37 pass, including explicit successful-attack findings.
Recovery: 22 accounts/51 events/eight functions; immutable replay/conservation and
22 operational fingerprints pass. Typecheck and frontend/PWA/server builds pass.
Full suite: 582 pass/one packing-label timeout across three runs; packing alone
passes 19/19. Full-suite acceptance remains blocked; timeouts unchanged.

Changed: adversarial tests, unsafe positive-control fixture, recovery milestone
selector, review report/index. No runtime/migration/grant changes. Unrelated
AGENTS.md remains uncommitted. Ignored evidence: .local-dev/13md1u-*.

Runtime identity SELECT still exposes hashes/MFA material. Staging needs fresh
roles, audited ACLs, secrets/CA, restricted startup/route smoke and restore grants.
No deployment, company-data change, credential rotation or adapter occurred.
Next: approve the bounded token lifecycle contract, then authorize remediation.
Use /new or /compact for the next slice.
