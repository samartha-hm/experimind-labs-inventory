# Milestone 1 baseline — 2026-10-08

Status: baseline verified; operational security and Kit Builder implementation NOT complete.
Source: V5 handover repository/experimind-labs-inventory-main. Extracted archive, no .git metadata. A second older source copy exists under the workspace. Canonical checkout URL/path requested from user; no branch or commit created. Git, Docker and psql unavailable on PATH.

Environment: Node v24.11.0; npm 11.6.1; Windows PowerShell.
Commands and observed results:
- npm ci --ignore-scripts: sandbox attempt failed EPERM creating dependency directories.
- npm ci --ignore-scripts --fetch-retries=0 --fetch-timeout=20000: approved external retry succeeded; 895 packages installed; npm reported 11 vulnerabilities (1 low, 1 moderate, 8 high, 1 critical). No automatic dependency fixes.
- npm run typecheck: PASS, exit 0 after installation.
- npm test: sandbox attempt failed loading all 44 suites due EPERM realpath. Approved external retry PASS, 44 files / 228 tests, exit 0.
- npm run build: sandbox attempt failed EPERM realpath. Approved external retry PASS, frontend/PWA and dist/server.cjs built, exit 0. Large bundle warning remains.
- npm run test:erp-core: PASS, 13 tests, exit 0. Passing tests assert obsolete per-school universal-crate behavior, so are NOT evidence of doc 25 compliance. Prior handover claim of 17 corrected tests does not match this source.

Working functionality verified: existing application compiles into frontend/PWA and server bundles; existing automated tests execute. No browser, live server or PostgreSQL workflow verified. No new draft-kit UI/API implemented.

Security findings: projects/production/stickers and additional operational routes lack global authentication/tenant guards. Existing requireTenant substitutes a zero UUID, and legacy services share global state; middleware alone cannot establish tenant isolation. Unsafe parser defaults qty=1/unitCost=50 remain unapproved references.

Data impact: no database connection, migration, seed, cleanup, inventory edit or stock mutation. No schema or Git-history change. Generated node_modules/dist are ignored by existing .gitignore; no manifest edits.

Planned next implementation: on feature/kit-builder-milestone-1 in canonical checkout, fail closed for legacy operational APIs until tenant isolation and role authorization are tested; then additive generic catalog/draft-version tables in a separately identified development PostgreSQL database, with Product Library/New Draft UI. Do not apply the legacy migration chain to company data; it contains seed/reconciliation steps requiring separate review. Explain exact schema before implementation.
