# Milestone 13M-D1S — trusted actor boundary assessment

**Verdict: BLOCKED for operational integration. No security remediation is claimed.**

Assessed 2026-10-18 on `feature/kit-builder-milestone-1`, starting at
`5e4139966ebf0d12fe8d6ffc038dc7882d8738d3`. The initial working tree contained
an unrelated modified `AGENTS.md`; it is excluded from this checkpoint.

## Finding and stopping condition

The HIGH administrator-UUID impersonation remains reproducible. The existing
architecture has no database-enforced binding between an authenticated HTTP user
and a SQL caller. This slice stops under the request's explicit BLOCKED provision;
it does not introduce an unverified identity protocol or disable legitimate ledger
operations and call that a fix. This is an assessment checkpoint, not completed D1S
hardening. A secure replacement might be built, but none has been implemented or
proven here.

## Actual identity path

- `AuthService.login` checks stored user/password and active status.
  `authenticateJwt` verifies the JWT and copies subject/organization/role into
  `req.user`. Planning routes validate UUIDs and reload active tenant membership
  and current role; approval uses `req.user.id`, not a request-body actor.
- No HTTP commitment-ledger route exists. `CommitmentLedgerService` accepts plain
  `{ organization, actor }` arguments. Its membership query proves that the named
  person is an administrator, not that the caller is that person.
- `commitment_apply` repeats that membership check against `NEW.actor_id`.
  It authenticates neither SQL login nor JWT. Existing ledger functions are
  invoker functions; D1R pins their search paths but adds no identity binding.
- All server users share `AppDataSource` and its pool, configured by `DATABASE_URL`.
  `scripts/run-migrations.ts` imports that same datasource. There is no separate
  migration credential selection or startup least-privilege enforcement.
- Caller-set session variables, `SET ROLE` from a broadly authorized login, and
  a SECURITY DEFINER wrapper around the same UUID argument cannot authenticate
  the originating application user. Pool resets alone cannot create that trust.

## Observed capability matrix

| Principal / scope | Observed capabilities | Security implication |
| --- | --- | --- |
| `kitbuilder_dev`, isolated test connection | LOGIN; SUPERUSER, CREATEROLE, CREATEDB, BYPASSRLS | Can impersonate and bypass owner-level protections; unsuitable runtime login |
| `commitment_review_<random UUID>`, transaction-local fixture | NOLOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOINHERIT; schema USAGE; SELECT/INSERT/UPDATE/DELETE on schema tables; no schema CREATE or ownership | Supplying an active administrator UUID successfully inserts an event |
| PUBLIC | Ledger migrations contain no EXECUTE revocations | Default PUBLIC function EXECUTE is not narrowed by these migrations; actual deployment ACLs were not certified |
| Configured development connection | Local connection refused with SQLSTATE `3D000`: configured development database absent | Actual server runtime could not be validated; no database was created |

The restricted fixture uses `SET LOCAL ROLE` on a dedicated transaction and rolls
back role creation and synthetic mutations. This is effective-role evidence, not
a separately authenticated restricted LOGIN or an application-runtime acceptance test.
The test SQL connection's actual login and session user were both `kitbuilder_dev`.

## Fresh verification

Focused approval/ledger PostgreSQL file: **36/36 passed**. Crucially, the existing
characterization test asserts that UUID impersonation **succeeds**; a green suite
does not establish remediation. It also rejects projection tampering, event deletion,
schema creation, disabling triggers, creating unauthorized triggers and temporary
balance-table cap bypass; a temporary event table does not redirect the real witness.

Existing cases exercise ledger conservation, claim/source exclusivity, duplicate
events, concurrent capacity, same-key/conflicting retries, event/projection evidence,
immutable records, and actual 40001/40P01 rollback with caller-managed retries.
The synthetic shadow check's 22 operational table fingerprints matched before/after.
Ordinary suite cases use the privileged test login; only the dedicated role case
executes under the restricted role. No automatic retry was added.

