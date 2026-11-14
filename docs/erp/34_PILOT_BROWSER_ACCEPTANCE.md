# Controlled local pilot — browser acceptance script

Status: browser acceptance executed 2026-10-15 in local Edge through Playwright.
See [38_BROWSER_ACCEPTANCE_RESULTS.md](38_BROWSER_ACCEPTANCE_RESULTS.md) for results,
fixes, evidence and limitations. Physical printing and printed QR scans remain pending.

## Preparation and evidence

The manual preparation and acceptance matrix remain available for operator reruns.
Run these commands in PowerShell from the existing checkout (not a fresh install):

```powershell
Set-Location 'D:\Experimindlabs\ERP\erp-development'
$pgBin = 'D:\Experimindlabs\ERP\erp-development\.local-dev\tools\node_modules\@embedded-postgres\windows-x64\native\bin'
$pgData = 'D:\Experimindlabs\ERP\erp-development\.local-dev\postgres-data'
& "$pgBin\pg_ctl.exe" -D $pgData status
# Only if status says the server is stopped:
& "$pgBin\pg_ctl.exe" -D $pgData -l 'D:\Experimindlabs\ERP\erp-development\.local-dev\postgres.log' -w start
npm run dev:kit-builder
```

Exact URL: **http://127.0.0.1:3100/**. PostgreSQL is loopback **55432**, database
`experimind_kitbuilder_development`. Backend and Vite frontend run in the same
process; no separate frontend command is needed. Leave this terminal open; stop
the application with Ctrl+C before recovery. Do not rerun `setup:kit-builder`,
`db:migrate`, seeds or cleanup commands against the populated database.

Four accounts were added without changing existing identities or business data:

| Email | Role / tenant | Use |
| --- | --- | --- |
| pilot-admin@kitbuilder.test | admin / Kit Builder Development | approvals and reopening |
| pilot-staff@kitbuilder.test | staff / Kit Builder Development | assign explicitly to packing/installation records before staff scenarios |
| pilot-viewer@kitbuilder.test | viewer / Kit Builder Development | read and forbidden writes |
| pilot-other-admin@kitbuilder.test | admin / Kit Builder Other Tenant | cross-tenant denial |

Read passwords locally in
`D:\Experimindlabs\ERP\erp-development\.local-dev\pilot-accounts.json`; keep this
file private. For a future acceptance setup **only when these identities do not
exist**, run `node --env-file=.env.kit-builder-development scripts/prepare-pilot-accounts.mjs`.
It guards host/port/database and synthetic organization names, refuses existing
pilot identities and never resets users or stock. Do not use public registration
to create administrators.

Open a normal Edge/Chrome/Firefox window, enter **Email Address** and **Password**,
then click **Sign In**. Use separate browser profiles for the four users. Record
the role/tenant for each profile. Start with A01 and proceed in matrix order;
stop dependent scenarios when prerequisites fail. Use a unique `Pilot-11B-<date>`
prefix for records, never company names or real attachments. Navigate using the
section named in each row, select/create the synthetic record, perform the listed
actions, navigate away, reload, and reopen it. Compare the visible outcome to the
row before marking PASS. Capture approval, rejection and stale-revision errors,
not just the final happy path. Record the exact displayed button names when they
differ from the matrix; a missing control is a failure, not an inferred pass.

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

For files, open a synthetic project, scroll to **Private project files**, select
`project` under **Attachment record type**, choose a small synthetic TXT/PNG using
**Private file**, then click **Upload private file**. Reload and use
**Authenticated download**; compare bytes/name with the original. Repeat for
survey/installation/delivery with the required school/record. In the other-tenant
profile the source project/file must be inaccessible. Do not paste tokens into a
URL. A viewer must have no upload capability. Record forbidden extension and
over-10-MiB rejection independently. In label settings save a synthetic layout,
reload in a second authorized profile and confirm shared revision/preview.

Report each scenario as `ID | PASS/FAIL/NOT RUN | role/tenant | steps | expected |
observed | reload outcome | screenshot filename`. Attach redacted page screenshots
and this table to the chat, or give the absolute local evidence path. Include
browser/version, `git rev-parse HEAD`, date/time and visible error text. Never
attach credential files, cookies, tokens, HARs or database dumps. Physical print:
record paper/printer, measured dimensions, readability and scanned package ID;
PDF preview alone cannot pass physical print acceptance.

## Acceptance gate

All rows need independent recorded results. Do not mark unexecuted rows PASS.
Browser acceptance and physical print acceptance remain pending until actually
performed. No deployment or company pilot is authorized by this script.
