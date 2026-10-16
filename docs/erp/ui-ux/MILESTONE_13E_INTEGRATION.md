# Milestone 13E — controlled draft editing

Existing authorized drafts can be explicitly edited inside Kit Studio. The legacy
builder remains the default. No approval, publishing, archive or new-kit action
is exposed by Studio. No schema, inventory ledger, calculator or business rule
changes were made.

## Authority and rollback

Studio still requires development/test NODE_ENV, KIT_STUDIO_READ_ONLY=true and
an exact KIT_STUDIO_ORGANIZATIONS allowlist entry. Editing additionally requires
KIT_STUDIO_DRAFT_EDITING=true and the existing database-authorized writer role.
Both flags default off. PUT /api/v1/product-templates/:id/studio uses the same
strict EditDto, tenant scope and transactional ProductTemplateService.change as
the legacy editor. Expected revision is mandatory; row locking rejects concurrent
stale saves with 409. Approved versions cannot be edited through this adapter.

The shared existing editor supports subject/grade/activity structure, inventory
material references and per-activity quantities, existing quantity rules, common
and universal crate configuration, packing boxes/partitions/pouches, activity
locations and shared ownership/reference fields supported by those components.
Existing draft creation remains in the legacy editor.

Save is explicit and never automatically replayed after auth/network failure.
Dirty navigation and unload require confirmation; saving blocks navigation.
Conflicts preserve local values, disable save and instruct users to copy needed
values, discard and reopen the latest draft before reapplying changes. Token
renewal preserves pending edits; account/tenant/role/sign-out clears the session.
Saved history compares content fields, including rules, ownership and mappings;
latest 50 snapshots only. QuantityPreview uses existing authoritative preview
endpoints and requires saved content and explicit set/site context.

Disable either flag to remove editing. Disable the read flag to hide Studio
entirely; the same saved drafts remain accessible through the legacy return link.
No reset, deletion or migration is required. Local review server was left off.

## Limits and review gate

Original approval actor/time and crate packing mappings unavailable from the
existing read contract remain unavailable. No new mapping model is introduced.
History comparison displays stable IDs for nested fields rather than resolving
every reference to a human label. No automatic merge or local recovery file.
Manual tablet hardware, screen-reader and staff acceptance remain pending.
Stop for review before approval/publishing integration, Packing/QC, deployment,
main merge or further workspace migration. Milestone 12 gates remain open.
