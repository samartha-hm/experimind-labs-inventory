# Milestone 13M-D1U — independent trusted execution review

Date: 2026-10-18. Branch: `feature/kit-builder-milestone-1`.
Reviewed starting SHA: `0b50166bd1dd47362e63a26d76e70ce6dca3c979`.

## Verdict: BLOCKED

D1T's narrow restricted-runtime-SQL guarantee holds in the tested deployment:
knowing an administrator UUID does not confer ledger write authority. D1U's
stronger revocation, replay and execution-scope requirements do not hold.
**Isolated D2 implementation must not begin under this acceptance gate.** No
production ledger pool, route, operational writer or adapter was introduced.

These findings require a token lifecycle and authorization policy decision.
This review adds reproducible synthetic characterizations, without inventing a
permissive fallback or changing the established application bearer-token contract.
Green test assertions below include successful attack characterizations; they
must never be interpreted as security acceptance.

## Demonstrated identity findings

1. **P1 — Logout does not revoke ledger access authority.**
   `src/services/AuthService.ts:316` revokes only the refresh token;
   `src/security/TrustedLedgerAuthority.ts:23` validates the access JWT without a
   session/revocation lookup. The test performs real password login and refresh,
   revokes the returned refresh token, proves refresh fails, then successfully
   creates a new ledger event using its still-valid access token. An attacker
   holding a captured bearer can continue writing until expiry despite logout.
   Deactivation/demotion still denies writes because the transaction reloads the
   current user. Refresh revocation and user deactivation are different controls.

2. **P1 — No ledger audience or execution-scope binding.**
   `src/security/TrustedLedgerAuthority.ts:23-29` does not require issuer,
   audience, ledger purpose, account or operation scope. A trusted-issuer fixture
   signed with `aud=unrelated-service`, `scope=read:profile`, another account ID
   and `operation=read` nevertheless creates an open event on the target account.
   This proves missing verifier constraints, not that a SQL attacker can sign.
   Ordinary AuthService access tokens contain no dedicated ledger capability.
   Explicit password-reset/MFA-purpose tokens are rejected; absence of purpose
   does not establish an affirmative ledger execution scope.

3. **P1 against D1U replay acceptance — Bearers authorize distinct new writes.**
   Reusing one valid access token with two fresh event keys creates two immutable
   events. Repeating an identical request/key returns the original event safely;
   this idempotency property does not enforce token single-use or bind a token to
   one action. Existing reusable bearer semantics explain this behavior, but do
   not satisfy D1U's requested replay/execution-scope protection.

Neither captured-token scenario is a reproduced UUID-only or signature-forgery
attack with runtime SQL credentials alone. SQL compromise plus bearer theft,
privileged credential theft and server process compromise are separate threats.

## Actual restricted roles and adversarial evidence

Focused synthetic run used three distinct LOGIN/session identities:
`rt_154bbc4abaf4aaa9`, `id_154bbc4abaf4aaa9`, `lg_154bbc4abaf4aaa9`.
They were randomly provisioned and removed with DROP OWNED / DROP ROLE after
verification. All are NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOINHERIT/
NOREPLICATION/NOBYPASSRLS, without memberships or persistent object ownership.

| Capability | Runtime LOGIN | Identity LOGIN | Ledger LOGIN |
|---|---|---|---|
| Schema | USAGE, no CREATE | USAGE, no CREATE | USAGE, no CREATE |
| Ordinary operational tables | CRUD | None except audit SELECT/INSERT | Dependency reads only |
| users/roles/refresh_tokens/sessions | SELECT; users.updated_at UPDATE | CRUD | users SELECT + updated_at UPDATE |
| Seven commitment tables | SELECT | None | SELECT/INSERT/UPDATE, guarded |
| Ledger functions | No EXECUTE | No EXECUTE | EXECUTE, SECURITY INVOKER |
| DDL, ownership, role escalation | Denied | Rejected by startup validator if granted | Same |

