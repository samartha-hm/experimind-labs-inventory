# Controlled local pilot — browser acceptance script

Status: NOT RUN. HTTP coverage is not visual acceptance. Browser runtime investigation
2026-10-14: agent module resolution fails with EPERM; an independent Node process
can read the module. No Playwright dependency is installed. Investigation stopped
after these two checks; the following manual path is the repeatable fallback.

## Preparation and evidence

Run the existing isolated development command `npm run dev:kit-builder`; use its
printed localhost URL. Verify database configuration is the isolated development
database before starting. Use synthetic tenant accounts: admin, assigned staff,
viewer and an admin in another tenant. Never seed company data. Sign in manually;
do not put credentials or tokens into scripts, screenshots or reports.

Keep evidence outside Git in `.local-dev/browser-acceptance/<run-date>/`.
Record browser/version, application commit, synthetic tenant, scenario ID,
PASS/FAIL/NOT RUN, expected/observed outcome and screenshot filename. Capture
the page only after login; redact personal details. Do not export network HAR,
storage or authentication headers. On failure, record visible error, action,
reload outcome and a screenshot; do not continue a failed prerequisite.

## Sequential scenarios

For every saved record below, navigate away, reload, reopen and check its fields
and revision. A success toast alone does not demonstrate persistence.

| ID | Browser actions | Required visible outcome |
| --- | --- | --- |
| A01 | Sign in as admin; visit each application section and return | Navigation works, active section and errors are visible |
| A02 | Product Library: create synthetic equipment/materials; edit and save | Names, units and descriptions survive reload; invalid input reports an error |
| A03 | Kit Builder: create an empty draft, compose activities and packing, save/review/publish | Approved version remains immutable; revise creates a draft without altering the earlier version |
| A04 | Projects: create two synthetic schools/sites with distinct destinations | Both sites and addresses survive reload; site changes do not modify masters |
| A05 | Requirements: A has two Science sets for each grade 8/9/10 and explicit two complete sets; B has three Grade 8 Science sets and zero complete sets | A preview has six common/two universal crates; B three common/zero universal; missing confirmation reports a blocking error |
| A06 | Stocktake synthetic items: count, review, approve, post | Unverified stock stays unavailable before posting; posted quantities survive reload and duplicate posting does not alter balances |
| A07 | Reserve requirements, retry same action and open another tab with stale revision | Reservations persist; retry is safe; stale conflict is visible and refresh recovers |
| A08 | Procurement: create/review/approve synthetic shortage order; receive and QC | Pending/rejected goods are unavailable; accepted receipt posts once and survives reload |
| A09 | Production: approved recipe, input reservation/issue, partial output and rejection/correction/QC | Input issue and accepted output occur once; rejected output adds no stock |
| A10 | Packing: assign staff, partial checklist, shortage exception/correction; reject then reinspect | Incomplete/rejected package cannot become Ready; authorized completed QC can; pouch/box/partition/crate traceability persists |
| A11 | Labels: preview, download and reprint each package kind; scan QR signed in and signed out | Same physical IDs and contents on reprint; authenticated lookup only; no stock/revision change; inspect actual print dimensions separately |
| A12 | Delivery: two batches for A, one for B; partial POD, failure/return/correction/retry and final acknowledgement | Received packages retain school custody; remaining packages enter quarantine/transit; immutable manifest and history persist |
| A13 | Installation: assigned checklist, survey/note, issue/correction, submit and admin acceptance | Staff cannot accept; unresolved issues block submission/acceptance; accepted job requires audited reopening before edits |
| A14 | Closure: attempt while blocked, resolve blockers, customer acceptance; reopen with reason | Blockers visible; only authorized closure succeeds; closed project rejects edits; reopening retains acceptance history |
| A15 | Repeat write/approve controls as viewer, unassigned staff and other tenant using owned test URLs | Viewer writes denied, staff approvals denied, other-tenant details unavailable; no sensitive details in errors |
| A16 | Expire/sign out session during a form action, then sign in and reload | Sign-in error is visible; no false success; saved state is recoverable without duplicate stock operations |

If attachment storage/shared label layouts are installed, add upload/download on
each supported record and confirm shared layouts from a second browser profile.
Attempt forbidden extension, oversized file and other-tenant download; require
clear denial. Confirm reprinting still changes neither identities nor stock.

## Acceptance gate

All rows need independent recorded results. Do not mark unexecuted rows PASS.
Browser acceptance and physical print acceptance remain pending until actually
performed. No deployment or company pilot is authorized by this script.
