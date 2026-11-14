# Milestone 13B — acceptance and evidence

2026-10-15. **PASS: bounded interactive prototype. BLOCKED: database integration
regression and authenticated ERP smoke.** No staff interviews, staff usability
tests or physical device acceptance occurred.

## Executed checks

| Area | Actual result |
| --- | --- |
| Kit semantics | Missing mapping blocks review; approved view remains independent; explicit complete Science count validated by existing calculator; Mathematics independent; shared reference adds no demand |
| Draft recovery | Compare drawer, cancel/confirm discard, conflict retains draft and blocks editing/review; dismissal restores editing |
| Packing/QC | Unknown package hides sample; all three checks required; operator cannot decide QC; reviewer rejection requires reason; rejected/approved states lock checks; rework resets checklist |
| Shell | Workspace links, Ctrl+K filtering/navigation, tablet drawer, keyboard focus containment, Escape restoration and destination-heading focus exercised |
| Showcase | Invalid input exposes aria-invalid and alert; named loading status; empty/error/conflict and retry/resolve exercised; light/dark toggle |
| Responsive | Desktop 1440×1000 and tablet 768×1024; Kit tablet reflow and Packing floor controls; 375px and 3840px overflow spot checks, not full device acceptance |
| Existing ERP | Original sign-in renders; registration/sign-in view toggle works without submission. Authenticated operational navigation unverified: backend/PostgreSQL unavailable |

Browser automation used the in-app Browser accessibility API, semantic locators
and read-only DOM measurements. This is executed scripted acceptance, not a
committed cross-browser end-to-end suite. Focus loops and Escape were exercised
on drawers; all workflows were synthetic. Source review confirms reduced-motion
handling; OS preference emulation and screen-reader output were not tested.
Touch targets measured 56px for principal floor actions and approximately
72–79px for checklist labels. Physical touch, scanner performance, 200%/400% zoom,
color-vision testing and a complete WCAG audit remain pending. Small metadata
and disabled-state legibility need real-device review.

## Automated verification

| Check | Result |
| --- | --- |
| Focused fixture tests | 7 passed: explicit sets, invalid inputs, Mathematics independence, shared ownership and immutable fixtures |
| Repository Vitest run without DB environment | 399 passed, 84 skipped; 60 files passed, 6 skipped |
| DB-enabled run | 6 integration suites failed in beforeAll after 30s connection timeouts; 399 passed, 84 skipped. No listener on isolated PostgreSQL port 55432; this is not a passing backend regression |
| TypeScript | `npm run typecheck` passed |
| Production build | `npm run build` passed; existing large-chunk warning retained; preview not listed as a production chunk |
| Scope | No API/schema/migration/calculator/ledger/permissions changes; no operational entry or deployment |

The database failure was retained rather than hidden by changing test gates,
running setup/migrations or switching to company data. Historical Milestone 12
results do not substitute for current backend verification.

## Local visual evidence

Screenshots and command logs are intentionally ignored under
`.local-dev/ux-13b/`, not pushed as generated/private evidence. Open locally:

| File | Contents |
| --- | --- |
| `work-desktop.jpg` | My work shell and synthetic tasks |
| `kit-desktop.jpg` | Kit Studio desktop, separate educational/physical views |
| `kit-tablet.jpg` | Tablet reflow, physical packing and readiness |
| `packing-tablet.jpg` | Focused checklist and role-gated sample QC |
| `foundations-dark-desktop.jpg` | Dark foundation showcase and controls |
| `test-output.txt`, `test-db-output.txt`, `build-output.txt` | Current command results, including DB failure |

Images were visually inspected; they are real browser captures, not design
mockups. Local screenshots are not portable evidence for a fresh clone; the
development routes above reproduce the review surfaces. Screenshot hashes are
recorded separately in `evidence-sha256.txt` beside the ignored images.

## Remaining gates

User design approval and named staff/device testing precede wider adoption.
The proposed 13C plan is in [the implementation note](MILESTONE_13B.md).
Physical print/scan, development app-role privileges, stale recovery-admin
credentials, backup custody, named pilot approval and historical/current DB
continuity remain unresolved from Milestone 12. No merge, rollout or deployment
is authorized.