The complete dependency/function/sequence matrix and owner provisioning procedure
remain in [D1T](MILESTONE_13M_D1T_TRUSTED_EXECUTION.md#exact-rolegrant-matrix).
The migration/schema owner is a separate offline authority, never a service login.

Runtime attacks denied: known administrator and foreign-tenant UUIDs; INSERT,
UPDATE, DELETE and TRUNCATE on all seven ledger tables; direct ledger function
invocation; role/password/tenant replacement; forged session variables; hostile
search_path and temporary users/events; schema creation; role/grant escalation;
trigger removal. All eight ledger functions deny runtime EXECUTE. Added tests
also deny pg_authid and pg_read_file access and modifications of real JWT subject,
tenant or signature. Wrong-key, expired, future, missing-expiry, staff,
cross-tenant and explicit challenge/reset-purpose tokens fail. Current demoted or
inactive administrators fail, including retries. SQL cannot mint the server JWT.

Legitimate password login through the identity LOGIN and test-only HTTP ledger
execution through the ledger LOGIN succeed, with correct actor attribution,
account/entitlement creation and identical retry. Separate max-one-connection
pools retain forged runtime session state only in runtime; the writer has none.
Rejected requests after legitimate execution gain no retained actor authority.

## Privilege, startup and process assumptions

Normal HTTP startup initializes only restricted runtime and identity pools and
validates both before listening. Missing identity URL, owner credentials, identity
credential substitution and an extra password-column UPDATE grant fail closed.
Migration URL is explicitly required by the owner job. PUBLIC schema/table/
sequence/function grants are revoked; future owner functions lose default PUBLIC
EXECUTE. Invoker ledger functions have pinned pg_catalog/schema/pg_temp paths.
No production use of TrustedLedgerAuthority or alternate ledger service path was
found outside the security class and test fixtures. Raw internal service methods
remain trusted implementation APIs, not an authentication boundary by themselves.

Signing keys and private pool passwords depend on secure server/operator process
ownership. Runtime SQL does not receive them. Identity and writer credentials in
that process remain privileged: SQL separation does not protect against arbitrary
server code execution. Owner-backed access bridges and historical cross-schema
ACLs require a dedicated audited database and fresh roles, as D1T documents.

Identity data is **not confidential from runtime**: existing SELECT includes
password hashes and MFA material. This exposure remains a separate credential-
theft/offline-attack risk, not a claim that private identity tables are inaccessible.
Identity SQL logging is disabled; new tests/reports retain no raw tokens or keys.
Production auth intentionally returns access tokens to authenticated clients.
Existing development forgot-password responses expose devResetToken, and generic
auth accepts query-string tokens: production mode and access-log/URL redaction
are prerequisites. This review cannot certify external proxy or platform logs.

## Ledger, recovery and verification

Focused PostgreSQL suite: **37/37 pass**. A/F/H/U conservation, unique source
claims, event/projection atomicity, immutable witness, duplicate rejection,
idempotent retry, approval/packing guards and 22 operational fingerprints remain
effective. Four intentional synthetic finding events alter only ledger evidence.
The old unsafe-DML positive control remains rolled back and is never a PASS.
Its fixture now explicitly grants function execution instead of depending on
PUBLIC defaults changed by prior provisioning runs. No runtime ACL was relaxed.

Nonempty isolated backup/restore: **22 accounts, 51 events, eight pinned functions**;
all seven table counts/hashes match, deferred immutable witness is restored, and
independent account replay matches every projection. Restore deliberately omits
ACLs; post-restore restricted-role reprovisioning is a separate operator step.
Evidence/logs are ignored `.local-dev/13md1u-*`, using only localhost:55432's
experimind_kitbuilder_test synthetic schemas. No company data, credentials or
operational records were changed.

Typecheck and frontend/PWA/server builds pass (existing chunk-size warning).
The full suite is **not green: 582 pass, one fails, 76 files**. The existing
packing-label print/reprint test exceeds its unchanged five-second timeout in
three full-suite runs, including one without concurrent builds and one with two
workers. Its complete packing integration file passes **19/19** in isolation.
This timing-dependent failure remains unresolved; no timeout was relaxed and no
unrelated packing implementation was changed. Full-suite acceptance is therefore
also blocked. Logs retain each outcome, rather than substituting the isolated
pass for a full-suite PASS.

## Required next decision and staging prerequisites

Before D2, approve a scoped execution contract: an authenticated server issues
short-lived ledger capabilities with mandatory issuer/audience/purpose, tenant,
actor, account, operation and canonical request binding; a protected session or
authorization epoch supports revocation; atomic nonce consumption and durable
idempotent outcomes prevent a replay from authorizing a different/new operation.
Verification and nonce/revocation state must stay outside runtime SQL write
authority. Define logout/password-reset/role-change behavior and key rotation
before implementing and independently retesting this design. No such architecture
or policy change is silently implemented by this review.

Staging still requires fresh separated roles, owner-only migration/provisioning,
secret-manager configuration, audited PUBLIC/cross-schema ACLs, verified TLS/CA,
production NODE_ENV, restricted full-server startup and route smoke, token/log
redaction, and a restore with grants reapplied and every LOGIN revalidated.
Credential rotation and stop/drain/restore rollback follow D1T; never recover by
restoring runtime ledger/identity DML. No deployment or real rotation occurred.

GitHub review checkpoint and final continuity SHA are recorded in SESSION_HANDOFF
and the final review response after push/remote verification; this report's base
SHA above identifies the implementation independently reviewed.
