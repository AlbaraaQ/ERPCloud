# ARCHITECTURE_DECISION_RECORDS (ADR Index)

> Level A — FROZEN. New decisions append; existing ones change only by superseding ADR.
> Format: Decision / Context / Alternatives / Reason / Consequences.

## ADR-000 Conventions snapshot
D: All canonical conventions live in `PROJECT_CONTRACT.md`.
C: 20+ executor conversations need one constitution. R: single SSOT, no drift.
Cons: changes here are intentionally heavy.

## ADR-001 Modular Monolith over Microservices
Ctx: tightly-coupled ERP transactions; small team; phase-per-conversation delivery.
Alt: microservices, serverless functions.
Why: ACID across sale→stock→journal; one deploy; module seams allow later extraction
(reporting/e-invoice first candidates). Cons: BullMQ worker shares codebase.

## ADR-002 NestJS (vs Fastify-express vanilla / Adonis)
Ctx: need enforcement points (guards/pipes/interceptors) + DI + OpenAPI generation +
test tooling. Why: matches 20+ module governance; ecosystem maturity. Cons: some
decoration ceremony; mitigated by generators used from P02.

## ADR-003 PostgreSQL + Drizzle (vs Prisma/TypeORM/MySQL)
Why: RLS, numeric, ltree, partial indexes; Drizzle = SQL-faithful types, explicit
migration SQL (accounting can't afford ORM magic). Cons: more manual relations code —
accepted.

## ADR-004 Shared-DB Multi-Tenancy with tenant_id + RLS
Why: ops simplicity at N tenants; isolation double-enforced (app + DB). Alt rejected:
db-per-tenant (this legacy's "DB per year" pain), schema-per-tenant fan-out.
Cons: strict review duty; mitigated by isolation harness in CI (per phase).

## ADR-005 UUID v7 PKs + separate human number sequences
Why: sortable, distributed-friendly (desktop offline push later), no enumeration leak
of business volume; human docs keep per-branch sequence like legacy. Cons: two id
concepts — mitigated by contract docs.

## ADR-006 Money = numeric(20,4) + decimal.js; forbid floats
Ctx: legacy float money caused rounding debt.
Cons: serialization verbosity; accepted.

## ADR-007 No cached running balances on master rows (initially)
Why: computed from immutable ledgers; legacy caches (`Total_Debts`, `ProductStocks`)
diverged in practice (RC-11/RC-20). Materialized views allowed later with proof =
placeholder. Cons: report compute cost — budgets defined in TESTING §5.

## ADR-008 Immutable posted journals & ledger; reversal-only correction
Why: audit integrity, ZATCA-era compliance; replaces legacy edit-in-place + His_Entry.
Cons: UX needs explicit void flows — covered in UI masters.

## ADR-009 Unified `parties` table with kind flags (vs Customers/Suppliers separate)
Ctx: legacy duplicated parties across 5 tables w/ shared ZATCA fields. Why: one party
360°, per-kind APIs via filters. Kept separate legacy concept: `salesmen` stays its
own table (commission domain) — enters P10 review. Cons: kind discipline via CHECKs.

## ADR-010 Unified `cash_locations` (safes+banks) and unified `vouchers` (Sand*+Receipts)
Why: legacy sprawl (5 voucher tables); same invariants everywhere. Cons: migration
complexity owned by registry maps (RC-19).

## ADR-011 Files in object storage; DB holds metadata
Why: legacy `image` columns & file paths unscalable. Cons: orphan GC job (P04).

## ADR-012 ZATCA designed-in (columns + submission ledger from P10, engine P13)
Why: compliance is not bolt-on. Cons: schema carries nullable einvoice fields early.

## ADR-013 Two frontends: admin + customer (+future POS skin inside admin pack)
Why: different release cadence & personas. Shared contracts package.
Cons: duplicated shell code — minimized via `packages/ui` if P17 shows reuse.

## ADR-014 Migration engine in-repo (`apps/migrator`) reusing domain services
Why: same invariants as runtime; no drift between import & app logic. Alt: external
ETL — rejected (duplicate rules). Cons: migrator needs heavy deps — scoped package.

## ADR-015 Tenant data docs in English; business terms bilingual
Ctx: RTL docs hurt diffs/tooling. Why: maintainability. Arabic UI copy lives in
frontend locale files (P17).

## ADR-016 One UI-master file per surface (admin/customer) instead of per-module files
Ctx: §17/§19 asked per-module + master. Consolidated to masters with per-module
SECTIONS to prevent divergence (explicit simplification, documented here).
Cons: larger single file — managed via section anchors.

## ADR-017 Installments & Contracting deferred to P21 (after core sales/treasury)
Why: they build on invoices, vouchers, parties; early risk low value. Same logic for
P19/P20/P22 packs. Cons: later phases must not retrofit core schemas — vertical
tables pre-declared in DATABASE_DESIGN §15.

## ADR-018 App-layer AES-GCM encryption for stored secrets (not pgcrypto)
Why: portable, testable, key rotation via env versioning. Cons: app responsibility —
redaction + tests in security suite.

## ADR-019 No tenant billing/metering in v1
Cons: launch requires external billing ops; revisit post-launch via ADR.

## ADR-020 Phases = 23, ordering frozen (see MASTER_PROJECT_PLAN §6)
Why: dependency-justified; each prompt self-contained. Cons: long program — offset by
per-phase verifiability.

## ADR-021 Go-live security audit waivers for build/test-only advisories
D: Phase 23 permits release with the documented `pnpm audit --audit-level high` findings waived only when the vulnerable package is not reachable from the production API/admin/customer runtime path, or when production configuration disables the vulnerable surface.
C: The September 2026 advisory feed reports high/critical findings in `vitest`, `vite`, `postcss`, and transitive build tooling. `drizzle-orm` was upgraded to the currently available patched line (`0.45.2`) during P23. Remaining high/critical findings are isolated to test runner/dev server/build CSS parsing surfaces; production containers run compiled apps and do not expose Vitest UI, Vite dev server, source-map ingestion endpoints, or user-controlled PostCSS compilation.
Alt: Block release until all upstream toolchain packages publish fixed compatible versions, or force major test/build tool upgrades that break the current TS/Vitest config.
Why: The production runtime exposure is zero under the release runbook; the risk is managed by CI-only execution, no public dev servers, source maps disabled for public builds unless explicitly approved, and recurring dependency-audit review before each release.
Cons: Security owners must revisit this waiver before v1.0.1 and remove it once compatible patched build tooling is available.

## ADR-030 Design System v3 lives in `packages/ui`; one token set, one theme mechanism
D: All three front-end surfaces (`apps/staff`, `apps/platform-admin`, `apps/marketing`)
share one package — `@erp/ui` — that owns (a) the CSS token set (`@erp/ui/tokens.css`,
imported by each app's `globals.css`) and (b) the React component kit. Dark mode is one
mechanism: a single `localStorage` key `erp.theme` (`light|dark|system`), one blocking
micro-script in `<head>` that toggles `html.dark` before hydration, and one semantic
variable contract (`--bg --surface --surface-2 --text --muted --line --line-strong
--brand --brand-soft`, plus `--ok/--warn/--danger/--info` and the `--inverse` plate)
that every utility resolves through.
C: v2 already had a token contract per app, but it was *copied* into three
`globals.css` files, its dark mode was partial (staff only, no switch, no FOUC guard),
and the React kits in `apps/staff/components/ui` and
`apps/platform-admin/components/ui` were two near-identical forks that carried raw
Tailwind palette classes (`bg-white`, `text-slate-900`, …) which cannot flip.
Alt: (a) per-app design systems — rejected: three forks is how a product looks like
three products; (b) remap Tailwind's `slate-*` scale to variables so existing JSX keeps
working — rejected: it leaves ~800 raw palette classes in the source and hides the
contract instead of naming it; (c) ship the kit as a compiled `dist/` — rejected: it adds
a build-order dependency between three apps and one package for no gain, since the apps
already compile TypeScript from workspace sources.
Why: a reviewer can now answer "is this colour a token?" with a `grep`; a visitor gets
one theme answer across all three surfaces; and a component fixed once is fixed in all
three. The build-order risk of (c) is removed by `transpilePackages: ['@erp/ui']`.
Cons: `packages/ui` must not import from `apps/*` (enforced by the repo's
`boundaries/element-types` rule); its JS is marked `sideEffects: ['*.css']` so a barrel
import cannot drag `recharts` into a surface that only wanted the toggle; and the root
`eslint.config.mjs` gained two globs (`packages/ui/**`, `src/**`) plus a
`boundaries/elements` entry for `packages/ui/**/*.tsx` — additive only, no existing rule
changed.

## ADR-031 The shared kit is consumed as TypeScript source (`transpilePackages`)
D: `@erp/ui` is published to the workspace with `exports: { ".": "./src/index.ts", … }`
and each app lists it in `transpilePackages`. No `dist/`, no build step, no lockfile
coupling between the kit and its three consumers.
C: ADR-030 chose one kit for three apps. The repo's existing convention
(`docs/change-log/CHANGE-REQUESTS.md` → "Decisions recorded without a change request")
is that workspace packages emit `dist/` and are consumed compiled — because NestJS needs
`design:paramtypes`. The three Next.js apps have no such constraint.
Alt: compiled `dist/` (would make `pnpm --filter @erp/staff build` depend on
`packages/ui` having been built first — a silent order requirement); a git submodule or
copy-paste (rejected: forks again).
Why: `next build` and `next dev` both compile the package with the app's own
toolchain, so a change in the kit is visible immediately and no artifact can go stale.
Cons: the kit's TypeScript must satisfy every app's `tsc`; it is therefore type-checked
in CI through the three app builds plus `@erp/ui`'s own `typecheck` script. Because it
is a browser-only package (DOM lib, JSX, bundler resolution) it is **excluded** from
the root `tsconfig.base.json` NodeNext server sweep, exactly as the apps' `.tsx` code
already is — the sweep would otherwise report `window`/`document` as unknown and demand
`.js` extensions a bundler must not carry. The exclusion is recorded as CR-007 and
verified: the sweep's error count returns to its base-commit value.
