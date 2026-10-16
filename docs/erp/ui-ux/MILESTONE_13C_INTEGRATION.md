# Proposed next slice — read-only Kit Studio

Proposal only. No operational route, feature flag, API, schema or permissions
were changed by 13C. User design approval is required before implementation.

## Boundary and rollback

Add one optional read-only detail surface in Product Library for an existing
template, behind a default-off server feature flag and organization allowlist.
Keep the current detail surface available and make switching back immediate.
Disabling the flag restores the current surface without migrations or data
conversion. Do not introduce Packing/QC writes, approval, draft editing, archive,
allocation, inventory posting or implicit persistence in this slice. Omit their
action controls from the read-only surface rather than simulating successful work.

## Data and permissions

Use the existing `/api/v1/product-templates/:id` and `/:id/revisions` reads,
not the older `/api/v1/kit/:id/bom` route. The product-template router requires a
Bearer session, explicit organization, active user and current database role;
it scopes service reads to the authenticated organization. Reuse that authority.
The browser must not supply trusted tenant/role values. Permit only the existing
reader roles; allowlisting never grants permission. Check the flag server-side
before returning any extra data, and clear cached details on account/tenant exit.
Cache keys include organization, template and revision; abort stale requests.

Render explicit revision identities, approved snapshots and original approval
actor/time from existing history. Never substitute a current draft for missing
historical content. Show absent history as unavailable. Normalize educational
structure, physical references and BOM owners without duplicating owner lines.
Use authoritative quantities only. If computed previews are needed, separately
review the existing read-only POST `/:id/preview` contract; never infer that every
POST is safe or send an approval/write request from this surface.

## Loading and errors

Use a labelled busy region/skeleton, no stale actionable controls. On 401 clear
details and request sign-in; on 403 hide details and explain missing access;
404 covers absent or other-tenant identities without disclosing which. Handle
400 validation, 500 and offline states with explicit retry, preserving the last
revision label only where safe. Existing errors use `{ error: string }`; do not
invent structured codes without backend work. Bound network timeouts and prevent
late responses from restoring another tenant's data. Distinguish empty activity,
missing mapping, missing owner and unavailable history states.

## Concurrency and regression gate

Read responses must remain tied to their explicit revision. Refresh detects a
changed current revision and offers reload; it never silently overlays snapshots.
Future writes require existing expected-revision checks, stale-conflict handling,
server permissions, immutable approved history and explicit discard/rebase UX.
They require a separate approved milestone; the prototype conflict toggle is no
concurrency guarantee.

Before enabling one test organization, prove default-off behavior, current-view
fallback, authorized/unauthorized roles, revoked/inactive users, cross-tenant IDs,
cache isolation, missing history, stale responses, offline/401/403/404/500 states,
read-only network requests and quantity/ownership parity. Run database regression,
authenticated navigation, keyboard/dialog/reflow checks and production preview
exclusion. Document flag-off rollback and compare historical/ledger invariants.
Staff/device and assistive-technology review remain separate acceptance gates.
No wider rollout follows automatically from technical verification.
