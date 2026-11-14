# Milestone 13F integration — 2026-10-16

Precision Kit Studio now supports saved-draft completeness review, explicit-context
quantity preview, confirmation and immutable approval, provenance/history,
approved comparison, and continuing the existing draft. The legacy builder remains
the default. No schema migration, new dependency or quantity engine was introduced.

## Authoritative contracts

| Action | Contract and authority |
| --- | --- |
| Read lifecycle | GET /api/v1/product-templates/:id/studio; bearer authentication, current database role/tenant, organization allowlist; consistent saved revision; approval metadata scoped to that draft |
| Review | Advisory counts and navigable completeness/packing guidance; server approval remains authoritative |
| Quantity preview | Existing POST preview with saved revision and explicit sets/site context; existing calculator |
| Approve | POST /api/v1/product-templates/:id/studio/approve with revision only; existing writer roles, strict DTO, transactional service and parent lock |
| Snapshot/history | Existing immutable approved versions plus actor ID, timestamp and source draft revision |
| Compare/continue | Existing structured content comparison and current draft editor/save contracts |

Approval copies the saved revision and leaves its draft editable. The existing
service validates inventory references, unit and positive quantity. Duplicate
approval of the same revision returns the existing snapshot; stale revisions fail
409. No stock reservation, purchasing, production or dispatch action occurs.
The client never optimistically approves or retries an uncertain response; it
requires refresh before another attempt. The native dialog names consequences,
starts focus on cancel, and blocks cancellation/navigation while submitting.

Rejection, return-for-correction, pending review and cloning a separate draft from
an approved version have no supported API contract and are explicitly unavailable.
Corrections continue the existing draft. Packing warnings are advisory, including
child mapping caveats. Provenance displays actor IDs without inventing user names.

## Flags and rollback

Development/test only: KIT_STUDIO_READ_ONLY=true and exact organization UUID in
KIT_STUDIO_ORGANIZATIONS. Writes also require KIT_STUDIO_DRAFT_EDITING=true.
Both flags default off. Authentication and current database role/tenant checks
apply regardless of client state. Disable either write flag to remove approval;
disable read flag to remove Studio entry and reject direct access. Saved drafts
and approved snapshots remain usable through existing contracts. Local port 3100
review server was left with both flags false and DISABLE_HMR=true.

No main merge, deployment, pilot activation, Packing/QC migration or company data
operation was performed. See MILESTONE_13F_ACCEPTANCE.md for verified scope.
