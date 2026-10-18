# Milestone 13M-D1V — token lifecycle and execution contract

2026-10-18. Isolated foundation only. No production issuer route, operational
writer adapter, D2 activation or deployment is introduced.

## Authority and scope matrix

| Input / gate | Required value / behavior |
| --- | --- |
| API JWT at issuance | HS256; exact issuer `experimind-auth`; exact string audience `experimind-api` |
| Execution JWT | HS256; exact issuer `experimind-ledger`; exact string audience `experimind-ledger-execution` |
| Identity | UUID subject and nonzero tenant, active current tenant administrator; `admin` / `super_admin` match existing administrator permission bypass |
| Session | `sid` = SHA256 of refresh token; current unrevoked, unexpired refresh row for subject; any matching revoked/expired session row denies |
| Time / purpose | Integer issued-at/expiry, positive lifetime, no future issued-at; execution lifetime <=60 seconds and bounded by access expiry; no alternate type/purpose; normal JWT nbf validation |
| Execution scope | Exact `ledger:mutate`, action, operation key, random UUID jti and SHA256 request fingerprint |
| Account creation | Entire input: tenant via claims, project, site, obligation, dimension, item, unit, selector |
| Entitlement | Account, approval, revision, cap, provenance |
| Event | Account, entitlement, reason, operation kind and entire payload, including quantities/source lineage |

Fingerprinting snapshots JSON before asynchronous work and canonicalizes object
key order. Array order and string values remain significant (`"1"` differs from
`"1.0"`). Downstream ledger validation, ownership, approval and conservation
checks still apply. A general API bearer never executes ledger mutations.

## Session lifecycle and revocation

Login, registration and MFA completion bind access JWTs to their refresh record.
Refresh atomically revokes the old record and issues a new pair: old capabilities
lose authority. Legacy access tokens without a session binding fail issuance.
Logout durably revokes the refresh row. If persistence fails, the endpoint returns
503 and preserves the cookie so the client can retry. Session revocation also
revokes corresponding refresh records; revoke-other-sessions does the same.

Issuer and executor check current user/session state. Execution acquires the user
row FOR SHARE; logout/refresh/session revocation acquire FOR UPDATE first. If
revocation wins, execution fails. If execution wins, that transaction may commit
before logout returns; all later uses fail. Revocation does not undo committed
history. Database clock expiry is checked before and after ledger work, including
after a queued advisory lock; expiry during queued work rolls back everything.
There remains a normal transaction boundary between the final clock check and
commit. This contract does not promise cancellation of an already committing write.

## Replay and recovery

`commitment_authorizations` is an eighth additive ledger table. Immutable receipts
contain jti, tenant, actor, operation key, fingerprint and JSON result. A unique
tenant/actor/key constraint and transaction advisory lock serialize concurrent
attempts. Ledger events, projections and receipt commit in one transaction.

Same capability + same key + same fingerprint returns the stored result and writes
nothing. Changed key/resource/action/payload fails. A new capability with an already
used key fails closed, even for the same payload. Expired/revoked authorization
cannot retrieve a committed retry through this mutation executor. After expiry,
recover by authorized read-only inspection of existing events/receipts; no automatic
reauthentication adapter or key replacement is provided. Never retry with a fresh
operation key to recover an uncertain write.

## Privileges and deployment prerequisites

Migration/owner credentials remain separate from three restricted LOGINs:
runtime (read-only ledger), identity (identity writes, no ledger authority), ledger
(bounded ledger authority and identity/session SELECT). Startup asserts actual
LOGIN/session identity, non-owner roles and exact privileges. Runtime SQL cannot
mint capabilities, read signing keys, forge actor settings, escalate role or call
ledger mutation functions. Private JavaScript fields hold the writer pool and key.

Before any later deployment: owner applies the additive migration; provision fresh
restricted roles, run boundary configuration and startup assertions, audit grants
and pinned search paths, configure protected server keys and authenticated TLS,
then smoke-test restricted routes and restored grants. Never use migration/owner
credentials for runtime startup. This milestone does not enable the production
writer pool. Existing HS256 key custody/server code is trusted; server/key
compromise is outside the restricted-SQL threat model. Existing runtime identity
SELECT exposure of password hashes/MFA data remains a separate D1U risk.

Nonempty downgrade refuses to drop receipts. Prefer forward repair; restore all
eight tables, identity/session state, indexes/triggers/functions and restricted
grants together. Recovery scripts exercise nonempty restore and a separate real
PostgreSQL restart. The restart script uses a synthetic loopback disposable cluster
on port 55439, never restarts the shared development cluster, and stops its clone.

Independent security review is required before any D2 proposal or integration.
