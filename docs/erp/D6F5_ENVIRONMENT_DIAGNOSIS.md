# D6-F5 environment diagnosis — 2026-10-31

**Browser readiness BLOCKED; D6 software BLOCKED; pilot NO-GO.** Synthetic environment only. Starting local and remote branch `feature/kit-builder-milestone-1` both verified as `36bc6ae55163929c12d9e8fee00cb80f84c0fccd`.

## Browser diagnosis and support escalation

Installed browser skill/plugin `26.1027.30824` followed without modification. Runtime initialization and supported `bootstrap-troubleshooting` retrieval succeeded. One inventory lookup returned `ChatGPT in-app browser`, type `iab`, ID `2`, and `Codex MCP Apps`, type `mcpapps`, ID `1`.

A single isolated explicit `agent.browsers.get("iab")` attempt, followed in code by a selection-complete marker and required documentation emission, timed out at a 10,000 ms budget (10.1 seconds outer tool wall time). Tool returned `js execution timed out; kernel reset, rerun your request`. The selection-complete marker never appeared. No browser handle, documentation, tab or application navigation was reached. No retries after the reset, alternate controller, session-store inspection or internal configuration edits were performed.

The failure is localized to the supported browser-selection/control boundary, before ERP access. Discovery proves inventory availability, not a working control channel. Exact internal cause, stale-session involvement, renderer/transport condition and resource contention remain **unresolved**; the evidence does not establish an ERP defect or explain intermittent behavior. Process inventory alone cannot establish contention. Desktop engine/version was not exposed by these checks (process FileVersion values were null).

Actionable support case: on Windows desktop, with the listed plugin and this chat's in-app backend discoverable, supported explicit selection hangs until execution timeout/reset. Reproduction: initialize the installed runtime; retrieve bootstrap troubleshooting; list once; select `iab` with a selection-complete marker before documentation. Expected: usable browser handle; actual: timeout before marker. Ask support to inspect browser-service selection/handshake diagnostics and prescribe supported reconnection steps. No service restart fix is claimed. Do not attach credentials, account files, environment files, database dumps or browser profiles. The official [Browser documentation](https://learn.chatgpt.com/docs/browser.md) confirms the desktop built-in surface but does not resolve this selector timeout. No undocumented recovery procedure was inferred.

## Current independent verification

Checks required outside-sandbox execution after SQL `EACCES`, CIM access denial and GitHub DNS failure; authorized reruns succeeded. These restrictions are distinct from the browser timeout.

| Check | Result |
| --- | --- |
| ERP and PostgreSQL listeners | Only `127.0.0.1:3104` (PID 2132), `127.0.0.1:55432` (PID 23044) for the checked ports |
| Database/schema | `experimind_kitbuilder_test`; `requirement_test_65e4d0314cc341f7b81dae97c9e936df` |
| Preserved accounting/audit | All 111 table fingerprints match D6-F3; SHA-256 `c6ffdc72010b6f61e9038db5fb02d65e5cb7c5ca0798298ed331dc289875a743` |
| Source identity, credentials, guards | Match D6-F3; users/sessions/refresh tokens excluded from table aggregate, credentials compared separately |
| Restricted roles | All three present; superuser, createdb, createrole, inherit, replication and bypassrls flags false |
| Closure | Residual-hold predicate still blocked |
| Existing synthetic user | Active admin `514e643b-023b-41ff-b942-7e63fcbeff66`, tenant `922a1026-f552-4349-a8a0-cbf3fd3a9e1a`; database identity only, no authenticated session claim |
| HTTP health/readiness | 200 / 200; 131 / 137 ms |
| Login route | 200, 23 ms, HTML 1881 bytes; browser rendering unverified |
| Empty login request | 400, 13 ms, `Email and password are required`; no credentials submitted |

Private verification records host timestamp `2026-10-30T18:37:39.035Z`; this report uses client-provided date 2026-10-31. No clock repair or timestamp normalization was performed.

Retained allocation `803da359-66f8-4cdf-b618-b89ee3d6cc06` verified directly: plan `198545ea-8816-4921-af67-5cd7361b1fd2`, package `b5aecf4a-72f2-4f57-9b4d-097962c40300`, output `8f705559-cad5-48fe-a191-0064f6c5b94a`, quantity `0.1000`, operation key `9736c55f-6490-4bee-a334-6f52953443ca`. Output remains `pending_qc`, quantity `0.6000 m`. The old diagnostic helper's unrelated historical authorization-key lookup returned no row; it was not replayed or treated as proof of a current defect.

Private test configuration binds loopback and enables the three trusted UI flags; bundled-server `NODE_ENV=production` describes execution mode, not a production database. UI source requires literal `true`, so absent flags remain off. No production configuration changed; deployed production flag values were not inspected. Existing app/PG log tails showed prior startup/request activity; current HTTP/SQL results establish present health.

## Execution boundary and verification scope

No genuine environment fault requiring repair was established. No code, credentials, fixtures, transactions, services or database configuration changed. No restart, restore, migration, allocation replay or business transition occurred. Current fingerprints establish conservation, not a newly executed restart/recovery test.

All ten authenticated readiness steps remain incomplete after selection. Login, tenant/role confirmation in browser, two authenticated screens, session persistence and screenshots were **NOT REACHED**. Six-check QC, incomplete/rejected denials, QR/PDF, dispatch/custody, partial acknowledgment, installation, duplicate retries, role/tenant restrictions, closure dashboard/denial and D6 reconciliation were **NOT EXERCISED**. Zero browser-tested transactions and zero new immutable mutation receipts. Empty login validation is an HTTP check, not browser acceptance or a business denial.

Fresh checks: SQL conservation/roles/guards/source identity, HTTP endpoints, loopback listeners, Git remote SHA and documentation validation. Regression suite, typecheck, frontend/PWA/server builds and dedicated recovery harnesses were not rerun: no application change; user-directed environment-only verification scope applies. Prior 645-pass/two-skip results remain historical.

Remaining independent blockers: supported browser-service connection, unexecuted downstream acceptance, O1–O10 DRAFT / NOT AUTHORIZED and genuine historical migration provenance. Historical packing denial remains INCONCLUSIVE. Physical stock UNKNOWN. No ownership/hold settlement, real stock movement, operational pilot, deployment or main merge. **D6 BLOCKED; pilot NO-GO.**
