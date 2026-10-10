# Session handoff

Date: 2026-10-10. Branch: feature/kit-builder-milestone-1.

Dynamic Kit Structure Editor — Subjects and Grades: COMPLETE and pushed to GitHub.

Delivered: additive migration `1791417600001-AddKitSubjectsAndGrades` (subjects jsonb on `product_template_versions`, composite unique `(id, organization_id)`, `product_template_revisions` snapshot table with CHECKs/FK/index, rollback in `down()`); `ProductTemplateRevision` snapshot entity; `normalizeSubjects()` validation (trim, 1–100 chars, case-insensitive duplicates, max 100, UUID handling, server-assigned ids); transactional `create()`/`change()` with `pessimistic_write` lock + revision check → 409; `ContentDto.subjects`; full Product Library subjects/grades editor (add/edit/reorder/remove, save status, blank-name guard).

Verification: typecheck PASS; build PASS; full suite 253 passed / 14 skipped / 0 failed (47 files); kit-builder integration 14/14; 9 `normalizeSubjects` unit tests. Browser walkthrough on embedded PostgreSQL 17.5 (port 55432): created Prastuti draft with Science + Mathematics, Grades 8/9/10 each, saved, reloaded, reopened — structure restored from PostgreSQL; revision snapshot row confirmed. Tenant isolation and 409 covered by integration tests.

Test fix applied this session: integration snapshot queries now use the version id (`kit.id`) instead of the template id.

Next milestone (not started): Activities, then BOMs, Packing and Crate Rules. Reuse embedded PostgreSQL setup in `D:\Experimindlabs\pgsql\pgtmp` (v17.5 works; v18.4 broken on this machine). Dev accounts in `.local-dev/development-accounts.json` (gitignored).

Preserve inventory names, fail-closed legacy APIs, tenant authorization. No merge to main, no force-push, no destructive DB scripts.
