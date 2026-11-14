# Shared organization label layouts

`GET /api/v1/packing-label-layouts` returns the latest organization revision or revision 0/default layout. `GET /history` returns immutable organization revisions. Authenticated members may read; only active administrators/managers may save. Token role claims do not override current database roles.

`POST /api/v1/packing-label-layouts` requires `Idempotency-Key` and `{expectedRevision, template:{width,height,fontSize,materials}}`. Width 90–210 mm, height 80–297 mm, font 7–12 pt. PostgreSQL serializes organization writes; stale expected revisions return 409. Reload before reconciling a colleague's edits. Replaying identical input returns the original revision; changed input with the same key returns 409. Every revision records actor/time and cannot be overwritten/deleted. Populated rollback is refused.

The packing label panel loads shared settings after authentication. Save organization layout persists explicitly; preview and reprint only read packing snapshots. Unsaved preview changes do not affect colleagues. A second staff session/computer loads the same saved revision from PostgreSQL. Existing browser-local layouts are not automatically promoted to shared settings; managers can enter their approved values and save.

Physical package UUIDs, QR destinations, parent identities, template versions and packing/QC traceability are unchanged. Layout saves, reads, previews and reprints create no packages or inventory movements. Browser/PDF printer controls determine physical print scale; organization persistence covers PDF page dimensions, font and contents settings.

Synthetic HTTP/PostgreSQL tests verify current-role denial, tenant isolation, concurrent replay, optimistic conflicts, immutable history, restart persistence, guarded rollback and unchanged stock ledger. Existing PDF tests validate package/QR identity and reprinting. Actual browser preview/printing remains pending under docs/erp/34_PILOT_BROWSER_ACCEPTANCE.md.
