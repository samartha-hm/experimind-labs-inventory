# Milestone 13D — live read-only Kit Studio

Bounded development integration of the approved Precision Operations foundation.
Existing Product Library remains the default. No Packing/QC integration, new
calculator, schema, inventory, ledger, role or approved-revision writes.

## Activation and rollback

Use the existing isolated development environment and application login. Set
server environment variables before starting the development server:

```powershell
$env:KIT_STUDIO_READ_ONLY='true'
$env:KIT_STUDIO_ORGANIZATIONS='<existing development organization UUID>'
npm run dev:kit-builder
```

The allowlist accepts comma-separated exact organization IDs. Both settings are
required; NODE_ENV must be development or test. Production rejects the live API
even if both flags are set. Never activate against production credentials/data.
For local watcher stalls, DISABLE_HMR=true uses the existing development option;
restart after source edits because file watching is then disabled.

Open `/?tab=product_library`, then **Open read-only Kit Studio**. Catalog route:
`/?tab=product_library&studio=`; detail adds the persisted template UUID after
`studio=`. Existing authenticated shell and current database user/role checks
apply; a query parameter cannot enable access. Each response is no-store.

Deactivate by removing the variables or setting KIT_STUDIO_READ_ONLY=false, then
restart the server and reload the browser. Studio reads return 404; the existing
builder remains available at `/?tab=product_library`. The Studio always offers a
return link, including failures. No migration or data rollback is required.
An already rendered snapshot cannot be remotely erased by a flag change; reload
or refresh obtains the disabled response. Account/token changes discard viewer
state. Revert the implementation commit if source rollback is required.

## Existing contract and explicit gaps

| Surface | Source and fidelity |
| --- | --- |
| Catalog | ProductTemplateService.list, authenticated organization drafts |
| Detail | view + history + approved; same organization; second view detects concurrent draft ID/revision changes (409) |
| Education | Persisted subjects, grades, activities, material requirements and ownership |
| Physical structure | Persisted recursive boxes, partitions, pouches, activity/item mappings; separate from education |
| Shared materials | Persisted crate definitions, common/universal/custom rules and components; no recalculation |
| Revisions | Current draft, latest 50 historical drafts, immutable approved content; no draft substitution |
| Quantities | Persisted finite quantity including zero; missing item/unit/quantity or incomplete material is unavailable |

New GET adapters: `/api/v1/product-templates/studio-access`, `/studio`, and
`/:id/studio`. They reuse existing authentication, tenant authority and reader
roles. No new permission or service mutation paths. The client read helper only
issues GET; existing shell authentication may refresh its session separately.

Calculated quantity traces require confirmed site/set and complete-set context
that template reads do not provide. The view says unavailable and shows saved
rule definitions; it does not invoke the existing POST calculation/preview API.
Original approval actor/time is absent from this read contract and explicitly
unavailable. Crate material packing locations and absent mapping labels remain
unavailable; IDs are retained. Empty arrays mean no configured records; missing
structures mean unavailable. No runtime synthetic fallback exists.

The approved-version read currently fetches organization snapshots before
filtering to one template. History is capped at 50 and is labeled accordingly.
The consistency check detects concurrent draft changes, not a transactional
snapshot across every independent read. New approvals during loading require a
refresh. These limits should guide the next bounded read-only slice.

## UI and next review

Loading skeletons, bounded request timeout, empty/missing material states,
401/403/404/409/server/offline errors, focus-return stale notice and refresh are
provided. Native selects/details and visible focus support keyboard navigation.
No save, approval, simulated editing or operational write controls are present
inside Studio. Existing shell and old builder retain their authorized behavior.

Recommend a read-only site/set context selector using the existing authoritative
calculation contract, plus narrowly scoped approved-version metadata/pagination
after separate approval. Staff/tablet and screen-reader review remain required.
Stop for review before any write-enabled integration or deployment.
