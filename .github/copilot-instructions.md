# NexaInventory ERP — Copilot Instructions

## Project overview
NexaInventory (Experimind Labs) is an enterprise inventory / ERP / WMS platform: a React 19 cockpit for warehouse, stock-ledger, procurement, production, QC, and traceability operations, plus a public storefront (`src/StorefrontApp.tsx`), served by a single Express + TypeORM + PostgreSQL process (`server.ts`). The stock ledger is immutable and uses pessimistic row locking; the product targets regulated-inventory workflows (21 CFR Part 11 e-signatures, hash-chained audit trails).

## Tech stack
| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 6, TypeScript 5.8 (strict), Tailwind CSS 4, lucide-react, recharts, motion |
| Backend | Express 4, TypeORM 0.3, PostgreSQL (pg), class-validator + class-transformer |
| Security | helmet (CSP), express-rate-limit, jsonwebtoken, bcryptjs, cookie-parser |
| PWA | vite-plugin-pwa |
| Tests | Vitest 4 (node environment, globals enabled) |
| Build | Vite (client) + esbuild (server bundle → `dist/server.cjs`) |
| Deploy | PM2 (`ecosystem.config.cjs`), Docker, nginx |

## Architecture map
| Path | Role |
| --- | --- |
| `server.ts` | Backend entry: connects PostgreSQL (with retry), wires security middleware, mounts `src/routes/v1/*` routers, starts the reservation reaper, serves the built frontend |
| `src/routes/v1/` | Express routers (inventory, warehouse, stock-ledger, storefront, rbac, qc, traceability, …) |
| `src/services/` | Business logic (StockLedgerService, CartReservationService, FEFO allocation, valuation, serialization, …) |
| `src/entity/` | TypeORM entities |
| `src/middleware/` | `authenticateJwt`, `requireTenant`, `requireRole`, `errorHandler` |
| `src/db.ts` | TypeORM `AppDataSource` |
| `src/migration/` | TypeORM migrations |
| `src/workers/` | Background workers (reservationReaper) |
| `src/App.tsx`, `src/StorefrontApp.tsx` | Cockpit and storefront app roots |
| `src/components/`, `src/features/` | React UI modules |
| `src/contexts/` | React contexts (AuthContext, DataContext) |
| `scripts/` | tsx scripts (run-migrations, seed_real_inventory, bootstrap_admin) |

## Commands
| Command | What it does |
| --- | --- |
| `npm run dev` | Run backend + Vite dev middleware in one process (`tsx server.ts`) |
| `npm run build` | Build client (Vite) and bundle server to `dist/server.cjs` (esbuild) |
| `npm run typecheck` | `tsc --noEmit` (`npm run lint` is identical) |
| `npm test` | Run the full Vitest suite |
| `npx vitest run <file.test.ts>` | Run a single test file |
| `npm run db:migrate` | Apply TypeORM migrations |
| `npm run db:seed:real` | Seed real inventory data |
| `npm run bootstrap:admin` | Bootstrap the admin user |

## Code standards
- Write strict TypeScript. Never introduce `any`.
- Use React function components + hooks only.
- Style with Tailwind 4 utilities and the design tokens in `src/index.css` (spacing scale, radii, shadows, transition presets, `--touch-min: 44px`, safe-area insets). Dark mode uses the `.dark` variant.
- Validate every input at the route boundary with class-validator DTOs; use TypeORM repositories/query builders — never concatenate SQL strings.
- Guard mutating routes with `authenticateJwt` (plus `requireTenant` / `requireRole` as appropriate).
- Preserve the security stack in `server.ts` (helmet CSP, rate limiting, JWT, bcryptjs). Never log or commit secrets.

## Testing
- Vitest with node environment and globals; tests live in `__tests__/` folders beside the code (`src/**/*.test.ts`).
- Integration tests require PostgreSQL plus `NODE_ENV=test`, `DATABASE_URL`, `JWT_SECRET` (CI values in `.github/workflows/ci.yml`).

## Hard boundaries
- **NEVER edit files whose names end in ` (1)`** (e.g. `App (1).tsx`, `docker-compose (1).yml`) — they are accidental duplicates. Always edit the canonical file.
- Never commit secrets or `.env` files.
- Do not touch `dist/`, `node_modules/`, `vendor/`, or production deploy configs (`ecosystem.config.cjs`, `nginx-experimind.conf`, `docker-compose.yml`) unless explicitly asked.

## Verification rule
Before declaring work done, run `npm run typecheck` and `npm test` and show the output. If PostgreSQL is unavailable, say so explicitly — never claim untested work is verified.
