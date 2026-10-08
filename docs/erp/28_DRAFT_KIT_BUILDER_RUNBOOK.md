# Draft Kit Builder milestone — development review

Branch: `feature/kit-builder-milestone-1`; base commit `03bf7d614096026b45511e836117328fe1d1125c`.
Verified feature-branch commits/pushes are authorized by the permanent GitHub workflow. Main merge, production deployment and further milestones remain unapproved.

## Changed application and support files for this slice

- `src/entity/ProductTemplate.ts`, `src/entity/ProductTemplateVersion.ts`
- `src/migration/1791417600000-AddProductTemplates.ts`
- `src/services/ProductTemplateService.ts`, `src/routes/v1/product-templates.ts`
- `src/routes/__tests__/productTemplates.integration.test.ts`
- `src/features/kit-builder/ProductLibrary.tsx`, `src/App.tsx`
- `src/features/core/navigation.ts`, `workspacePolicy.ts`, `__tests__/navigation.test.ts`
- `src/db.ts`, `src/config/env.ts`, `server.ts`, `src/index.css`
- `scripts/setup-kit-builder-dev.ps1`, `initialize-kit-builder-dev.ts`, `create-kit-builder-databases.mjs`
- `package.json`, `.gitignore`, this runbook, four continuity files and `.agent/CHANGELOG.md`/screenshots.

Earlier containment gate and imported V5 specifications are also uncommitted on this branch. They were approved for continued development, not deployment.

## Schema and migration review

`src/migration/1791417600000-AddProductTemplates.ts` creates:

- `product_templates`: UUID stable identity, organization FK, creator FK, archive timestamp and timestamps.
- `product_template_versions`: UUID version identity, template/organization composite FK, positive version number and revision, draft status, name (1–200 characters), description (up to 5000), free-text category (up to 100), creator/editor and timestamps.

No existing tables altered; no inventory data copied. Composite FK prevents a version attaching to a template from another organization. Draft creation is one transaction. Edit/archive locks the parent identity and checks revision; a stale/concurrent write returns 409. Archive retains both rows. Draft APIs cannot edit or archive a published version. Full publication, audit diffs, restoration UI, components, activity/material links and physical packing graphs are future slices; they can refer to the version UUID. No Prastuti-specific enums or quantity engine added.

`down()` explicitly drops only these two new tables. It was NOT executed. Do not use it on retained company drafts without a reviewed backup/export and recovery plan. Production migration/rollback and deployment remain unapproved. The migration was reviewed for additive scope and exercised against isolated PostgreSQL; this is not production approval.

## HTTP contract

All paths start with `/api/v1/product-templates`. ID parameters refer to `template_id` (the stable kit identity), not the returned version row's `id`.

| Method/path | Behavior |
| --- | --- |
| GET `/` | Current tenant's active drafts, newest edit first |
| GET `/:id` | Current draft; cross-tenant/nonexistent/archived ID returns 404 |
| POST `/` | Create draft; `{name, description?, category?}`; 201 |
| PUT `/:id` | Replace draft content; `{name, description?, category?, revision}` |
| POST `/:id/archive` | Archive draft; `{revision}`; 204 |

Only bearer-header authentication accepted. A live active user record must match the token subject and explicit nonzero organization UUID. Current role comes from PostgreSQL. Body ownership/status/version fields are rejected; browser tenant preferences and query tenant IDs grant no access. Read roles: admin/super_admin, staff/manager/editor, inventory_staff/project_staff, viewer. Write roles: same except viewer. Unknown roles rejected. Missing/invalid authentication: 401; invalid tenant/current permissions: 403; bad input: 400; stale revision/non-draft mutation: 409. Persistence errors return a generic 500.

Legacy Project/Production/Sticker/QC provisioning/Traceability API aliases remain gated with 401/403/503. Their browser services were not migrated in this slice. Other ERP route groups are not certified secure for production. Request logging now omits query strings because existing realtime clients send tokens in query parameters.

## Isolated Windows development setup

Node 24 used in verification. Commands run from `D:/Experimindlabs/ERP/erp-development`:

```powershell
npm ci --ignore-scripts
npm install --prefix .local-dev/tools --no-save --ignore-scripts @embedded-postgres/windows-x64@17.4.0-beta.15
./scripts/setup-kit-builder-dev.ps1
npm run setup:kit-builder
npm run dev:kit-builder
```