Reproduction (PowerShell, repository directory):

```powershell
$env:TEMP = Join-Path (Get-Location) '.test-tmp'
$env:TMP = $env:TEMP
$env:REQUIREMENT_REVIEW_EVIDENCE_PATH = '.local-dev/13md1s-boundary-evidence.json'
node --env-file=.env.kit-builder-development node_modules/vitest/vitest.mjs run src/routes/__tests__/requirementApproval.integration.test.ts --reporter=dot --silent --testTimeout=15000
```

Initial attempts failed before tests: sandbox temporary-cache rename EPERM, then
local network EACCES. Workspace TEMP and approved local PostgreSQL access allowed
the successful run. Ignored evidence records schema
`requirement_test_2efb074cbe1d4e3185cf193ea6c79dac` and the restricted-role outcome.

Not executed after the BLOCKED decision: new adversarial cross-tenant/session/PUBLIC
execution cases, authenticated restricted administrator/read paths, pool identity
isolation, full suite, typecheck, builds, or a fresh nonempty backup/restore drill.
No claim is made that D1R's earlier results are fresh D1S results. No company data,
production infrastructure or credentials were changed.

## Required boundary and deployment prerequisites

These are requirements for a future implementation, not installed grants or a
production-ready SQL recipe:

| Role | Required authority |
| --- | --- |
| Migration login / schema owner | Separate protected credentials; DDL and explicit grant administration; never used by server pools |
| Ordinary application runtime | NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOBYPASSRLS; no owner/migrator membership, schema CREATE or trigger authority; no direct privileged ledger DML |
| Trusted identity service | Independently verify server-authenticated identity and current tenant membership; expose a narrow interface whose caller cannot select arbitrary authority |
| Ledger executor, if needed | Private narrowly granted execution; audited definer ownership and schema-qualified objects; pinned path; no PUBLIC execution; no UUID-only authorization |
| Recovery / backup | Separate controlled access; backup SELECT across required objects; restoration/role installation through maintenance credentials; never reused by runtime |

Before enabling writers, establish how identity reaches the privileged executor
without trusting runtime SQL assertions, and how runtime credentials are prevented
from modifying users, roles, authorization evidence or the identity verifier.
A second owner-credential pool in the same unrestricted runtime is not sufficient
proof. Verify the chosen boundary in this architecture before designing its protocol.

Provision distinct owner/runtime logins through an administrator, generate credentials
outside source control, apply least-privilege grants and explicit PUBLIC EXECUTE
revocations, and validate denied capabilities using the actual runtime LOGIN.
Only then replace development `DATABASE_URL`, move migration tooling to separately
selected credentials, drain existing pools and retire old runtime credentials.
No real credentials were rotated during this assessment.

Startup must fail closed on owner/superuser/BYPASSRLS, role escalation, schema CREATE,
forbidden ledger DML, or excess privileged execution; validate effective inherited
privileges and ownership, not only role flags. Test authenticated administrator and
authorized tenant reads, cross-tenant substitution, session-setting injection,
temporary/search-path attacks and reused pooled connections. Confirm attribution
and whole-transaction retries preserve the authenticated identity.

Backups must retain ledger evidence, pinned paths, triggers and separately managed
role/grant definitions. D1R's schema-only dump with `--no-owner --no-privileges`
cannot certify restoration of the security boundary. Rehearse a populated restore
and repeat adversarial checks with the restored runtime LOGIN before deployment.

## Migration, rollback and remaining risks

No migration, grant or runtime source change was made, so there is no schema rollback
for this checkpoint. Preserve D1R migration `1792540800016` and its populated-ledger
downgrade refusal. A future privilege migration needs explicit grants, owner/runtime
separation, preservation checks and forward recovery; restoring broad runtime DML
would reintroduce this HIGH finding and must not be treated as a safe rollback.

Operational writers remain BLOCKED. No D2, adapters, deployment, main merge,
historical reconciliation or writer cutover is authorized by this report.