Portable binaries are a development tool, not a mandatory ERP dependency. They are distributed by the [embedded-postgres project](https://github.com/leinelissen/embedded-postgres). Normal self-hosting still uses PostgreSQL and TypeORM.

The setup creates a NEW cluster under ignored `.local-dev/postgres-data`, listening only on 127.0.0.1:55432 with SCRAM authentication. It creates `experimind_kitbuilder_development` and `experimind_kitbuilder_test`; it never connects to the existing company database. Random DB/JWT secrets go to ignored local files. ERP development server binds to 127.0.0.1:3100.

The initialization command refuses any other host/port/database and refuses a nonempty database. On a new empty DB only, it bootstraps existing entity metadata and creates synthetic organizations/login users; then runs ONLY the new additive migration. It does NOT execute the legacy migration/seed chain. Do not rerun initialization to reset data. Resume an existing cluster using the PowerShell setup (which preserves it) and `npm run dev:kit-builder`.

Synthetic development accounts (local review only):

| Email | Access |
| --- | --- |
| maker@kitbuilder.test | Staff, primary development tenant |
| viewer@kitbuilder.test | Viewer, same tenant |
| other@kitbuilder.test | Staff, separate tenant |

Fresh setup generates separate random passwords in ignored `.local-dev/development-accounts.json`; no login credentials belong in Git. Existing local accounts are left unchanged by this review. No kit seed: Prastuti was created through the UI during the demonstration. Stock tables remain empty and no company inventory names/descriptions were changed.

## Verified walkthrough

1. Open http://127.0.0.1:3100/?tab=product_library and sign in as maker.
2. Under Projects & Prastuti, open Product Library; initially empty.
3. Create Kit → name `Prastuti`, optional Science category/description → Save draft. Version 1/revision 1 saved.
4. Stop only the development ERP process with Ctrl+C. Run `npm run dev:kit-builder` again. PostgreSQL cluster remains running.
5. Reload the browser; session refresh succeeds; Prastuti appears in Product Library.
6. Reopen Prastuti, change its description and save. Revision 2 observed; PostgreSQL still holds the same template/version identities.
7. Sign out and log in as other: library empty. Viewer sees the draft with no Create/Save/Archive actions. API integration tests separately reject direct cross-tenant view/edit/archive.

Screenshots are in `.agent/screenshots/`: `product-library.jpg`, `prastuti-after-restart.jpg`, `product-library-mobile.jpg`, `other-tenant-empty.jpg`, and `viewer-read-only.jpg`. Layout checked at 375px, 1440px and 3840px; input contrast checked in both light and dark themes. Existing mobile undo overlay remains outside this slice.

## Verification commands and results

```powershell
npm run typecheck
node --env-file=.env.kit-builder-development node_modules/vitest/vitest.mjs run
npm run build
git diff --check
```

Final results: typecheck PASS; 46 test files / 254 tests PASS including 10 real PostgreSQL integration tests; frontend/PWA/server build PASS; diff check PASS. Integration tests create unique synthetic schemas only in the dedicated test DB and retain them for inspection; no cleanup of company data. `npm test` without the test URL skips those 10 integration tests; `npm run test:kit-builder` runs the targeted PostgreSQL suite with the local env file.

Tests cover CRUD, input/ownership validation, anonymous/invalid auth, current role and inactive-account checks, tenant listing/view/edit/archive isolation, connection/server restart, stale/concurrent writes, transactional create rollback, non-draft rejection, composite tenant FK and soft archive without inventory/ledger writes.

Initial test-loading EPERM required approved outside-sandbox execution. Repeated test schemas exposed UUID-extension lookup; test bootstrap now uses PostgreSQL's gen_random_uuid path. No passing test claims rely on the obsolete archive crate-engine suite.

Remaining: no publish/component engine, archive restore UI, production rollback execution or production readiness claim. Existing dependency install reports 11 vulnerabilities; existing large-bundle build warning remains. No dependency auto-fixes performed.

## Final review — 2026-10-08

PASS: 33 targeted PostgreSQL/API security tests; 254 full-suite tests across 46 files; typecheck/build. No critical CRUD access-control or transaction defect found. Ownership is resolved from the verified token and current active DB user; request ownership fields are rejected. Migration remains additive with composite tenant ownership. Legacy APIs remain fail-closed. No destructive DB changes or legacy seeds. Production rollback/cutover remain unapproved; existing dependency advisories and bundle warning remain outside this slice. Checkpoint commits/pushes are now authorized; see SESSION_HANDOFF.md for verified origin status.
